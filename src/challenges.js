import { initialValues, drawActivity, escapeHtml as esc } from './activities.js';
import { antennaElementLength, circuit, batteryPack, powerAfterLoss, effectiveRadiatedPower, signalsOverlap } from './physics.js';

const format = value => new Intl.NumberFormat('en-GB', { maximumFractionDigits: 3 }).format(value);
const levels = ['Worked example', 'Guided practice', 'Independent practice'];
const choose = (items, seed) => items[seed % items.length];

// shortcut: related topics share model-based tasks; add topic-specific variants when learner pilots expose gaps.
export function createChallenge(activity, level = 0, seed = 0) {
  if (!activity?.kind || !Array.isArray(activity.controls) || !Number.isInteger(level) || level < 0 || level > 2 || !Number.isSafeInteger(seed) || seed < 0) throw new RangeError('Choose a valid activity, practice level and variation.');
  const base = { id: `${activity.topic}:${level}:${seed}`, kind: activity.kind, level, seed, activity, title: levels[level], initial: initialValues(activity), target: {}, controls: activity.controls.map(control => ({ ...control })), answer: null, unit: '', model: activity.model };
  const numeric = (prompt, initial, answer, unit, givens, hints, solution) => ({ ...base, prompt: `${prompt} Enter the number in ${unit}; round to three decimal places if needed.`, initial: { ...base.initial, ...initial }, controls: [], answer, unit, givens, hints, solution });
  const action = (prompt, target, hints, solution, initial = {}) => {
    const start = { ...base.initial, ...initial };
    if (Object.entries(target).every(([key, value]) => start[key] === value)) {
      const [key, value] = Object.entries(target).find(([key]) => !Object.hasOwn(initial, key)) || Object.entries(target)[0];
      const control = activity.controls.find(item => item.key === key);
      if (control) start[key] = control.type === 'select' ? control.options.find(([option]) => option !== value)?.[0] : control.type === 'range' ? (value === control.min ? control.max : control.min) : '';
    }
    return { ...base, prompt, initial: start, target, hints, solution };
  };
  switch (activity.kind) {
    case 'circuit': {
      const voltage = choose([12, 18, 24], seed), resistance = choose([8, 12, 6], seed);
      if (activity.topic === 'Formula_Resistance') {
        const current = choose([2, 1.5, 4], seed), unknown = voltage / current;
        return numeric(`An ideal resistor has ${voltage} V across it and carries ${current} A. Calculate its resistance.`, { voltage, resistance: unknown }, unknown, 'Ω', [['Voltage', `${voltage} V`], ['Current', `${current} A`], ['Resistance', '? Ω']], ['Resistance is the unknown. Rearrange V = I × R to R = V/I.', `Substitute R = ${voltage}/${current}.`], `R = V/I = ${voltage}/${current} = ${format(unknown)} Ω. Dividing voltage by current gives resistance, not power.`);
      }
      return numeric(`An ideal ${voltage} V supply is connected across a ${resistance} Ω resistor. Calculate the current through it.`, { voltage, resistance }, circuit(voltage, resistance).current, 'A', [['Supply', `${voltage} V`], ['Resistance', `${resistance} Ω`], ['Current', '? A']], ['Current is the unknown. Use I = V/R.', `Substitute I = ${voltage}/${resistance}, keeping the ampere unit.`], `I = V/R = ${voltage}/${resistance} = ${format(voltage / resistance)} A. This applies to the ideal resistor model.`);
    }
    case 'battery': {
      const cells = choose([3, 4, 2], seed), connected = seed % 2 === 0;
      const pack = batteryPack(cells, connected);
      if (seed % 4 >= 2) return numeric(`${cells} identical ideal 1.5 V cells are in series. The path to a 6 Ω load is ${connected ? 'closed' : 'open'}. Calculate the load current.`, { cells, connected: connected ? 'on' : 'off' }, pack.current, 'A', [['Cells in series', `${cells} × 1.5 V`], ['6 Ω load path', connected ? 'Closed' : 'Open'], ['Load current', '? A']], ['Add the series cell voltages first. Then consider whether the path is complete.', connected ? `I = (${cells} × 1.5)/6.` : 'The path is open, so no load current flows in this ideal model.'], connected ? `V = ${cells} × 1.5 = ${format(pack.voltage)} V. I = V/R = ${format(pack.voltage)}/6 = ${format(pack.current)} A through the connected load.` : `The open path gives I = 0 A. The ideal battery still has ${format(pack.voltage)} V across its terminals; zero load current does not imply zero voltage.`);
      return numeric(`${cells} identical ideal 1.5 V cells are connected in series. The load path is ${connected ? 'connected to a 6 Ω load' : 'open'}. What is the voltage across the whole battery?`, { cells, connected: connected ? 'on' : 'off' }, pack.voltage, 'V', [['Cells in series', `${cells} × 1.5 V`], ['Load path', connected ? 'Closed' : 'Open'], ['Battery voltage', '? V']], ['Series cell voltages add.', `Multiply ${cells} by 1.5 V. An open load stops current; it does not remove the ideal terminal voltage.`], `V = ${cells} × 1.5 = ${format(pack.voltage)} V. The load current is ${format(pack.current)} A in this ideal model; that is a separate quantity.`);
    }
    case 'power': {
      const voltage = choose([6, 9, 12], seed), current = choose([2, 0.5, 1.5], seed);
      return numeric(`A compatible load actually draws ${current} A from a ${voltage} V supply. Calculate the power transferred.`, { voltage, current }, voltage * current, 'W', [['Voltage', `${voltage} V`], ['Current drawn', `${current} A`], ['Power', '? W']], ['Use the current actually drawn by the load, not a supply maximum rating.', `P = V × I = ${voltage} × ${current}.`], `P = ${voltage} × ${current} = ${format(voltage * current)} W, or ${format(voltage * current)} joules each second. This uses the current actually drawn by the compatible load.`);
    }
    case 'wave': {
      const frequency = choose([150, 75, 300], seed), fraction = /Wavelength/.test(activity.topic) ? 1 : 0.25;
      return numeric(`At ${frequency} MHz, calculate ${fraction === 1 ? 'the wavelength' : 'the ideal quarter-wave element length'}. Use the course approximation c = 300 million metres per second.`, { frequency }, antennaElementLength(frequency, fraction), 'm', [['Frequency', `${frequency} MHz`], ['Required fraction', fraction === 1 ? 'One wavelength' : 'Quarter wavelength'], ['Length', '? m']], ['First calculate wavelength: λ = 300/f in MHz.', fraction === 1 ? `Calculate 300/${frequency}.` : `Divide 300/${frequency} by 4 to obtain a quarter wavelength.`], `λ = 300/${frequency} = ${format(300 / frequency)} m${fraction === 1 ? '.' : `; a quarter wavelength is ${format(300 / frequency)}/4 = ${format(75 / frequency)} m.`} Real antenna dimensions need adjustment; this is an ideal estimate.`);
    }
    case 'antenna': {
      const frequency = choose([15, 20, 30], seed), fraction = activity.fraction ?? (base.initial.type === 'vertical' ? 0.25 : 0.5);
      const name = fraction === 0.25 ? 'quarter-wave' : fraction === 0.625 ? 'five-eighths-wave' : 'half-wave';
      return numeric(`Estimate the ideal ${name} element length for ${frequency} MHz. Use λ = 300/f in MHz.`, { frequency }, antennaElementLength(frequency, fraction), 'm', [['Frequency', `${frequency} MHz`], ['Length fraction', name], ['Ideal element', '? m']], ['Calculate the full wavelength first.', `Multiply 300/${frequency} by ${fraction}.`], `λ = 300/${frequency} = ${format(300 / frequency)} m. Element length = λ × ${fraction} = ${format(antennaElementLength(frequency, fraction))} m. This is not a construction specification.`);
    }
    case 'feeder': {
      const loss = choose([3, 6, 10], seed), answer = powerAfterLoss(10, loss);
      return numeric(`An example feeder receives 10 W and has ${loss} dB loss. Using the supplied engineering relationship Pout = Pin × 10^(−loss/10), calculate the power reaching the antenna.`, { loss }, answer, 'W', [['Input power', '10 W'], ['Feeder loss', `${loss} dB`], ['Output power', '? W']], ['Loss reduces the power; the answer must be below 10 W.', `Pout = 10 × 10^(−${loss}/10). A 3 dB loss is approximately one half.`], `Pout = 10 × 10^(−${loss}/10) = ${format(answer)} W. This optional calculation uses the example loss, not a specification for a real cable.`);
    }
    case 'units': {
      const amount = choose([0.25, 0.75, 1.5], seed);
      return numeric(`A radio accessory draws ${amount} A. Express the same current in milliamperes.`, { amount, prefix: 'A' }, amount * 1000, 'mA', [['Actual current', `${amount} A`], ['Display unit', 'mA'], ['Same current', '? mA']], ['Milli means one thousandth of a unit.', `One ampere is 1,000 mA, so multiply ${amount} by 1,000.`], `${amount} A × 1,000 = ${format(amount * 1000)} mA. The physical current is unchanged.`);
    }
    case 'gain': {
      const gain = choose([3, 6, 10], seed), answer = effectiveRadiatedPower(10, gain);
      return numeric(`In a lossless example a 10 W transmitter feeds an antenna with ${gain} dBd gain. Using ERP = 10 × 10^(gain/10), calculate the ERP relative to a dipole.`, { gain }, answer, 'W', [['Transmitter power', '10 W'], ['Antenna gain', `${gain} dBd`], ['ERP', '? W']], ['ERP compares radiation in the favoured direction with a dipole reference.', `Substitute ERP = 10 × 10^(${gain}/10). This is an optional engineering calculation.`], `ERP = 10 × 10^(${gain}/10) = ${format(answer)} W. The transmitter still supplies 10 W; gain concentrates radiation rather than creating energy.`);
    }
    case 'radio': return action('The transmitter was switched off while a nearby friend was listening. Restore transmission without changing the distance between the stations.', { transmitter: 'on', distance: 2 }, ['Find the source of the transmitted signal.', 'Turn the transmitter on and keep the distance at 2 steps.'], 'The signal source must be on. The distance remains 2 illustrative steps; the bars do not predict a real coverage range.', { transmitter: 'off', distance: 2 });
    case 'modulation': {
      const fm = seed % 2 === 0;
      return action(fm ? 'Configure a signal whose message changes instantaneous frequency while the amplitude remains constant. Use a non-zero message strength of 0.6.' : 'Configure a signal whose message changes the carrier amplitude. Use a non-zero message strength of 0.6.', { mode: fm ? 'fm' : 'am', depth: 0.6 }, ['Distinguish amplitude (wave height) from frequency (rate of oscillation).', `Choose ${fm ? 'frequency' : 'amplitude'} modulation and set message strength to 0.6.`], `${fm ? 'FM changes instantaneous frequency while maintaining the ideal amplitude.' : 'AM changes amplitude according to the message.'} A zero message strength would leave an unmodulated carrier.`);
    }
    case 'signal': {
      const messageMissing = seed % 2 === 0;
      return action(messageMissing ? 'The receiver detects a carrier, but the intended changing message is absent. Select the fault that explains this result in the simplified transmitter.' : 'The carrier source has stopped generating its repeating RF signal. Select the corresponding fault, rather than merely removing the message.', { missing: messageMissing ? 'modulator' : 'oscillator' }, ['Carrier generation and adding information are separate functions.', messageMissing ? 'Inspect the information input to the modulator.' : 'Inspect the oscillator.'], messageMissing ? 'The missing message input leaves the ideal RF path intact, so an unmodulated carrier remains. Removing a complete physical RF stage would be a different fault.' : 'With the oscillator off, this model has no carrier to modulate or amplify. Merely losing the message input would leave the carrier present.');
    }
    case 'matching': return action('The station indicates a mismatch. In this lossless-line model, find the SWR setting with no reflected power.', { swr: 1 }, ['At a perfect match, the reflected wave is absent.', 'The minimum possible SWR is 1:1.'], 'At SWR 1:1 the reflected fraction is zero. A real installation still needs checks; this control does not automatically adjust an antenna.');
    case 'propagation': return action('Two hill-walking stations use VHF/UHF. Show their direct path when a hill blocks it; do not substitute an assumed ionospheric return.', { band: 'vhf', obstacle: 'blocked' }, ['Choose the relevant frequency/path model first.', 'Choose VHF/UHF and put the hill across the direct path.'], 'The direct path is obstructed in this qualitative VHF/UHF example. It does not prove that no other real propagation path can exist.');
    case 'rules': return action('You already have a pass certificate. Show the step at which the UK operating licence is issued.', { stage: 3 }, ['The examination body and licensing authority have different roles.', 'Find the Ofcom licence step after the pass certificate.'], 'Ofcom issues the operating licence and call sign. The pass certificate is evidence of the qualification, not the operating licence.');
    case 'interference': return action('Keep the example transmitter level at 3. Test whether suppression on the affected cable changes the illustrated interference, changing only that remedy.', { power: 3, filter: 'on' }, ['Keep the source level constant for a fair comparison.', 'Apply cable suppression with relative transmitter level 3.'], 'The illustrated interference decreases with suppression while source level stays fixed. Real interference requires investigation; the numerical bars are not a diagnosis.', { power: 3, filter: 'off' });
    case 'safety': return action(`The scene shows: ${activity.context?.[0] || 'a station hazard'}. Apply the safer arrangement in the illustration before proceeding.`, { safe: 'safe' }, ['Identify the highlighted hazard before acting.', activity.context?.[1] || 'Address the hazard; obtain qualified help where needed.'], `${activity.context?.[1] || 'Address the hazard and obtain appropriate help.'} The picture does not certify a real station as safe.`);
    case 'operating': return action('You have listened and checked that the frequency is free. Show the next step at which you make your call and identify your station.', { step: 2 }, ['Follow the order; listening comes before calling.', 'The call-and-identify stage follows the free-frequency check.'], 'Call and identify after listening and checking that the frequency is free. Then listen for a reply; keep to applicable identification requirements.');
    case 'connection': return action(activity.topic === 'Connectors' ? 'The accessible RF connection in this drawing is separated. Restore its connection in the model before considering a tuning fault.' : 'The ideal torch has a good battery and lamp, but the switch path is open. Restore the conducting path so current can flow.', { connected: 'on' }, ['A source alone does not establish a complete conducting path.', 'Close the illustrated connection.'], activity.topic === 'Connectors' ? 'A joined RF path is distinct from tuning. Real connectors must also have appropriate impedance, screening and termination.' : 'Closing the ideal path lets current flow. The open-path fault had stopped current while the battery voltage remained.');
    case 'series': return action('One lamp has failed open. Arrange the two lamps so the other lamp can still have its own complete supply path, and keep the first lamp open.', { layout: 'parallel', fault: 'open' }, ['A single shared series path is broken by either open lamp.', 'Use separate parallel branches, retaining the open-lamp fault.'], 'In parallel the working lamp retains its complete branch. With the first branch open, that branch draws zero while the second lamp still operates in this ideal model.');
    case 'powerType': return action('A voltage repeatedly reverses polarity over time. Select the supply type that represents that behaviour.', { supply: 'ac' }, ['Compare the sign of voltage over time.', 'Alternating current is associated with repeatedly alternating polarity.'], 'The AC example repeatedly reverses polarity. This is a normalised trace, not an instruction for handling mains wiring.');
    case 'symbols': {
      const item = choose([['capacitor', 'two equal parallel plates'], ['battery', 'unequal long and short line pairs'], ['switch', 'a deliberate break with a movable contact'], ['resistor', 'a rectangle representing resistance']], seed);
      return action(`Find the component represented by ${item[1]} in the course diagram convention.`, { component: item[0] }, ['Identify the electrical symbol by its structure, not by the size of the drawing.', `Inspect the ${item[0]} component. Other symbol conventions also exist.`], `The ${item[0]} is represented here by ${item[1]}. Symbols express electrical roles rather than physical dimensions.`);
    }
    case 'digital': {
      const samples = choose([6, 8, 12], seed);
      return action(`The same time window initially contains ${samples} samples. Double the number of equally spaced samples without changing the window.`, { samples: samples * 2 }, ['Doubling the count gives twice as many sample instants within the same view.', `Set the sample count to ${samples} × 2.`], `${samples} × 2 = ${samples * 2} samples in the same window. This illustration does not model quantisation or specify a real sampling rate.`, { samples });
    }
    case 'tuner': {
      const music = seed % 2 === 0;
      return action(`Both fictional transmitters remain on: news at 100 MHz and music at 104 MHz. Tune to the exact centre of the ${music ? 'music' : 'news'} programme.`, { tuning: music ? 104 : 100 }, ['Tuning selects the wanted signal; it does not turn the other transmitter off.', `Select ${music ? '104' : '100'} MHz.`], `The example ${music ? 'music' : 'news'} centre is ${music ? '104' : '100'} MHz. Both transmitted signals continue to exist; the receiver selects one.`, { tuning: 102 });
    }
    case 'keying': return action('Represent a continuous carrier-on interval in the visible HI Morse example. Set the HI pattern and close the carrier key.', { message: 'hi', key: 'down' }, ['The message selects the visible timing pattern; the key controls carrier presence.', 'Select HI and key down.'], 'A closed key corresponds to carrier on in this simplified CW illustration. Morse information is carried by the timing of on/off intervals, without audio here.');
    case 'sidebands': {
      const upper = seed % 2 === 0;
      return action(`Retain only the ${upper ? 'upper' : 'lower'} sideband in the single-tone spectrum, suppressing the carrier and other sideband.`, { sideband: upper ? 'usb' : 'lsb' }, ['AM retains a carrier and both sidebands in this model.', `Choose ${upper ? 'USB' : 'LSB'}.`], `${upper ? 'USB retains the upper sideband' : 'LSB retains the lower sideband'} in this illustration. Real speech occupies a band of frequencies rather than one spectral line.`);
    }
    case 'feedpoint': {
      const end = seed % 2 === 0;
      return action(`Show an antenna whose feeder connects at the ${end ? 'end of the wire' : 'middle of the wire'}.`, { feed: end ? 'end' : 'centre' }, ['The feed position is where energy is coupled into the wire.', `Choose the ${end ? 'end-fed' : 'centre-fed'} arrangement.`], `${end ? 'An end-fed arrangement connects at the end and needs appropriate matching and a return path.' : 'A centre-fed arrangement connects at the centre.'} The diagram does not calculate impedance or certify an installation.`);
    }
    case 'balun': return action('Inspect the unbalanced side of the balanced-to-unbalanced transition: the coaxial feeder.', { inspect: 'unbalanced' }, ['A balanced dipole has two corresponding arms.', 'The coaxial feeder is the unbalanced arrangement.'], 'The coaxial feeder is the unbalanced side. A suitable balun provides a transition; its actual design determines matching and common-mode behaviour.');
    case 'polarisation': return action('In this ideal direct-path example, align the two linear antenna polarisations for maximum coupling.', { angle: 0 }, ['Consider the relative orientation rather than changing transmitter power.', 'Parallel linear polarisations have a relative angle of zero degrees.'], 'At 0° the ideal direct-path coupling is maximum. Reflected paths and real antenna patterns can change actual reception.');
    case 'callsign': {
      const region = choose(['wales', 'scotland', 'ni'], seed), words = { wales: 'Wales', scotland: 'Scotland', ni: 'Northern Ireland' };
      return action(`Place the fictional Foundation station M7LAB in ${words[region]}, operating portable in a field. Show the appropriate optional regional locator and portable suffix.`, { region, place: 'field' }, ['Location and operating situation affect different parts of the example identification.', `Choose ${words[region]} and portable in a field.`], 'This example uses the appropriate optional regional locator and /P suffix. These conventions do not replace the licence conditions or identification requirements.');
    }
    case 'policy': return action('A station is being used for paid delivery coordination. Change the purpose to personal, non-commercial radio experimentation.', { purpose: 'hobby' }, ['Amateur operation is intended for self-training, communication and technical investigation on a personal non-commercial basis.', 'Choose personal experimentation.'], 'Personal non-commercial experimentation fits this amateur-purpose check. Other licence conditions still need to be met.');
    case 'supervision': return action('An unlicensed learner is operating under the licensee’s direct physical supervision. Arrange the scene so the licensee can regain control at the station.', { supervisor: 'present' }, ['The responsible licensee needs to be physically present for this arrangement.', 'Bring the supervising licensee to the station.'], 'The licensee is physically present and can regain control. The licensee remains responsible for compliance with all applicable conditions.');
    case 'userService': return action('This exercise is conducted by a Responder. Select the activity context that requires checking the specific User Service provision.', { event: 'responder' }, ['An ordinary club practice session is a different context.', 'Choose the Responder-led operation or exercise.'], 'A Responder-led operation or exercise requires checking the applicable User Service provision and arrangements. Merely selecting the picture does not authorise real operation.');
    case 'bandplan': {
      const width = choose([10, 20, 30], seed);
      return { ...action(`The other signal occupies 70–80 on this arbitrary scale. Keep your signal width at ${width} and move its centre until the occupied intervals do not overlap.`, { centre: 35, width }, ['The edges are centre ± half the width; checking only the centre is insufficient.', `With width ${width}, a centre at 35 keeps the upper edge below 70.`], `Your signal edges must lie clear of 70–80 while width remains ${width}. Touching an edge is not overlapping in this ideal interval model; real operation needs the actual band plan and suitable separation.`, { centre: 75, width }), rule: 'no-overlap' };
    }
    case 'referenceCheck': return action('You have found the relevant frequency row in EX307. Now inspect the part that can add geographic or other restrictions to that row.', { parameter: 'notes' }, ['A frequency row cannot be read safely in isolation from its notes.', 'Read the footnotes and restrictions as well as the other columns.'], 'Footnotes and restrictions can qualify the allocation or power entry. Read the whole actual row and all applicable notes; this diagram supplies no permission or limits.');
    case 'exposure': return action('A visitor is approaching the transmitting antenna. Show the position with greater separation while a real exposure assessment is arranged.', { position: 'far' }, ['Greater separation is represented by the farther position.', 'Select the farther position; this picture calculates no safe distance.'], 'The farther position increases separation in the illustration. It does not establish compliance: assess the actual antenna, power, duty cycle and access arrangements.');
    case 'phonetic': {
      const pair = choose([['M7CAT', 'Mike Seven Charlie Alfa Tango'], ['M7DOG', 'Mike Seven Delta Oscar Golf'], ['M7FOX', 'Mike Seven Foxtrot Oscar X-ray']], seed);
      return action(`Decode this written spelling sequence and enter the fictional call sign: ${pair[1]}.`, { word: pair[0] }, ['Each standard spelling word represents one letter; the number is a digit.', `Read the first letters, retaining the digit Seven as 7.`], `${pair[1]} represents ${pair[0]}. Standard spelling words help distinguish similar letters; no audio is required.`);
    }
    case 'report': {
      const readability = choose([2, 3, 4], seed), strength = choose([8, 5, 2], seed);
      return action(`Your chosen readability judgment is ${readability} out of 5; the separate strength judgment is ${strength} out of 9. Enter those observations as an RS report.`, { readability, strength }, ['Readability and strength are separate judgments with different scales.', `The first digit is ${readability}; the second is ${strength}.`], `The RS report is ${readability}${strength}. A strong signal need not be easily readable; the drawing does not make a calibrated receiver measurement.`);
    }
    case 'repeater': return action('The direct path between the example stations is obstructed. Enable the illustrated hilltop relay path.', { relay: 'on' }, ['A repeater receives and retransmits using an appropriate input/output arrangement.', 'Enable the repeater path.'], 'The hilltop repeater provides the illustrated relay. Real use needs correct frequencies, access settings and usable paths in both directions.');
    case 'satellite': return { ...action('Move the spacecraft from below the horizon to any point strictly above it during this schematic pass.', { position: 90 }, ['The horizon crossings are at 0° and 180° in this example geometry.', 'Choose a position greater than 0° and less than 180°.'], 'A position strictly between the horizon crossings lies above the schematic horizon. It does not establish a usable contact; timing, Doppler and equipment need real predictions.', { position: -20 }), rule: 'above-horizon' };
    case 'contactRecord': return action('You already recorded the date, time and station worked. Show the record section where the frequency and mode are added.', { step: 2 }, ['A station identifier alone does not record how the contact was made.', 'Find the frequency-and-mode section.'], 'Frequency and mode make the operating details useful for a later review. This example does not claim that all contacts must routinely be logged.');
    case 'conduct': return action('An interruption is escalating into an argument. Choose the response that avoids prolonging it.', { response: 'leave' }, ['Continued replies can prolong the interruption.', 'Disengage and continue appropriately; follow advice on serious incidents.'], 'Disengaging avoids extending the argument. Appropriate reporting or other advice may still be needed for serious incidents.');
    case 'travel': return action('You checked destination rules and qualification recognition. Before transmitting, show the next check: whether the destination requires authorisation.', { step: 2 }, ['Recognition of a qualification and operating authorisation are separate checks.', 'Inspect the authorisation-requirements step.'], 'Check the destination authority’s authorisation requirements before operating. A UK licence does not automatically permit operation in every country.');
    default: throw new RangeError(`No transfer challenge exists for ${activity.kind}.`);
  }
}

export function evaluateChallenge(challenge, values, numericAnswer) {
  if (challenge.answer !== null) {
    const valid = typeof numericAnswer === 'number' || (typeof numericAnswer === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(numericAnswer.trim()));
    const value = valid ? Number(numericAnswer) : NaN;
    if (!Number.isFinite(value)) return { correct: false, feedback: `Enter a finite number in ${challenge.unit}. Keep the displayed unit; do not type a unit into the number field.` };
    const correct = Math.abs(value - challenge.answer) <= Math.max(0.00051, Math.abs(challenge.answer) * Number.EPSILON * 4);
    return { correct, feedback: correct ? challenge.solution : `The number does not match this model. Check the given values, requested quantity and ${challenge.unit} unit. Use a hint for the next calculation step.` };
  }
  if (!values || typeof values !== 'object' || Array.isArray(values)) return { correct: false, feedback: 'Set the model controls before checking.' };
  for (const control of challenge.controls) {
    const value = values[control.key];
    if ((control.type === 'select' && !control.options.some(([option]) => option === value)) || (control.type === 'text' && (typeof value !== 'string' || value.length > control.maxLength)) || (control.type === 'range' && (!Number.isFinite(value) || value < control.min || value > control.max || Math.abs((value - control.min) / control.step - Math.round((value - control.min) / control.step)) > 0.00001))) return { correct: false, feedback: 'A control value is outside the available choices. Reset this task and try again.' };
  }
  let correct;
  if (challenge.rule === 'no-overlap') correct = values.width === challenge.target.width && !signalsOverlap(values.centre, values.width);
  else if (challenge.rule === 'above-horizon') correct = values.position > 0 && values.position < 180;
  else correct = Object.entries(challenge.target).every(([key, target]) => typeof target === 'number' ? Math.abs(values[key] - target) < 0.00001 : typeof values[key] === 'string' && values[key].trim().toUpperCase() === String(target).toUpperCase());
  return { correct, feedback: correct ? challenge.solution : 'The current arrangement does not yet meet the task. Compare the requested outcome with the diagram; a hint gives one next step.' };
}

export function challengeDiagram(challenge, values = challenge.initial) {
  if (!challenge.givens) return drawActivity({ ...challenge.activity, scenario: undefined }, values, challenge.initial);
  const labels = challenge.givens.map(([name, value], index) => `<g transform="translate(${25 + index * 205},80)"><rect width="180" height="105" rx="8" class="signal-block"/><text x="90" y="35" text-anchor="middle">${esc(name)}</text><text x="90" y="73" text-anchor="middle">${esc(value)}</text></g>`).join('');
  return `<svg viewBox="0 0 640 235" role="img" aria-label="Task givens; the unknown quantity is marked with a question mark"><path d="M205 132h25m180 0h25" class="wire"/>${labels}<text x="320" y="220" text-anchor="middle" class="muted">Given values only. Calculate the unknown.</text></svg>`;
}
