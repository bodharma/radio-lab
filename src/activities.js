import { circuit, wavelength, reflectedFraction, powerAfterLoss, modulatedSignal, signalPath, antennaElementLength, batteryPack, lampCircuit, effectiveRadiatedPower, polarisationCoupling, signalsOverlap, waveExtent } from './physics.js';
import { scenarios, waveExamples } from './scenarios.js';

export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const fmt = value => new Intl.NumberFormat('en-GB', { maximumFractionDigits: 4 }).format(value);
const range = (key, label, initial, min, max, step, unit = '') => ({ key, label, initial, min, max, step, unit, type: 'range' });
const select = (key, label, initial, options) => ({ key, label, initial, options, type: 'select' });

const benches = {
  radio: {
    title: 'Send a signal', prompt: 'Predict what happens to the received signal when you increase the distance. Then try it.',
    controls: [range('distance', 'Distance between stations', 2, 1, 5, 1, 'steps'), select('transmitter', 'Transmitter', 'on', [['on', 'On'], ['off', 'Off']])],
    model: 'Illustrative radio link. Signal bars are not a coverage prediction.',
  },
  wave: {
    title: 'Why antenna size changes with frequency', prompt: 'Compare familiar radio examples and the space their ideal antenna elements need.',
    controls: [range('frequency', 'Frequency', 3, 3, 3000, 1, 'MHz')], presets: waveExamples,
    model: 'Wavelength ≈ 300/frequency in MHz; the extra comparison uses an ideal quarter-wave element. Real antenna designs, loading and ground planes affect physical dimensions. Plot windows change between 200 m, 10 m and 0.5 m and are labelled explicitly. Data speed also depends on bandwidth, modulation and signal quality.',
    source: 'https://www.ti.com/lit/an/swra161b/swra161b.pdf',
  },
  circuit: {
    title: 'See what resistance changes', prompt: 'Keep the battery at 12 V. Predict the current if resistance rises from 6 Ω to 12 Ω, then try it.',
    controls: [range('voltage', 'Battery voltage', 12, 1, 24, 1, 'V'), range('resistance', 'Resistance', 6, 1, 24, 1, 'Ω')],
    model: 'Ideal DC circuit: negligible battery and wire resistance. I = V/R; P = V × I.',
  },
  units: {
    title: 'Same quantity, different unit', prompt: 'Change the display unit. Does the physical quantity change, or only its written number?',
    controls: [range('amount', 'Current in amperes', 1, 1, 10, 1, 'A'), select('prefix', 'Display unit', 'A', [['mA', 'Milliamperes (mA)'], ['A', 'Amperes (A)'], ['kA', 'Kiloamperes (kA)']])],
    model: 'Unit conversion for the same current: 1 A = 1,000 mA = 0.001 kA.',
  },
  modulation: {
    title: 'Change what carries the information', prompt: 'Compare AM and FM at the same signal strength. Look at wave height and wave spacing.',
    controls: [select('mode', 'Modulation', 'am', [['am', 'AM — amplitude modulation'], ['fm', 'FM — frequency modulation']]), range('depth', 'Message strength', 0.4, 0, 0.9, 0.1)],
    model: 'Normalised illustrative waveforms. FM deviates above and below the carrier; it does not simply shift upwards.',
  },
  signal: {
    title: 'Create a carrier, add the message, supply RF power', prompt: 'Compare a missing carrier source with a missing message input.',
    controls: [select('missing', 'Fault to inspect', 'none', [['none', 'All functions working'], ['oscillator', 'Oscillator off — no carrier'], ['modulator', 'Message input missing — carrier remains'], ['amplifier', 'RF output stage off']])],
    model: 'Simplified functional transmitter. A missing message input leaves the ideal carrier path intact; physically removing a complete RF stage is a different fault. Disabling the RF output stage blocks useful output in this binary model; real faults may leave leakage signals. Waveforms are normalised illustrations, not measured amplitudes or actual MHz timing.',
  },
  antenna: {
    title: 'Change the antenna, see the pattern', prompt: 'Compare the illustrated patterns, then change frequency and inspect the half-wave length.',
    controls: [select('type', 'Antenna pattern', 'dipole', [['dipole', 'Horizontal dipole'], ['vertical', 'Vertical antenna'], ['yagi', 'Yagi beam']]), range('frequency', 'Frequency', 15, 3, 30, 1, 'MHz'), range('direction', 'Direction', 0, 0, 180, 15, '°')],
    model: 'Illustrative horizontal patterns; no predicted gain. Half-wave length is an ideal starting estimate, not a construction specification.',
  },
  matching: {
    title: 'Follow forward and reflected power', prompt: 'Increase SWR and watch how much power returns along an ideal feeder.',
    controls: [range('swr', 'Standing wave ratio', 1, 1, 5, 0.5, ':1')],
    model: 'Lossless line: reflected fraction = ((SWR − 1)/(SWR + 1))². This is not a prediction from antenna length.',
  },
  feeder: {
    title: 'Follow power through the feeder', prompt: 'Increase feeder loss. Compare power leaving the transmitter with power reaching the antenna.',
    controls: [range('loss', 'Feeder loss', 0, 0, 10, 1, 'dB')],
    model: 'Fixed 10 W into the feeder. Output power = input × 10^(−loss/10). The selected loss is an example, not a cable specification.',
  },
  propagation: {
    title: 'Compare two paths through the environment', prompt: 'Compare an ionospheric HF path with a VHF/UHF line-of-sight path. Add an obstruction.',
    controls: [select('band', 'Path to inspect', 'hf', [['hf', 'HF — possible ionospheric return'], ['vhf', 'VHF/UHF — direct path']]), select('obstacle', 'Terrain', 'clear', [['clear', 'Clear direct path'], ['blocked', 'Hill across the direct path']])],
    model: 'Qualitative paths only. Ionospheric return depends on frequency and conditions; the skywave is not guaranteed.',
  },
  rules: {
    title: 'Follow the route to a licence', prompt: 'Move through the steps. Notice who examines you and who issues the operating licence.',
    controls: [range('stage', 'Stage in the process', 0, 0, 3, 1)],
    model: 'Study → RSGB examination → pass certificate → Ofcom licence. A pass certificate alone is not an operating licence.',
  },
  interference: {
    title: 'Investigate an unwanted signal', prompt: 'Change one thing at a time: transmitter level or suppression on the affected cable.',
    controls: [range('power', 'Relative transmitter level', 3, 1, 5, 1), select('filter', 'Cable suppression', 'off', [['off', 'Without suppression'], ['on', 'With suppression']])],
    model: 'Illustrative interference mechanism, not a diagnosis. Real interference has several possible causes and remedies.',
  },
  safety: {
    title: 'Spot the hazard and change the scene', prompt: 'Inspect the highlighted hazard. Apply the safer arrangement and compare what changed.',
    controls: [select('safe', 'Arrangement', 'hazard', [['hazard', 'Show the hazard'], ['safe', 'Show the safer arrangement']])],
    model: 'An educational illustration. It does not certify that real equipment or a site is safe.',
  },
  operating: {
    title: 'Rehearse a contact', prompt: 'Advance one step at a time. Notice that listening comes before calling.',
    controls: [range('step', 'Stage of the contact', 0, 0, 4, 1)],
    model: 'A simplified contact sequence. Read this topic’s sections for the full procedures and exceptions.',
  },
  battery: {
    title: 'Build the supply from visible cells',
    controls: [range('cells', 'Number of cells in series', 2, 1, 4, 1), select('connected', 'Example load', 'on', [['on', 'Connected'], ['off', 'Disconnected']])],
    presets: [{ label: 'One 1.5 V cell', values: { cells: 1 } }, { label: 'Two cells in series', values: { cells: 2 } }, { label: 'Four cells in series', values: { cells: 4 } }],
    model: 'Identical ideal 1.5 V cells in series, with a 6 Ω resistive load. Cell voltage remains when the load is disconnected. Actual cells have internal resistance and changing voltage. Use the specified batteries in real devices; this is not a pack-building guide.',
  },
  connection: {
    title: 'Complete the path to the lamp',
    controls: [select('connected', 'Connection', 'on', [['on', 'Path connected'], ['off', 'Open gap']])],
    model: 'Ideal 3 V supply and 6 Ω resistive load. The drawn lamp indicates a complete path; its brightness is qualitative.',
  },
  power: {
    title: 'See what the watt rating means',
    controls: [range('voltage', 'Supply voltage', 5, 1, 20, 1, 'V'), range('current', 'Current drawn by the load', 2, 0.5, 5, 0.5, 'A')],
    presets: [{ label: '5 V × 2 A', values: { voltage: 5, current: 2 } }, { label: '5 V × 3 A', values: { voltage: 5, current: 3 } }, { label: '9 V × 2 A', values: { voltage: 9, current: 2 } }],
    model: 'P = V × I. A watt is a joule per second. Values represent a compatible supply and load drawing the stated current; a charger rating does not force that current through every device.',
  },
  series: {
    title: 'What happens when one lamp opens?',
    controls: [select('layout', 'Wiring layout', 'series', [['series', 'Series — one shared path'], ['parallel', 'Parallel — separate branches']]), select('fault', 'First lamp', 'working', [['working', 'Working'], ['open', 'Open circuit']])],
    model: 'Ideal 6 V source and two 6 Ω resistive lamps. Temperature effects are omitted; an open lamp is not a short circuit.',
  },
  powerType: {
    title: 'Compare battery DC with alternating direction',
    controls: [select('supply', 'Supply type', 'dc', [['dc', 'Battery DC'], ['ac', 'AC example']])],
    model: 'Normalised voltage-versus-time traces. AC repeatedly changes sign; steady DC does not. This is not a mains wiring demonstration.',
  },
  symbols: {
    title: 'Connect the object to its circuit symbol',
    controls: [select('component', 'Component to inspect', 'battery', [['battery', 'Battery'], ['resistor', 'Resistor'], ['capacitor', 'Capacitor'], ['switch', 'Switch']])],
    model: 'Common simplified component drawings and circuit symbols. The source note includes the other symbols required by the course.',
  },
  digital: {
    title: 'Watch a computer sample a changing signal',
    controls: [range('samples', 'Samples across this view', 8, 4, 32, 1)],
    model: 'Equally spaced samples of one normalised sine cycle, displayed as a sample-and-hold representation. Quantisation, real sampling rates and data protocols are not simulated.',
  },
  tuner: {
    title: 'Tune a radio and select the programme',
    controls: [range('tuning', 'Receiver tuning', 100, 98, 106, 0.1, 'MHz')],
    presets: [{ label: 'Tune example news · 100 MHz', values: { tuning: 100 } }, { label: 'Tune example music · 104 MHz', values: { tuning: 104 } }],
    model: 'Two fictional FM programme transmitters. The simplified receiver selects a programme within 0.1 MHz of its example centre. This is not a real receiver selectivity or signal-quality model. Text displays replace sound.',
  },
  keying: {
    title: 'Carry letters with visible on/off changes',
    controls: [select('message', 'Visible code', 'sos', [['sos', 'SOS ··· −−− ···'], ['hi', 'HI ···· ··']]), select('key', 'Carrier key', 'up', [['up', 'Key up — carrier off'], ['down', 'Key down — carrier on']])],
    model: 'A static Morse illustration. The relative dot/dash lengths represent time; the key control shows carrier presence without audio or automatic flashing.',
  },
  sidebands: {
    title: 'Inspect what AM, USB and LSB occupy',
    controls: [select('sideband', 'Transmission mode', 'am', [['am', 'AM'], ['usb', 'Upper sideband'], ['lsb', 'Lower sideband']])],
    model: 'Illustrative single-tone spectrum: AM has a carrier and two sidebands; the SSB examples suppress the carrier and the other sideband. Actual speech occupies bands rather than a single spectral line.',
  },
  feedpoint: {
    title: 'Inspect where the feeder meets the wire',
    controls: [select('feed', 'Feed position', 'centre', [['centre', 'Centre-fed arrangement'], ['end', 'End-fed arrangement']])],
    model: 'Conceptual feed position, not an impedance calculation or an installation plan. End-fed arrangements need suitable matching and a return path.',
  },
  balun: {
    title: 'Join a balanced antenna to unbalanced coax',
    controls: [select('inspect', 'Part to inspect', 'balanced', [['balanced', 'Balanced dipole arms'], ['unbalanced', 'Unbalanced coaxial feeder']])],
    model: 'A conceptual balanced-to-unbalanced transition. The balun type and design determine its action; this picture calculates neither matching nor common-mode suppression.',
  },
  gain: {
    title: 'Concentrate radiation in a direction',
    controls: [range('gain', 'Gain relative to a dipole', 0, 0, 10, 1, 'dBd')],
    model: 'Fixed 10 W transmitter. ERP = 10 W × 10^(gain in dBd/10). The changing beam shape is illustrative; gain redirects energy and does not create it.',
  },
  polarisation: {
    title: 'Rotate one handheld antenna',
    controls: [range('angle', 'Angle between antennas', 0, 0, 90, 15, '°')],
    model: 'Ideal direct-path coupling for linear polarisations follows cos²(angle). Real reflections, orientation and antenna patterns can change this result; it is not a coverage prediction.',
  },
  callsign: {
    title: 'Take an example call sign to a new location',
    controls: [select('region', 'UK region', 'england', [['england', 'England'], ['wales', 'Wales'], ['scotland', 'Scotland'], ['ni', 'Northern Ireland']]), select('place', 'Operating situation', 'home', [['home', 'Home'], ['field', 'Portable in a field'], ['mobile', 'Mobile']])],
    model: 'Example Foundation call sign M7LAB. Regional locators and these suffixes are optional conventions for this example; when used they must not obscure identification. Other call-sign formats have different rules.',
    source: 'https://www.ofcom.org.uk/spectrum/radio-equipment/amateur-radio-info',
  },
  policy: {
    title: 'Check what the station is being used for', controls: [select('purpose', 'Purpose of the contact', 'hobby', [['hobby', 'Personal experimentation'], ['business', 'Paid delivery coordination']])],
    model: 'An amateur-licence purpose check, not a complete operating authorisation. Other licence conditions continue to apply.',
  },
  supervision: {
    title: 'Keep the supervising licensee present', controls: [select('supervisor', 'Licensee’s position', 'present', [['present', 'Physically present at the station'], ['away', 'Away from the station']])],
    model: 'Ofcom guidance describes direct physical supervision so the licensee can regain control. The licensee remains responsible for compliance; the diagram does not check all conditions.',
    source: 'https://www.ofcom.org.uk/spectrum/radio-equipment/amateur-radio-info',
  },
  userService: {
    title: 'Identify the context of the exercise', controls: [select('event', 'Activity', 'club', [['club', 'Ordinary club practice'], ['responder', 'Responder-led operation or exercise']])],
    model: 'The licence contains a specific User Service provision for an operation or exercise conducted by a Responder. Actual use requires the applicable conditions and arrangements.',
    source: 'https://www.ofcom.org.uk/spectrum/radio-equipment/amateur-radio-info',
  },
  bandplan: {
    title: 'Leave room for another signal', controls: [range('centre', 'Your example signal centre', 35, 15, 85, 5), range('width', 'Your example signal width', 10, 5, 30, 5)],
    model: 'A normalised illustration, not an allocated band or permission checker. A second signal occupies 70–80 on this arbitrary scale. Use the actual EX307 tables and band plans for frequencies and restrictions.',
  },
  referenceCheck: {
    title: 'Read across the actual licence schedule',
    controls: [select('parameter', 'Schedule item to inspect', 'frequency', [['frequency', 'Frequency range'], ['status', 'Allocation status'], ['power', 'Power limit and its definition'], ['notes', 'Footnotes and restrictions']])],
    model: 'A visual reading checklist for EX307. These are column headings and checks, not a copied allocation table or operating permission. Read the values and all applicable notes in the actual current booklet.',
    source: 'https://rsgb.org/main/clubs-training/for-students/exam-forms/',
  },
  exposure: {
    title: 'See who can approach the antenna', controls: [select('position', 'Person’s position', 'near', [['near', 'Near the antenna'], ['far', 'Farther from the antenna']])],
    model: 'Position and access illustration only. No compliant distance is calculated; a real assessment needs the actual antenna, power, duty cycle and other relevant conditions.',
  },
  phonetic: {
    title: 'Make letters unambiguous', controls: [{ key: 'word', label: 'Word or call sign', initial: 'M7LAB', type: 'text', maxLength: 8 }],
    model: 'Standard NATO spelling words for letters and ordinary written names for digits. No audio is generated.',
    source: 'https://www.nato.int/en/news-and-events/articles/news/2017/12/21/nato-phonetic-alphabet-codes-and-signals',
  },
  report: {
    title: 'Separate readability from strength', controls: [range('readability', 'Readability', 5, 1, 5, 1), range('strength', 'Strength', 7, 1, 9, 1)],
    model: 'A user-chosen RS report, not a measured receiver reading. Readability runs from 1 to 5; strength from 1 to 9. Morse reports can include a separate tone component.',
  },
  repeater: {
    title: 'Let a hilltop repeater join the path', controls: [select('relay', 'Repeater path', 'off', [['off', 'Direct path only'], ['on', 'Repeater path enabled']])],
    model: 'Qualitative line-of-sight illustration. A real repeater requires the correct frequencies, access settings and a usable path in each direction.',
  },
  satellite: {
    title: 'Follow a spacecraft past your horizon', controls: [range('position', 'Position along the example pass', -20, -20, 200, 10, '°')],
    model: 'A schematic horizon crossing, not an orbit or visibility prediction. Equipment, frequency, Doppler effects and service availability also matter.',
  },
  contactRecord: {
    title: 'Turn a contact into a useful record', controls: [range('step', 'Contact record details', 0, 0, 3, 1)],
    model: 'A fictional log record showing time, station and operating details. This is not a statement that all contacts must routinely be logged.',
  },
  conduct: {
    title: 'Choose how to handle an interruption', controls: [select('response', 'Response', 'engage', [['engage', 'Keep responding to the interruption'], ['leave', 'Disengage and move on']])],
    model: 'An illustrative conduct choice, not a conversation with a real person. Use appropriate advice and reporting channels for serious incidents.',
  },
  travel: {
    title: 'Check permission before a holiday contact', controls: [range('step', 'Travel preparation step', 0, 0, 3, 1)],
    model: 'A preparation checklist, not a grant of overseas operating permission. Check the destination authority and the conditions applicable to your qualification.',
  },
};

const safetyContexts = [
  [/Shack_Safety/, ['A trailing cable crosses the station access route', 'Route cables clear of the access route and keep power isolation accessible.']],
  [/Working_at_Height/, ['An unsecured ladder beside the station', 'Use appropriate access equipment and support; get qualified help.']],
  [/Antenna/, ['Antenna near an overhead power line', 'Choose a site well clear of overhead power lines.']],
  [/Battery/, ['A metal object bridges the battery terminals', 'Prevent terminal shorts and use suitable protection.']],
  [/Car/, ['A driver adjusts equipment while moving', 'Stop in a safe place before adjusting equipment.']],
  [/Outdoor/, ['An exposed station during a thunderstorm', 'Stop operating and seek appropriate shelter.']],
  [/^RF_Safety$/, ['People are too close to the transmitting antenna', 'Increase separation or stop transmitting; assess exposure.']],
  [/Earth/, ['Protective mains earth has been removed', 'Never remove protective earth to solve an RF problem.']],
];

export function activityFor(document, moduleNumber) {
  const name = document.stem;
  let kind;
  if (moduleNumber === 6) kind = 'rules';
  else if (/Frequency|Wavelength|HF_VHF_UHF|Amateur_Radio_Bands/.test(name)) kind = 'wave';
  else if (/Modulation|FM_vs|Modes_and_Modulation|CW_and_Data|Sidebands|Modes_and_EMC/.test(name)) kind = 'modulation';
  else if (/Units|Symbols|Large_and_Small/.test(name)) kind = 'units';
  else if (/Antenna_Matching|Feed_Point/.test(name)) kind = 'matching';
  else if (/^Feeders$|Connectors|Baluns/.test(name)) kind = 'feeder';
  else if (moduleNumber === 2) kind = 'circuit';
  else if (moduleNumber === 3) kind = 'signal';
  else if (moduleNumber === 4) kind = 'antenna';
  else if (moduleNumber === 5 || /^Radio_Waves$/.test(name)) kind = 'propagation';
  else if (moduleNumber === 6 || /Licence|Ofcom|Callsign/.test(name)) kind = 'rules';
  else if (moduleNumber === 7) kind = 'interference';
  else if (moduleNumber === 8) kind = 'safety';
  else if (moduleNumber === 9) kind = 'operating';
  else kind = 'radio';
  const scenario = scenarios[name];
  kind = scenario?.kind || kind;
  const context = kind === 'safety' ? (safetyContexts.find(([pattern]) => pattern.test(name))?.[1] || ['Equipment is open while still connected to mains power', 'Isolate power before work; obtain qualified help for mains equipment.']) : null;
  const activity = { ...benches[kind], kind, context, topic: name, scenario, prompt: scenario?.action || benches[kind].prompt };
  if (kind === 'antenna') {
    activity.fraction = /14_Wave/.test(name) ? 0.25 : /58_Wave/.test(name) ? 0.625 : null;
    activity.model = 'Illustrative horizontal patterns, with no predicted gain. Element lengths use ideal wavelength fractions: a dipole or Yagi driven element is about half-wave, a simple ground-plane vertical quarter-wave, and the five-eighths-wave topic uses its named fraction. Real dimensions and feed arrangements need adjustment.';
    const type = /Ground_Plane/.test(name) ? 'vertical' : /Yagi/.test(name) ? 'yagi' : 'dipole';
    if (/^Antenna_type_/.test(name)) {
      activity.fixed = { type };
      activity.controls = activity.controls.filter(control => control.key !== 'type');
    }
  }
  if (kind === 'rules' && ['Ofcom', 'Amateur_Radio_Licence'].includes(name)) activity.controls = activity.controls.map(control => ({ ...control, initial: 3 }));
  if (kind === 'rules' && name === 'Getting_Your_Foundation_Licence') activity.controls = activity.controls.map(control => ({ ...control, initial: 2 }));
  if (kind === 'units' && name === 'Large_and_Small_Units') activity.controls = activity.controls.map(control => control.key === 'amount' ? { ...control, initial: 0.5, min: 0.1, step: 0.1 } : control);
  if (kind === 'feedpoint' && /End-Fed/.test(name)) activity.controls = activity.controls.map(control => ({ ...control, initial: 'end' }));
  if (kind === 'connection' && name === 'Connectors') activity.model = 'A qualitative RF connector illustration. A complete mechanical and electrical connection is needed; impedance, shielding and losses are not calculated.';
  if (kind === 'propagation' && /VHF_and_UHF/.test(name)) activity.controls = activity.controls.map(control => ({ ...control, initial: control.key === 'band' ? 'vhf' : 'blocked' }));
  if (name === 'Modes_and_EMC') {
    activity.title = 'See how an unwanted message reaches another device';
    activity.model += ' This comparison explains how unintended amplitude detection can recover an unwanted message in susceptible equipment. It does not predict real interference or guarantee that FM is interference-free.';
  }
  return activity;
}

export function initialValues(activity) {
  return { ...activity.fixed, ...Object.fromEntries(activity.controls.map(control => [control.key, control.initial])) };
}

export function validControlValue(control, input) {
  if (control.type === 'select') return control.options.some(([value]) => value === input) ? input : control.initial;
  if (control.type === 'text') return typeof input === 'string' ? input.toUpperCase().replace(/[^A-Z0-9/]/g, '').slice(0, control.maxLength) : control.initial;
  const value = Number(input);
  if (!Number.isFinite(value) || value < control.min || value > control.max) return control.initial;
  return Number(Math.max(control.min, Math.min(control.max, Math.round((value - control.min) / control.step) * control.step + control.min)).toFixed(6));
}

export function readings(activity, values) {
  switch (activity.kind) {
    case 'circuit': { const result = circuit(values.voltage, values.resistance); return { label: 'Current', value: result.current, unit: 'A', detail: `${fmt(result.power)} W used by the resistor` }; }
    case 'wave': return { label: 'Wavelength', value: wavelength(values.frequency), unit: 'm', detail: `Ideal quarter-wave element: ${fmt(antennaElementLength(values.frequency))} m` };
    case 'units': { const scale = { mA: 1000, A: 1, kA: 0.001 }[values.prefix]; return { label: 'Same current', value: values.amount * scale, unit: values.prefix, detail: `${fmt(values.amount)} A in the circuit` }; }
    case 'matching': return { label: 'Power reflected', value: reflectedFraction(values.swr) * 100, unit: '%', detail: 'of forward power, on an ideal lossless line' };
    case 'feeder': return { label: 'Power at antenna', value: powerAfterLoss(10, values.loss), unit: 'W', detail: 'from 10 W entering the feeder' };
    case 'antenna': { const fraction = activity.fraction ?? (values.type === 'vertical' ? 0.25 : 0.5); return { label: fraction === 0.25 ? 'Ideal quarter-wave element' : fraction === 0.625 ? 'Ideal five-eighths-wave element' : 'Ideal half-wave length', value: antennaElementLength(values.frequency, fraction), unit: 'm', detail: `Physical dimensions need adjustment; pattern turned ${values.direction}°` }; }
    case 'modulation': return activity.topic === 'Modes_and_EMC' ? { label: 'Unwanted message in this model', text: values.mode === 'am' && values.depth > 0 ? 'Recovered from amplitude changes' : 'No varying envelope to recover', detail: 'This represents unintended amplitude detection; other interference mechanisms remain possible' } : { label: 'What changes', text: values.depth === 0 ? 'Unmodulated carrier' : values.mode === 'am' ? 'Wave height' : 'Wave spacing', detail: values.mode === 'am' ? 'AM: carrier amplitude follows the message' : 'FM: amplitude stays constant' };
    case 'signal': return { label: 'Output', text: values.missing === 'none' ? 'Modulated RF signal' : values.missing === 'modulator' ? 'Carrier without message' : values.missing === 'oscillator' ? 'No carrier generated' : 'RF output stage disabled', detail: values.missing === 'modulator' ? 'RF remains, but the intended changing information is absent' : 'Carrier generation, adding information and power amplification are separate functions' };
    case 'propagation': return { label: 'Path', text: values.band === 'hf' ? 'Possible skywave' : values.obstacle === 'blocked' ? 'Direct path obstructed' : 'Direct path', detail: 'Other propagation mechanisms can also occur' };
    case 'rules': return { label: 'Current stage', text: ['Learning', 'Examination', 'Pass certificate', 'Ofcom licence'][values.stage], detail: values.stage === 3 ? 'Ofcom issues the licence and call sign' : 'Follow the process; check the full conditions' };
    case 'interference': return { label: 'Illustrated interference', value: values.power * (values.filter === 'on' ? 12 : 32), unit: 'relative units', detail: 'For comparing this illustration only' };
    case 'safety': return { label: 'Scene', text: values.safe === 'safe' ? 'Hazard addressed in the illustration' : 'Hazard visible', detail: values.safe === 'safe' ? activity.context[1] : activity.context[0] };
    case 'operating': return { label: 'Next action', text: ['Listen', 'Check the frequency is free', 'Call and identify', 'Listen for a reply', 'Exchange information'][values.step], detail: 'Identify your station as required during operation' };
    case 'battery': { const pack = batteryPack(values.cells, values.connected === 'on'); return { label: 'Battery voltage', value: pack.voltage, unit: 'V', detail: `${values.cells} × 1.5 V; load current ${fmt(pack.current)} A${values.connected === 'off' ? ' — open path' : ''}` }; }
    case 'connection': return activity.topic === 'Connectors' ? { label: 'Connector', text: values.connected === 'on' ? 'Joined' : 'Separated', detail: 'Inspect the actual connection before changing radio settings; this is an RF path illustration' } : { label: 'Lamp current', value: values.connected === 'on' ? 0.5 : 0, unit: 'A', detail: values.connected === 'on' ? 'The complete conducting path lets the lamp use energy' : 'The open path stops current; the battery is still present' };
    case 'power': return { label: 'Power transferred', value: values.voltage * values.current, unit: 'W', detail: `${fmt(values.voltage * values.current)} joules of energy each second` };
    case 'series': { const lamps = lampCircuit(values.layout, values.fault === 'open'); return { label: 'Total current', value: lamps.totalCurrent, unit: 'A', detail: `Lamp 1: ${fmt(lamps.currents[0])} A; lamp 2: ${fmt(lamps.currents[1])} A` }; }
    case 'powerType': return { label: 'Direction', text: values.supply === 'dc' ? 'One direction' : 'Repeated reversals', detail: values.supply === 'dc' ? 'A steady battery voltage keeps the same polarity' : 'AC changes polarity over time; a device may need conversion to DC' };
    case 'symbols': return { label: 'Selected component', text: ({ battery: 'Battery', resistor: 'Resistor', capacitor: 'Capacitor', switch: 'Switch' })[values.component], detail: 'Match the physical object with its circuit symbol' };
    case 'digital': return { label: 'Samples in this view', value: values.samples, unit: 'samples', detail: 'The same continuous input is represented by discrete sampled values' };
    case 'tuner': { const programme = Math.abs(values.tuning - 100) <= 0.100001 ? 'Example news' : Math.abs(values.tuning - 104) <= 0.100001 ? 'Example music' : 'Neither example selected'; return { label: 'Recovered programme', text: programme, detail: `Receiver tuned to ${fmt(values.tuning)} MHz; both transmissions still exist` }; }
    case 'keying': return { label: 'Carrier', text: values.key === 'down' ? 'On' : 'Off', detail: `Visible ${values.message.toUpperCase()} pattern encodes letters using time` };
    case 'sidebands': return { label: 'Spectrum retained', text: ({ am: 'Carrier + both sidebands', usb: 'Upper sideband', lsb: 'Lower sideband' })[values.sideband], detail: 'Choose the corresponding demodulation mode at the receiver' };
    case 'feedpoint': return { label: 'Feed position', text: values.feed === 'centre' ? 'At the centre' : 'At the end', detail: 'The connection position affects the required feed and matching arrangement' };
    case 'balun': return { label: 'Inspecting', text: values.inspect === 'balanced' ? 'Balanced dipole arms' : 'Unbalanced coaxial feeder', detail: 'A suitable balun provides the transition; balanced and unbalanced describe arrangements, not good and bad' };
    case 'gain': return { label: 'ERP in favoured direction', value: effectiveRadiatedPower(10, values.gain), unit: 'W', detail: 'Transmitter stays at 10 W; gain is relative to a dipole' };
    case 'polarisation': return { label: 'Ideal direct-path coupling', value: polarisationCoupling(values.angle) * 100, unit: '%', detail: `Relative antenna angle: ${values.angle}°; real reflected paths can behave differently` };
    case 'callsign': return { label: 'Example identification', text: `M${({ england: '', wales: 'W', scotland: 'M', ni: 'I' })[values.region]}7LAB${({ home: '', field: '/P', mobile: '/M' })[values.place]}`, detail: 'Optional appropriate locator and suffix shown for this Foundation example' };
    case 'policy': return { label: 'Purpose check', text: values.purpose === 'hobby' ? 'Fits amateur purpose' : 'Commercial use outside this purpose', detail: 'Personal non-commercial self-training and experimentation; check all licence conditions' };
    case 'supervision': return { label: 'Direct physical supervision', text: values.supervisor === 'present' ? 'Licensee at the station' : 'Licensee absent', detail: values.supervisor === 'present' ? 'The licensee can regain control and remains responsible' : 'A remote message does not provide direct physical supervision' };
    case 'userService': return { label: 'Activity context', text: values.event === 'responder' ? 'Check User Service provision' : 'Ordinary amateur activity', detail: 'The specific provision concerns a Responder’s operation or exercise' };
    case 'bandplan': return { label: 'Example spectra', text: signalsOverlap(values.centre, values.width) ? 'Overlap' : 'Separate', detail: `Your edges: ${values.centre - values.width / 2}–${values.centre + values.width / 2}; other signal: 70–80 (arbitrary units)` };
    case 'referenceCheck': return { label: 'Read this item in EX307', text: ({ frequency: 'Frequency range', status: 'Allocation status', power: 'Power limit and definition', notes: 'Footnotes and restrictions' })[values.parameter], detail: 'Use the real row and its notes together; the picture supplies no operating limits' };
    case 'exposure': return { label: 'Person’s position', text: values.position === 'near' ? 'Close to the antenna' : 'Farther from the antenna', detail: 'A real EMF assessment is needed; this picture gives no compliance distance' };
    case 'phonetic': return { label: 'Text to spell', text: values.word || 'Enter a word', detail: 'Each letter has a distinct standard spelling word' };
    case 'report': return { label: 'Example RS report', text: `${values.readability}${values.strength}`, detail: `Readability ${values.readability}/5 and strength ${values.strength}/9 are separate judgments` };
    case 'repeater': return { label: 'Illustrated path', text: values.relay === 'on' ? 'Via hilltop repeater' : 'Direct path obstructed', detail: 'Separate input and output; a usable path and correct settings are needed both ways' };
    case 'satellite': return { label: 'Example pass', text: values.position >= 0 && values.position <= 180 ? 'Above the local horizon' : 'Below the local horizon', detail: 'Geometry changes during a pass; consult a real prediction for timing' };
    case 'contactRecord': return { label: 'Record detail', text: ['Date and time', 'Station worked', 'Frequency and mode', 'Reports and notes'][values.step], detail: 'An illustrative contact record; routine practice is distinct from a specific logging requirement' };
    case 'conduct': return { label: 'Response', text: values.response === 'leave' ? 'Disengage and continue appropriately' : 'An argument prolongs the interruption', detail: 'Avoid escalating; follow appropriate reporting guidance for serious concerns' };
    case 'travel': return { label: 'Before transmitting abroad', text: ['Identify destination rules', 'Check qualification recognition', 'Check authorisation requirements', 'Operate only if authorised'][values.step], detail: 'A UK licence alone does not automatically permit every overseas operation' };
    default: return { label: 'Received signal', value: values.transmitter === 'off' ? 0 : 6 - values.distance, unit: 'bars', detail: 'An illustration, not a calibrated signal report' };
  }
}

export function describeChange(activity, values, before) {
  const now = readings(activity, values);
  const old = readings(activity, before);
  if (activity.kind === 'circuit') return `${fmt(values.voltage)} V ÷ ${fmt(values.resistance)} Ω = ${fmt(now.value)} A. At a fixed voltage, more resistance means less current.`;
  if (activity.kind === 'wave') return `At ${fmt(values.frequency)} MHz, peaks are ${fmt(now.value)} m apart. An ideal quarter-wave element is ${fmt(antennaElementLength(values.frequency))} m: this affects the space an antenna needs.`;
  if (activity.kind === 'modulation') return `${now.text}. ${now.detail}.${activity.topic === 'Modes_and_EMC' ? ' Inspect the susceptible device’s output trace.' : ' Compare the output with the dashed unmodulated carrier.'}`;
  if (activity.kind === 'units') return `${fmt(values.amount)} A and ${fmt(now.value)} ${now.unit} describe the same current. The display unit changes the written number.`;
  if (now.value !== undefined) return `${now.label}: ${fmt(old.value)} ${old.unit} before; ${fmt(now.value)} ${now.unit} now. ${now.detail}.`;
  return `${now.text}. ${now.detail}.`;
}

const text = (x, y, value, cls = '') => `<text x="${x}" y="${y}" class="${cls}">${escapeHtml(value)}</text>`;
const box = (x, y, w, h, label, cls = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="${cls}"/>${text(x + w / 2, y + h / 2 + 5, label, 'centred')}`;
const frame = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" class="focus-frame"/>`;
const person = (x, y, label) => `<circle cx="${x}" cy="${y}" r="13" class="station-dot"/><path d="M${x} ${y + 15}v42m-22-25 22-10 22 10m-22 25-17 24m17-24 17 24" class="wire"/>${text(x, y + 103, label, 'centred muted')}`;
const lamp = (x, y, lit) => `<circle cx="${x}" cy="${y}" r="27" class="${lit ? 'lamp-on' : 'lamp-off'}"/><path d="M${x - 16} ${y - 16}l32 32m0-32-32 32" class="wire"/>`;
const spelling = 'Alfa Bravo Charlie Delta Echo Foxtrot Golf Hotel India Juliett Kilo Lima Mike November Oscar Papa Quebec Romeo Sierra Tango Uniform Victor Whiskey X-ray Yankee Zulu'.split(' ');
const digits = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];

function detailScene(activity, v, current) {
  switch (activity.kind) {
    case 'battery': {
      const pack = batteryPack(v.cells, v.connected === 'on');
      return `${text(230, 32, 'Chemical energy stored in the cells', 'centred')}${frame(37, 65, v.cells * 88 + 9, 120)}
        <path d="M55 125H485M55 125V250H485V195" class="wire"/><g data-focus="battery">
        ${Array.from({ length: v.cells }, (_, i) => `<rect x="${50 + i * 88}" y="85" width="70" height="80" rx="9" class="cell-body"/><path d="M${120 + i * 88} 111h7v28h-7" class="battery"/>${text(61 + i * 88, 130, '−')}${text(98 + i * 88, 130, '+')}${text(85 + i * 88, 156, '1.5 V', 'centred muted')}`).join('')}</g>
        ${box(485, 95, 125, 100, v.connected === 'on' ? 'Device on' : 'Device off', v.connected === 'on' ? 'active-stage' : 'disconnected')}
        <path d="M340 250H405" class="switch-gap"/><path d="M340 250L405 ${v.connected === 'on' ? 250 : 220}" class="wire"/>
        ${text(220, 215, `${fmt(pack.voltage)} V from ${v.cells} cells`, 'centred big-number')}${text(320, 298, `Load: ${fmt(pack.current)} A · ${fmt(pack.power)} W`, 'centred')}`;
    }
    case 'connection': return activity.topic === 'Connectors' ? `${box(25, 115, 150, 90, 'Radio', 'signal-block')}${box(465, 115, 150, 90, 'Antenna', 'signal-block')}<path d="M175 160H265M${v.connected === 'on' ? 345 : 385} 160H465" class="wire"/>
      ${frame(237, 95, 180, 135)}<g data-focus="connector"><rect x="265" y="137" width="45" height="46" class="cell-body"/><path d="M310 152h35v16h-35" class="wire"/><rect x="${v.connected === 'on' ? 335 : 375}" y="133" width="30" height="54" class="signal-block"/></g>${text(320, 282, v.connected === 'on' ? 'Connector joined: path restored' : 'Separated: inspect the connector', 'centred')}` : `<path d="M90 157V65H500V145M500 200V265H90V185" class="wire"/><path d="M62 157H118M75 185H105" class="battery"/>
      ${text(90, 225, '3 V', 'centred')}${lamp(500, 172, v.connected === 'on')}${text(500, 225, v.connected === 'on' ? 'Lamp lit' : 'Lamp off', 'centred')}
      ${frame(225, 31, 125, 85)}<g data-focus="connection"><path d="M245 65H330" class="switch-gap"/><path d="M245 65L330 ${v.connected === 'on' ? 65 : 40}" class="wire"/></g>
      ${text(287, 137, v.connected === 'on' ? 'Complete path' : 'Open gap', 'centred')}${text(320, 307, current.detail, 'centred muted')}`;
    case 'power': return `${box(40, 80, 180, 130, 'USB supply', 'signal-block')}<path d="M220 145H420" class="wire"/>
      ${box(420, 80, 180, 130, 'Compatible device', 'signal-block')}${frame(238, 96, 164, 98)}<g data-focus="power">${text(320, 135, `${v.voltage} V × ${v.current} A`, 'centred')}${text(320, 172, `${fmt(current.value)} W`, 'centred big-number')}</g>
      ${text(320, 262, `${fmt(current.value)} joules transferred every second`, 'centred')}${text(320, 295, 'A rating is a capability; the load determines the draw.', 'centred muted')}`;
    case 'series': {
      const result = lampCircuit(v.layout, v.fault === 'open');
      const series = v.layout === 'series';
      return `${text(70, 40, '6 V supply')}${box(30, 130, 115, 70, 'Battery', 'signal-block')}
        <g data-focus="lamp-paths">${series ? '<path d="M145 165V90H555V255H90V200" class="wire"/>' : '<path d="M145 165H200V75H555V255H90V200M200 165H555" class="wire"/>'}
        ${frame(series ? 235 : 295, series ? 38 : 23, series ? 285 : 85, series ? 107 : 192)}
        ${lamp(series ? 280 : 337, series ? 90 : 75, result.currents[0] > 0)}${lamp(series ? 470 : 337, series ? 90 : 165, result.currents[1] > 0)}
        ${v.fault === 'open' ? `<path d="M${series ? 268 : 325} ${series ? 90 : 75}h24" class="switch-gap"/>${text(series ? 280 : 337, series ? 160 : 127, 'Open lamp', 'centred muted')}` : ''}</g>
        ${text(420, 258, series ? 'One shared path' : 'Separate branches', 'centred')}${text(320, 305, current.detail, 'centred')}`;
    }
    case 'powerType': {
      const trace = signalPath(t => v.supply === 'ac' ? Math.sin(t * Math.PI * 4) : 0.7, { width: 340, height: 180, amplitude: 64 });
      return `${box(25, 100, 185, 100, v.supply === 'dc' ? 'Battery · DC' : 'AC source', 'signal-block')}${frame(245, 45, 370, 220)}
        <g data-focus="polarity"><g transform="translate(260,65)"><path d="M0 90H340" class="axis"/><path d="${trace}" class="current-wave"/></g>${text(260, 63, '+')}${text(260, 241, '−')}${text(602, 171, '0', 'right')}</g>
        ${text(430, 290, 'Time →', 'centred muted')}${text(115, 245, v.supply === 'dc' ? 'Fixed polarity' : 'Polarity reverses', 'centred')}${text(320, 325, 'Charger: converts and regulates AC input to suitable DC output', 'centred muted')}`;
    }
    case 'symbols': {
      const physical = { battery: `${box(65, 96, 155, 100, '1.5 V cell', 'cell-body')}${text(83, 124, '−')}${text(197, 124, '+')}`, resistor: '<path d="M45 150H90M195 150H240" class="wire"/><rect x="90" y="120" width="105" height="60" rx="15" class="cell-body"/><path d="M115 121v58m24-58v58m24-58v58" class="resistor"/>', capacitor: '<rect x="100" y="92" width="90" height="90" rx="20" class="signal-block"/><path d="M120 182v55m50-55v55" class="wire"/>', switch: '<rect x="80" y="105" width="135" height="85" rx="10" class="signal-block"/><path d="M115 145l70-35M95 190v40m105-40v40" class="wire"/>' }[v.component];
      const symbol = { battery: '<path d="M390 150h60m10-45v90m23-68v46m0-23h72" class="battery"/>', resistor: '<path d="M390 150h45m90 0h40" class="wire"/><rect x="435" y="130" width="90" height="40" class="resistor"/>', capacitor: '<path d="M390 150h70m0-45v90m26-90v90m0-45h79" class="wire"/>', switch: '<path d="M390 150h55m0 0 65-40m0 40h55" class="wire"/>' }[v.component];
      return `${text(145, 52, 'Object', 'centred')}${physical}${text(320, 157, '→', 'centred big-number')}${frame(365, 60, 225, 180)}<g data-focus="symbol">${symbol}</g>${text(480, 274, `${current.text} symbol`, 'centred')}`;
    }
    case 'digital': {
      const curve = signalPath(t => Math.sin(t * Math.PI * 2), { width: 550, height: 170, amplitude: 65 });
      const samples = Array.from({ length: v.samples }, (_, i) => { const x = 45 + i * 550 / v.samples, y = 150 - Math.sin(i / v.samples * Math.PI * 2) * 65; return `<path d="M${x} ${y}h${550 / v.samples}v${150 - Math.sin((i + 1) / v.samples * Math.PI * 2) * 65 - y}" class="sample-trace"/><circle cx="${x}" cy="${y}" r="4" class="sample-point"/>`; }).join('');
      return `${text(45, 35, 'Continuous input → samples → computer processing')}<path d="M45 150H595" class="axis"/><g transform="translate(45,65)"><path d="${curve}" class="previous-wave"/></g><g data-focus="samples">${samples}</g>${text(320, 247, `${v.samples} samples across the same input`, 'centred')}
        ${box(35, 268, 165, 43, 'Analogue input', 'signal-block')}${box(235, 268, 165, 43, 'ADC: take samples', 'signal-block')}<g data-focus="digital-processing">${box(435, 268, 170, 43, 'Computer: process', 'signal-block')}</g>`;
    }
    case 'tuner': return `${box(35, 30, 245, 65, 'News · 100 MHz', 'signal-block')}${box(355, 30, 245, 65, 'Music · 104 MHz', 'signal-block')}
      <path d="M65 140H575" class="axis"/>${[98, 100, 102, 104, 106].map(f => text(65 + (f - 98) / 8 * 510, 167, `${f}`, 'centred muted')).join('')}
      <g data-focus="tuning"><path d="M${65 + (v.tuning - 98) / 8 * 510} 115v30" class="focus-stroke"/>${text(320, 230, `Receiver: ${fmt(v.tuning)} MHz`, 'centred')}</g>
      <g data-focus="programme">${box(55, 245, 530, 58, current.text, 'signal-block')}</g>`;
    case 'keying': {
      const marks = v.message === 'sos' ? ['...', '---', '...'] : ['....', '..']; let x = 45;
      const strip = marks.map(letter => { const s = [...letter].map(mark => { const width = mark === '.' ? 12 : 36, item = `<rect x="${x}" y="82" width="${width}" height="35" class="sample-point"/>`; x += width + 12; return item; }).join(''); x += 24; return s; }).join('');
      return `${text(45, 38, `${v.message.toUpperCase()}: time runs left to right`)}<g data-focus="code">${strip}</g>${text(45, 154, 'Short mark = dot · long mark = dash', 'muted')}${box(75, 207, 180, 70, v.key === 'down' ? 'Key down' : 'Key up', 'active-stage')}
        <g transform="translate(300,175)"><path d="${signalPath(t => v.key === 'down' ? Math.sin(t * Math.PI * 24) : 0, { width: 290, height: 130, amplitude: 35 })}" class="current-wave"/></g>${text(450, 314, `Carrier ${current.text.toLowerCase()}`, 'centred muted')}`;
    }
    case 'sidebands': return `<path d="M65 250H575" class="axis"/><g data-focus="spectrum">${[190, 320, 450].map((x, i) => { const enabled = v.sideband === 'am' || (v.sideband === 'lsb' ? i === 0 : i === 2); return `<g data-focus="${['lower-sideband', 'carrier', 'upper-sideband'][i]}"><path d="M${x} 250V${i === 1 ? 70 : 140}" class="${enabled ? 'focus-stroke' : 'previous-wave'}"/>${text(x, 283, ['Lower sideband', 'Carrier', 'Upper sideband'][i], 'centred')}${text(x, 310, enabled ? 'Present' : 'Suppressed', 'centred muted')}</g>`; }).join('')}</g>${text(320, 32, 'Frequency → · single-tone example', 'centred')}`;
    case 'feedpoint': {
      const x = v.feed === 'centre' ? 320 : 90;
      return `<path d="M75 90H565M${x} 90V190" class="wire"/>${text(320, 55, 'Antenna wire', 'centred')}${frame(x - 27, 62, 54, 60)}<g data-focus="feedpoint"><circle cx="${x}" cy="90" r="8" class="sample-point"/></g>
        ${box(Math.max(25, x - 75), 190, 150, 60, /Baluns/.test(activity.topic) ? 'Balun transition' : 'Feed arrangement', 'active-stage')}${text(320, 300, /Baluns/.test(activity.topic) ? 'Balanced antenna ↔ unbalanced coax; suitable design matters' : 'Feed position changes the required matching and return path', 'centred muted')}`;
    }
    case 'balun': return `${frame(v.inspect === 'balanced' ? 70 : 285, v.inspect === 'balanced' ? 45 : 175, v.inspect === 'balanced' ? 500 : 70, v.inspect === 'balanced' ? 70 : 130)}
      <g data-focus="balanced-arms"><path d="M85 80H310m20 0H555M310 80V145m20-65v65" class="wire"/></g>${text(120, 130, 'Dipole arm', 'muted')}${text(450, 130, 'Dipole arm', 'muted')}
      <g data-focus="balun">${box(250, 145, 140, 55, 'Balun', 'active-stage')}</g><g data-focus="coax"><path d="M310 200V280m20-80v80" class="wire"/><path d="M320 200V280" class="now-bar"/></g>${text(415, 260, 'Coax: inner + outer', 'muted')}`;
    case 'gain': {
      const spread = 120 - v.gain * 8;
      return `${box(20, 130, 150, 70, '10 W transmitter', 'signal-block')}<path d="M170 165H250" class="wire"/><path d="M250 245V95" class="wire"/>
        <g data-focus="beam"><path d="M250 165Q490 ${165 - spread} 605 ${165 - spread / 2}V${165 + spread / 2}Q490 ${165 + spread} 250 165Z" class="radiation-pattern"/></g>
        ${text(430, 55, `${v.gain} dBd gain`, 'centred')}${text(430, 170, `${fmt(current.value)} W ERP`, 'centred big-number')}${text(320, 300, 'Energy concentrated in a direction · no extra energy created', 'centred muted')}`;
    }
    case 'polarisation': return `${text(135, 45, 'Handheld A', 'centred')}${text(505, 45, 'Handheld B', 'centred')}${box(95, 170, 80, 95, 'A', 'signal-block')}${box(465, 170, 80, 95, 'B', 'signal-block')}
      <path d="M135 170V80" class="wire"/><g data-focus="antenna-orientation" transform="rotate(${v.angle},505,170)"><path d="M505 170V80" class="focus-stroke"/></g><path d="M185 125H450" class="radio-path" style="opacity:${0.12 + 0.88 * polarisationCoupling(v.angle)}"/>
      ${text(320, 305, `${v.angle}° mismatch → ${fmt(current.value)}% ideal coupling`, 'centred')}`;
    case 'callsign': return `${text(320, 48, 'Example Foundation identification', 'centred')}<g data-focus="callsign">${text(320, 140, current.text, 'centred big-number')}</g>
      <g data-focus="callsign-locator">${box(35, 190, 270, 75, `Locator: ${({ england: 'omitted', wales: 'W', scotland: 'M', ni: 'I' })[v.region]}`, 'signal-block')}</g>
      <g data-focus="callsign-suffix">${box(335, 190, 270, 75, `Suffix: ${({ home: 'omitted', field: '/P', mobile: '/M' })[v.place]}`, 'signal-block')}</g>${text(320, 310, 'Optional appropriate locator and suffix for this example', 'centred muted')}`;
    case 'policy': return `${box(30, 115, 180, 100, 'Amateur station', 'signal-block')}<path d="M215 165H330" class="wire"/>${frame(342, 80, 270, 170)}<g data-focus="purpose">${box(360, 110, 230, 105, v.purpose === 'hobby' ? 'Personal experiment' : 'Paid deliveries', v.purpose === 'hobby' ? 'active-stage' : 'disconnected')}</g>${text(320, 295, v.purpose === 'hobby' ? 'Purpose fits; the other conditions still apply' : 'Technical capability does not authorise commercial use', 'centred muted')}`;
    case 'supervision': return `${box(230, 170, 180, 70, 'Radio station', 'signal-block')}${person(155, 110, 'Friend')}${person(v.supervisor === 'present' ? 450 : 565, v.supervisor === 'present' ? 110 : 35, 'Licensee')}
      ${frame(v.supervisor === 'present' ? 420 : 530, v.supervisor === 'present' ? 80 : 10, 70, 95)}<g data-focus="supervision"><path d="M410 170L${v.supervisor === 'present' ? '445 160' : '550 80'}" class="${v.supervisor === 'present' ? 'radio-path' : 'blocked-path'}"/></g>${text(320, 305, v.supervisor === 'present' ? 'Physically present and able to regain control' : 'Away: direct physical supervision is missing', 'centred')}`;
    case 'userService': return `${box(30, 115, 180, 95, 'Amateur station', 'signal-block')}<path d="M210 160H345" class="wire"/>${frame(345, 80, 270, 165)}<g data-focus="activity-context">${box(365, 110, 230, 100, v.event === 'responder' ? 'Responder-led exercise' : 'Club practice', 'active-stage')}</g>${text(320, 295, v.event === 'responder' ? 'Check the specific provision and arrangements' : 'Ordinary activity: no automatic User Service exception', 'centred muted')}`;
    case 'bandplan': return `${text(45, 40, 'Occupied spectrum · arbitrary scale')}${text(45, 89, 'Your transmission')}
      <g data-focus="occupied-bandwidth"><rect x="${45 + (v.centre - v.width / 2) * 5.5}" y="110" width="${v.width * 5.5}" height="60" class="active-stage"/></g><rect x="430" y="190" width="55" height="60" class="cell-body"/>${text(457, 283, 'Other signal: 70–80', 'centred muted')}<path d="M45 300H595" class="axis"/>${text(45, 322, '0')}${text(595, 322, '100', 'right')}`;
    case 'referenceCheck': {
      const rows = [['frequency', 'Frequency range', 'Read across the applicable row'], ['status', 'Primary / secondary', 'Check the relevant service and conditions'], ['power', 'Maximum power', 'Check units and whether ERP is specified'], ['notes', 'Footnotes', 'Check geographical and other restrictions']];
      return `${text(40, 29, 'EX307 schedule: what to inspect')}${rows.map(([key, label, check], i) => `<g data-focus="${key === v.parameter ? 'reference-table' : 'reference-item'}">${box(35, 48 + i * 58, 570, 51, '', key === v.parameter ? 'active-stage' : 'signal-block')}${text(48, 79 + i * 58, label)}${text(270, 79 + i * 58, check, 'muted')}</g>`).join('')}${text(320, 310, 'Checklist only · read actual values in the current booklet', 'centred muted')}`;
    }
    case 'exposure': return `<path d="M130 260V75m-30 15 30-30 30 30" class="wire"/><path d="M175 90Q330 160 175 245" class="radio-path"/>${text(130, 300, 'Antenna', 'centred')}
      <g data-focus="person-position">${person(v.position === 'near' ? 250 : 535, 140, 'Visitor')}</g>${text(390, 50, 'Who can access this area?', 'centred')}${text(390, 295, 'Assess the real installation and retain the required record.', 'centred muted')}`;
    case 'phonetic': return `${text(45, 35, 'Letter → standard spelling word')}<g data-focus="spelling">${[...v.word].map((char, i) => { const x = 20 + (i % 4) * 156, y = 65 + Math.floor(i / 4) * 120; const word = /[A-Z]/.test(char) ? spelling[char.charCodeAt(0) - 65] : /\d/.test(char) ? digits[Number(char)] : 'Slash'; return `${box(x, y, 143, 95, word, 'active-stage')}${text(x + 71, y + 25, char, 'centred muted')}`; }).join('')}</g>`;
    case 'report': return `<g data-focus="signal-report">${text(40, 40, 'Readability: can the message be understood?')}${box(40, 65, 560, 80, ['[unreadable]', 'ME… A… … …', 'MEET … … PARK', 'MEET AT … PARK', 'MEET AT THE PARK'][v.readability - 1], 'signal-block')}
      ${text(40, 190, 'Strength: a separate observation')}<g data-focus="strength">${Array.from({ length: 9 }, (_, i) => `<rect x="${45 + i * 42}" y="${265 - i * 5}" width="26" height="${15 + i * 5}" class="${i < v.strength ? 'sample-point' : 'lamp-off'}"/>`).join('')}</g>${text(520, 260, current.text, 'centred big-number')}${text(520, 292, 'Example RS', 'centred muted')}</g>`;
    case 'repeater': return `<path d="M205 270L320 110L435 270Z" class="hill"/>${box(20, 220, 125, 65, 'Handheld A', 'signal-block')}${box(495, 220, 125, 65, 'Handheld B', 'signal-block')}
      <path d="M145 250H495" class="blocked-path"/>${frame(240, 28, 160, 85)}<g data-focus="repeater">${box(250, 38, 140, 65, 'Repeater', v.relay === 'on' ? 'active-stage' : 'signal-block')}</g>
      ${v.relay === 'on' ? '<path d="M100 215L275 105M365 105L540 215" class="radio-path"/>' : ''}${text(125, 150, 'Input path', 'centred muted')}${text(515, 150, 'Output path', 'centred muted')}${text(320, 320, 'Both paths and access settings must work.', 'centred muted')}`;
    case 'satellite': {
      const angle = v.position * Math.PI / 180, x = 320 - 230 * Math.cos(angle), y = 235 - 190 * Math.sin(angle);
      return `<path d="M40 235H600" class="ground"/><path d="M90 235A230 190 0 0 1 550 235" class="previous-wave"/>${text(590, 260, 'Horizon', 'right muted')}<g data-focus="spacecraft">${box(x - 37, y - 20, 74, 40, 'Satellite', 'active-stage')}</g><path d="M320 235L${x} ${y}" class="${v.position >= 0 && v.position <= 180 ? 'radio-path' : 'blocked-path'}"/>${text(320, 312, current.text, 'centred')}`;
    }
    case 'contactRecord': {
      const fields = ['Example: 26 Oct 2026 · 12:34 UTC', 'Station worked: M7LAB (fictional)', 'Example frequency/mode: 145.500 MHz · FM', 'Report: 57 · notes: portable demonstration'];
      return `${text(40, 35, 'A contact record you can inspect later')}<g data-focus="record">${fields.map((field, i) => `${box(40, 60 + i * 61, 560, 49, i <= v.step ? field : '…', i === v.step ? 'active-stage' : 'signal-block')}`).join('')}</g>`;
    }
    case 'conduct': return `${box(30, 55, 235, 85, 'Unhelpful interruption', 'disconnected')}<path d="M265 100H360V170" class="wire"/>${frame(290, 175, 320, 110)}<g data-focus="response">${box(305, 190, 290, 80, v.response === 'leave' ? 'Disengage appropriately' : 'Continue the argument', v.response === 'leave' ? 'active-stage' : 'disconnected')}</g>`;
    case 'travel': {
      const steps = ['Destination rules', 'Recognition', 'Authorisation', 'Only if authorised'];
      return `${text(320, 45, 'Taking a handheld abroad', 'centred')}<g data-focus="destination-check">${steps.map((s, i) => `${box(30 + i * 151, 110, 133, 95, s, i === v.step ? 'active-stage' : 'signal-block')}`).join('')}</g>${text(320, 270, 'UK licence → check the destination’s requirements', 'centred')}`;
    }
    default: return null;
  }
}

export function drawActivity(activity, values, before) {
  const current = readings(activity, values);
  let drawing = detailScene(activity, values, current);
  if (activity.kind === 'circuit') {
    const amps = circuit(values.voltage, values.resistance).current;
    const previous = circuit(before.voltage, before.resistance).current;
    const barScale = 480 / Math.max(4, previous, amps);
    drawing = `${frame(455, 86, 72, 106)}<path d="M120 112V55H490V110M490 170V225H120V143" class="wire" style="stroke-width:${Math.min(9, 2 + amps)}"/>
      <path d="M88 112H152M101 143H139" class="battery"/><g data-focus="resistor"><path d="M490 110l-14 6 28 10-28 10 28 10-28 10 14 14" class="resistor"/></g>
      ${text(120, 180, `${values.voltage} V`, 'centred')}${text(540, 147, `${values.resistance} Ω`, 'centred')}
      <path d="M260 55l-12-7v14zM360 225l12-7v14z" class="flow-arrow"/>
      <g data-focus="formula">${box(205, 100, 205, 80, `${fmt(amps)} A`, 'meter')}${text(307, 202, `${values.voltage} V ÷ ${values.resistance} Ω`, 'centred muted')}</g>
      <path d="M85 270H${85 + previous * barScale}" class="before-bar"/><path d="M85 286H${85 + amps * barScale}" class="now-bar"/>`;
  } else if (activity.kind === 'wave') {
    const extent = waveExtent(values.frequency), element = antennaElementLength(values.frequency);
    const path = frequency => signalPath(x => Math.sin(2 * Math.PI * x * extent / wavelength(frequency)), { width: 560, height: 130, amplitude: 35 });
    const reference = element <= 1 ? 0.15 : 1.7, max = Math.max(element, reference), scale = 440 / max;
    drawing = `${text(40, 24, `Wave view: ${fmt(extent)} metres across`, 'muted')}<g data-focus="wavelength" transform="translate(40,32)"><path d="M0 65H560" class="axis"/>
      ${extent / wavelength(before.frequency) <= 60 ? `<path d="${path(before.frequency)}" class="previous-wave"/>` : ''}<path d="${path(values.frequency)}" class="current-wave"/></g>
      <path d="M40 170H600M40 165V175M600 165V175" class="axis"/>${text(40, 195, '0 m', 'muted')}${text(600, 195, `${fmt(extent)} m`, 'right muted')}
      ${frame(25, 213, 590, 173)}<g data-focus="antenna-size">${text(45, 242, `Ideal quarter-wave element: ${fmt(element)} m`)}
      <path d="M55 272H${55 + element * scale}" class="focus-stroke"/><path d="M55 260v24M${55 + element * scale} 260v24" class="wire"/>
      ${element <= 1 ? `<rect x="55" y="306" width="${reference * scale}" height="30" rx="4" class="signal-block"/>${text(55, 365, 'Phone length: 15 cm (reference object)', 'muted')}` : `<path d="M55 320H${55 + reference * scale}" class="wire"/><circle cx="${55 + reference * scale}" cy="320" r="8" class="station-dot"/>${text(55, 365, 'Person’s height: 1.7 m (drawn sideways)', 'muted')}`}
      ${text(595, 336, 'Same scale below', 'right muted')}</g>`;
  } else if (activity.kind === 'modulation') {
    const path = signalPath(t => modulatedSignal(t, values.mode, values.depth).value, { width: 560, height: 160, amplitude: 40 });
    const carrier = signalPath(t => modulatedSignal(t, values.mode, 0).value, { width: 560, height: 160, amplitude: 40 });
    const message = signalPath(t => Math.sin(t * Math.PI * 2), { width: 560, height: 70, amplitude: 23 });
    drawing = `${frame(25, /Modes_and_Modulation/.test(activity.topic) ? 5 : 130, 590, /Modes_and_Modulation/.test(activity.topic) ? 310 : 185)}${text(40, 28, 'Message shape')}
      <g data-focus="message" transform="translate(40,35)"><path d="M0 35H560" class="axis"/><path d="${message}" class="message-wave"/></g>
      ${text(40, 140, `${values.mode.toUpperCase()} output`)}
      <g data-focus="carrier-output" transform="translate(40,145)"><path d="M0 80H560" class="axis"/><path d="${carrier}" class="previous-wave"/><path d="${path}" class="current-wave"/></g>`;
    if (activity.topic === 'Modes_and_EMC') {
      const rf = signalPath(t => modulatedSignal(t, values.mode, values.depth).value, { width: 340, height: 140, amplitude: 32 });
      const unwanted = signalPath(t => values.mode === 'am' ? values.depth * Math.sin(t * Math.PI * 2) : 0, { width: 160, height: 90, amplitude: 30 });
      drawing = `${text(35, 30, 'How an unwanted message can appear in equipment')}${text(35, 85, `${values.mode.toUpperCase()} radio signal`)}
        <g data-focus="carrier-output" transform="translate(35,100)"><path d="${rf}" class="current-wave"/></g><path d="M385 170H425" class="wire"/>
        ${box(430, 80, 185, 160, '', 'signal-block')}${text(522, 108, 'Susceptible device', 'centred muted')}<g transform="translate(442,120)"><path d="${unwanted}" class="message-wave"/></g>
        ${text(320, 280, values.mode === 'am' && values.depth > 0 ? 'Varying amplitude → unintended message recovery' : 'No varying envelope in this example; other mechanisms remain', 'centred muted')}${text(320, 315, 'Mechanism illustration, not a prediction of actual interference', 'centred muted')}`;
    }
  } else if (activity.kind === 'units') {
    drawing = `${text(320, 35, 'Compare device labels using the same unit', 'centred')}<g data-focus="device-label">${box(70, 80, 205, 110, `${fmt(values.amount)} A`, 'meter')}</g><path d="M290 135H350M340 125l12 10-12 10" class="wire"/>${frame(350, 65, 235, 140)}<g data-focus="unit-prefix">${box(365, 80, 205, 110, `${fmt(current.value)} ${values.prefix}`, 'meter')}</g>${text(320, 255, 'One physical quantity. Two ways to write it.', 'centred')}`;
  } else if (activity.kind === 'signal') {
    const labels = ['Oscillator', 'Modulator', 'RF amplifier', 'Antenna'];
    const keys = ['oscillator', 'modulator', 'amplifier', 'antenna'];
    const focus = /Transmitting/.test(activity.topic) ? 1 : /Radio_Signals/.test(activity.topic) ? 0 : 2;
    const carrierPresent = values.missing !== 'oscillator';
    const messagePresent = values.missing !== 'modulator';
    const outputPresent = carrierPresent && values.missing !== 'amplifier';
    drawing = `${frame(5 + focus * 160, 112, 152, 106)}<g data-focus="chain"><path d="M60 165H580" class="wire"/>` + labels.map((label, i) => `<g data-focus="${keys[i]}">${box(12 + i * 160, 125, 138, 80, label, values.missing === keys[i] && keys[i] !== 'modulator' ? 'disconnected' : 'signal-block')}</g>`).join('') +
      `</g><path d="M240 70V125" class="wire"/>${values.missing === 'modulator' ? '<path d="M240 88v20" class="switch-gap"/>' : ''}${text(240, 55, messagePresent ? 'Message input present' : 'Message input missing', 'centred')}
      ${text(85, 245, 'Carrier generated', 'centred muted')}${text(320, 245, 'RF after modulation', 'centred muted')}${text(550, 245, 'RF output', 'centred muted')}
      ${[[15, carrierPresent, 0, 17], [240, carrierPresent, messagePresent ? 0.65 : 0, 17], [465, outputPresent, messagePresent ? 0.65 : 0, 30]].map(([x, present, depth, amplitude]) => `<g transform="translate(${x},260)"><path d="M0 45H155" class="axis"/><path d="${signalPath(t => present ? modulatedSignal(t, 'am', depth).value : 0, { width: 155, height: 90, amplitude })}" class="current-wave"/></g>`).join('')}
      ${text(320, 397, current.text, 'centred')}`;
  } else if (activity.kind === 'antenna') {
    const cx = 195, cy = 150;
    let path = '';
    for (let i = 0; i <= 180; i++) {
      const angle = i / 180 * Math.PI * 2;
      const radius = values.type === 'vertical' ? 95 : values.type === 'dipole' ? 110 * Math.abs(Math.sin(angle)) : 20 + 100 * ((1 + Math.cos(angle)) / 2) ** 4;
      path += `${i ? 'L' : 'M'}${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)} `;
    }
    const physical = values.type === 'vertical' ? `<path d="M480 200V${activity.fraction === 0.625 ? 50 : 140}M480 200l-75 20m75-20 75 20M480 200v22" class="wire"/>` : values.type === 'yagi' ? '<path d="M385 145H590M405 80v130m50-115v100m45-85v70m45-65v60m40-55v50" class="wire"/>' : '<path d="M375 130H475m10 0h110M480 135v80" class="wire"/>';
    drawing = `<circle cx="195" cy="150" r="112" class="grid-circle"/><path d="M60 150H330M195 25V275" class="axis"/><g data-focus="pattern" transform="rotate(${values.direction},195,150)"><path d="${path}Z" class="radiation-pattern"/></g><circle cx="195" cy="150" r="7" class="station-dot"/>
      ${frame(/Polar_Patterns/.test(activity.topic) ? 65 : 355, 40, 260, 195)}<g data-focus="antenna" transform="rotate(${values.type === 'vertical' ? 0 : values.direction},480,145)">${physical}</g>
      ${text(480, 255, `${fmt(current.value)} m at ${values.frequency} MHz`, 'centred')}${text(480, 283, current.label, 'centred muted')}${text(195, 305, `Horizontal pattern · ${values.direction}°`, 'centred muted')}`;
  } else if (activity.kind === 'matching' || activity.kind === 'feeder') {
    const matching = activity.kind === 'matching';
    const output = matching ? 10 * (1 - reflectedFraction(values.swr)) : powerAfterLoss(10, values.loss);
    drawing = `${frame(183, matching ? 150 : 112, 270, 48)}${box(25, 110, 145, 80, 'Transmitter', 'signal-block')}${box(470, 110, 145, 80, 'Antenna', 'signal-block')}
      <path d="M175 137H460" class="wire"/>${text(320, 110, '10 W forward', 'centred')}
      <g data-focus="${matching ? 'reflected-power' : 'feeder-loss'}">${matching ? `<path d="M460 175H175" class="return-wire" style="stroke-width:${2 + (10 - output)}"/>` : `<path d="M230 150Q265 110 300 150T370 150T440 150" class="wire"/>${[250, 320, 390].map(x => `<path d="M${x} 165q-12 12 0 25t0 25" class="loss-heat" style="opacity:${0.15 + (10 - output) / 10 * 0.85}"/>`).join('')}`}</g>
      ${text(320, 215, matching ? `${fmt(10 - output)} W reflected` : `${fmt(10 - output)} W lost`, 'centred')}${text(320, 275, `${fmt(output)} W ${matching ? 'delivered' : 'at the antenna'}`, 'centred big-number')}`;
  } else if (activity.kind === 'propagation') {
    drawing = `${frame(values.band === 'hf' ? 220 : 225, values.band === 'hf' ? 5 : 140, 190, values.band === 'hf' ? 65 : 105)}<g data-focus="terrain"><path d="M25 260Q320 225 615 260" class="ground"/>${values.obstacle === 'blocked' ? '<path d="M230 245L320 145L410 245Z" class="hill"/>' : ''}</g><g data-focus="ionosphere"><path d="M20 70Q320-30 620 70" class="ionosphere"/></g>
      ${text(320, 32, 'Ionosphere', 'centred muted')}<path d="M65 240V190m-15 5 15-20 15 20M575 240V190m-15 5 15-20 15 20" class="wire"/>
      <g data-focus="radio-path"><path d="${values.band === 'hf' ? 'M65 190Q320-80 575 190' : 'M65 190H575'}" class="${values.band === 'vhf' && values.obstacle === 'blocked' ? 'blocked-path' : 'radio-path'}"/></g>
      ${text(320, 295, current.text, 'centred')}`;
  } else if (activity.kind === 'rules' || activity.kind === 'operating') {
    const stages = activity.kind === 'rules' ? ['Study', 'RSGB exam', 'Certificate', 'Ofcom licence'] : ['Listen', 'Check clear', 'Call + identify', 'Listen for reply', 'Exchange'];
    const step = values.stage ?? values.step;
    const w = 590 / stages.length;
    drawing = `<path d="M45 155H590" class="axis"/><g data-focus="current-step">` + stages.map((label, i) => `<g data-focus="${activity.kind === 'rules' && i >= 2 ? 'certificate-licence' : 'process-stage'}"><g data-focus="${activity.kind === 'rules' && i === 3 ? 'licence-issuer' : 'stage'}">${box(20 + i * w, 115, w - 9, 85, label, i === step ? 'active-stage' : i < step ? 'past-stage' : 'signal-block')}${text(20 + i * w + (w - 9) / 2, 230, i < step ? 'Previous' : i === step ? 'Here now' : 'Next', 'centred muted')}</g></g>`).join('') + '</g>';
  } else if (activity.kind === 'interference') {
    const strength = values.power * (values.filter === 'on' ? 0.25 : 1);
    const device = /Cars/.test(activity.topic) ? 'Vehicle electronics' : /Dealing|Neighbours/.test(activity.topic) ? 'TV display' : 'Affected device';
    drawing = `${frame(440, 95, 175, 155)}${box(35, 120, 145, 90, 'Transmitter', 'signal-block')}<g data-focus="affected-device">${box(455, 120, 145, 90, device, 'signal-block')}${Array.from({ length: Math.ceil(strength * 3) }, (_, i) => `<path d="M470 ${155 + i * 3}h110" class="interference-path"/>`).join('')}</g>
      <g data-focus="coupling-path"><path d="M185 165Q320 50 450 165" class="interference-path" style="stroke-width:${strength * 2}"/></g>
      <path d="M455 230H280" class="wire"/><g data-focus="suppression">${box(280, 215, 155, 30, values.filter === 'on' ? 'Suppression fitted' : 'No suppression', values.filter === 'on' ? 'filter-block' : 'signal-block')}</g>
      ${text(320, 75, values.filter === 'on' ? 'Unwanted coupling reduced in this model' : 'Unwanted signal couples into the device', 'centred')}
      <g data-focus="observation-record">${box(30, 275, 580, 40, `Record: level ${values.power} · suppression ${values.filter} · effect ${current.value}`, 'signal-block')}</g>`;
  } else if (activity.kind === 'safety') {
    const safe = values.safe === 'safe';
    let hazardScene;
    if (/Mains_and_RF_Earths/.test(activity.topic)) {
      hazardScene = `${box(60, 100, 190, 95, 'Mains equipment', 'signal-block')}${box(410, 100, 165, 95, 'RF arrangement', 'signal-block')}<path d="M250 150H410" class="radio-path"/>
        ${frame(115, 190, 100, 107)}<path d="M165 195V265m-35 0h70m-58 12h46m-34 12h22" class="now-bar"/>${safe ? '' : '<path d="M165 218v25" class="switch-gap"/>'}${text(165, 320, safe ? 'Protective earth intact' : 'Protective earth broken', 'centred muted')}${text(490, 240, 'A different function', 'centred muted')}`;
    } else if (/Mains_Plugs_and_Fuses/.test(activity.topic)) {
      hazardScene = `${box(60, 105, 160, 120, 'Plug + fuse', 'signal-block')}<path d="M90 105V70m95 35V70M220 165H415" class="wire"/><rect x="100" y="175" width="75" height="20" class="cell-body"/>
        ${box(415, 110, 175, 110, 'Equipment', 'signal-block')}${frame(260, 120, 105, 90)}${safe ? '<path d="M285 165h35" class="switch-gap"/>' : ''}${text(320, 280, safe ? 'Supply isolated before suitable inspection' : 'Still connected: do not work on it', 'centred')}`;
    } else if (/Working_at_Height/.test(activity.topic)) {
      hazardScene = `${frame(385, 80, 150, 200)}<path d="M420 260L${safe ? 465 : 485} 90M445 260L${safe ? 490 : 510} 90M432 210H456M442 165H468M454 120H480" class="wire"/>${safe ? '<path d="M410 264H458" class="now-bar"/>' : '<path d="M410 265Q435 235 460 265" class="blocked-path"/>'}${text(200, 175, safe ? 'Appropriate support and help' : 'Unsecured access', 'centred')}`;
    } else if (/Antenna/.test(activity.topic)) {
      const antennaX = safe ? 130 : 400;
      hazardScene = `${frame(antennaX - 42, 70, 84, 205)}<path d="M440 60V260M560 60V260M415 65H585M415 80H585" class="wire"/><path d="M${antennaX} 260V105m-30 8 30-30 30 30" class="radio-path"/>${text(500, 290, 'Overhead lines', 'centred muted')}`;
    } else if (/Battery/.test(activity.topic)) {
      hazardScene = `${frame(225, 70, 180, 83)}${box(220, 155, 190, 110, 'Battery', 'cell-body')}<path d="M250 155V125M375 155V125" class="wire"/>${safe ? '<rect x="237" y="113" width="26" height="30" class="active-stage"/><rect x="362" y="113" width="26" height="30" class="active-stage"/>' : '<path d="M250 120H375" class="blocked-path"/>'}${text(250, 95, '+', 'centred')}${text(375, 95, '−', 'centred')}${text(320, 310, safe ? 'Terminals protected; metal bridge removed' : 'Metal bridges the exposed terminals', 'centred muted')}`;
    } else if (/RF_/.test(activity.topic)) {
      const personX = safe ? 495 : 250;
      hazardScene = `${frame(personX - 40, 140, 80, 140)}<path d="M165 260V85m-30 10 30-30 30 30" class="wire"/><path d="M195 100Q330 170 195 240" class="radio-path"/>${person(personX, 160, 'Visitor')}`;
    } else if (/Car/.test(activity.topic)) {
      hazardScene = `${frame(155, 85, 330, 175)}<path d="M175 205v-65h65l35-45h95l40 45h55v65Z" class="signal-block"/><circle cx="235" cy="210" r="27" class="lamp-off"/><circle cx="410" cy="210" r="27" class="lamp-off"/>${box(295, 145, 88, 40, 'Radio', 'active-stage')}${text(320, 285, safe ? 'Stop in a safe place before adjusting' : 'Moving: adjustment distracts the driver', 'centred')}`;
    } else if (/Outdoor/.test(activity.topic)) {
      hazardScene = `<path d="M80 85Q70 40 120 50Q160 5 190 55Q245 40 240 90Z" class="hill"/><path d="M160 98l-20 40h25l-15 35" class="focus-stroke"/>${frame(300, 120, 260, 130)}${box(320, 145, 215, 85, safe ? 'Operating stopped' : 'Exposed station', safe ? 'active-stage' : 'disconnected')}${text(320, 295, safe ? 'Seek appropriate shelter' : 'Changing weather can end the session', 'centred')}`;
    } else if (/Shack/.test(activity.topic)) {
      hazardScene = `${box(160, 95, 300, 95, 'Station desk', 'signal-block')}${frame(170, 190, 280, 100)}<path d="${safe ? 'M210 190V240H420' : 'M210 190Q390 310 420 215Q310 165 260 265'}" class="${safe ? 'now-bar' : 'blocked-path'}"/>${text(320, 315, safe ? 'Cable route clear; isolation accessible' : 'Trailing cable across access route', 'centred muted')}`;
    } else {
      hazardScene = `${box(190, 95, 210, 95, 'Radio equipment', 'signal-block')}${frame(355, 200, 130, 85)}<path d="M280 190V235H${safe ? 395 : 440}" class="wire"/><path d="M455 215V255M465 225V245" class="wire"/>${safe ? text(330, 300, 'Power isolated before suitable work', 'centred muted') : text(330, 300, 'Still connected to the supply', 'centred muted')}`;
    }
    if (activity.scenario) hazardScene = hazardScene.replace(/(<rect[^>]*class="focus-frame"\/>)/, `<g data-focus="${escapeHtml(activity.scenario.focusTarget)}">$1</g>`);
    drawing = `<g data-focus="hazard">${hazardScene}</g>${text(55, 45, safe ? 'Safer arrangement' : 'Hazard', '')}<circle cx="570" cy="40" r="22" class="${safe ? 'safe-mark' : 'hazard-mark'}"/>${text(570, 48, safe ? '✓' : '!', 'centred big-number')}`;
  } else if (drawing === null) {
    const x = 220 + values.distance * 65;
    drawing = `${frame(x - 45, 78, 90, 180)}<g data-focus="receiver"><path d="M90 240V110m-23 15 23-30 23 30M${x} 240V110m-23 15 23-30 23 30" class="wire"/>
      ${values.transmitter === 'on' ? `<path d="M120 150Q${x / 2} 50 ${x - 30} 150" class="radio-path"/>` : ''}
      ${text(90, 275, 'Transmitter', 'centred')}${text(x, 275, 'Receiver', 'centred')}${text(320, 55, `${current.value} illustrated signal bars`, 'centred')}</g>`;
  }
  if (activity.scenario) {
    const marker = `data-focus="${activity.scenario.focusTarget}"`;
    if (!drawing.includes(marker)) throw new Error(`Missing visual part for ${activity.topic}`);
    drawing = drawing.replaceAll(marker, `${marker} class="topic-focus"`);
  }
  return `<svg viewBox="0 0 640 ${activity.kind === 'signal' ? 420 : activity.kind === 'wave' ? 400 : 330}" role="img" aria-label="${escapeHtml(`${activity.scenario?.focus || activity.title}. ${current.text ?? `${fmt(current.value)} ${current.unit}`}. ${current.detail}`)}">${drawing}</svg>`;
}
