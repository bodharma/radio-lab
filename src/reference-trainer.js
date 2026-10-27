import { EXAM_SOURCES } from './exam-spec.js';

const source = (page, section) => ({
  title: `RSGB EX307, January 2026, page ${page}: ${section}`,
  url: `${EXAM_SOURCES.reference}#page=${page}`,
});

// Small authored reading exercises, checked against the official booklet on
// 27 October 2026. These selected facts do not reproduce its tables or grant
// operating permission. Keep the actual row, headings and notes available.
export const REFERENCE_TASKS = [
  {
    id: 'frequency-row-40m',
    title: 'Find a row when the units differ',
    scenario: 'An example frequency is 7.050 MHz. Find the page 2 schedule row containing it, where this part of the table uses kHz.',
    page: 2,
    lookup: { band: '40 m', frequency: '7.050 MHz', rowLabel: 'Schedule row containing 7050 kHz' },
    row: { frequency: '7000–7100 kHz', power: '25 W; separate airborne entry', definition: 'Power column headed peak envelope power', notes: 'Read service status and airborne conditions as well as the number.' },
    fields: [{ key: 'row', label: 'Which frequency row contains 7.050 MHz?', type: 'select', options: [['7000-7100', '7000–7100 kHz'], ['7100-7200', '7100–7200 kHz'], ['10100-10150', '10100–10150 kHz']], answer: '7000-7100' }],
    steps: [
      { title: 'Match the units', instruction: 'Open page 2 and find the frequency column. Express 7.050 MHz in the units used by these rows.', column: 'frequency', hint: 'There are 1000 kHz in 1 MHz, so 7.050 MHz is 7050 kHz.', explanation: '7050 is between the printed lower and upper limits of 7000 and 7100 kHz.' },
      { title: 'Read across the same row', instruction: 'Keep your place while moving across to the power entry. Notice the additional airborne text.', column: 'power', hint: 'Do not jump to the adjacent 7100–7200 kHz row.', explanation: 'The selected row shows a 25 W entry and a separate 500 mW EIRP airborne entry; those are different operating contexts.' },
    ],
    explanation: '7.050 MHz equals 7050 kHz, so the correct row is 7000–7100 kHz. Finding a row is the start of a check; its other columns and applicable conditions still matter.',
    source: source(2, 'Schedule 1, 7000–7100 kHz'),
  },
  {
    id: 'power-definition-136khz',
    title: 'Read the number and its power reference',
    scenario: 'A Foundation learner looks up 136 kHz for a ground-based example. Read both the power number and its printed radiation reference; do not assume every row says 25 W.',
    page: 2,
    lookup: { band: '2200 m', frequency: '136 kHz', rowLabel: '135.7–137.8 kHz schedule row' },
    row: { frequency: '135.7–137.8 kHz', power: '1 W', definition: 'ERP', notes: 'Secondary service; avoid interference to other services.' },
    fields: [
      { key: 'power', label: 'What power number is printed in watts?', type: 'number', answer: '1', unit: 'W' },
      { key: 'reference', label: 'Which radiation reference qualifies that power entry?', type: 'select', options: [['erp', 'ERP — effective radiated power'], ['eirp', 'EIRP — equivalent isotropically radiated power'], ['none', 'No radiation reference is printed']], answer: 'erp' },
    ],
    steps: [
      { title: 'Locate the low-frequency row', instruction: 'On page 2, find the frequency interval containing 136 kHz.', column: 'frequency', hint: 'Look near the top of the schedule, not in the MHz rows.', explanation: '136 kHz lies inside 135.7–137.8 kHz.' },
      { title: 'Read the power value', instruction: 'Trace across the same row to the maximum-power column and read the number in watts.', column: 'power', hint: 'Use the W figure, not the dBW figure beside it.', explanation: 'This row gives 1 W, rather than the common 25 W headline figure.' },
      { title: 'Keep the qualifier', instruction: 'Read the letters after the power entry. Keep that reference attached to the number.', column: 'definition', hint: 'The entry ends in ERP.', explanation: 'The value is 1 W ERP. ERP compares radiation in the relevant direction with a half-wave dipole reference; it is not simply a transmitter power setting.' },
    ],
    explanation: 'The row gives 1 W ERP. A number without its power reference can describe a different quantity. Antenna gain and feeder loss matter when relating transmitter output to ERP; the full conditions still apply.',
    source: source(2, 'Schedule 1, 135.7–137.8 kHz'),
  },
  {
    id: 'geographic-restriction-431mhz',
    title: 'Find the restriction before using a power number',
    scenario: 'An example station is operating 80 km from Charing Cross, London, and considers 431.5 MHz. Decide whether the named geographic exclusion applies to that operating position.',
    page: 2,
    lookup: { band: '70 cm', frequency: '431.5 MHz', rowLabel: '431–432 MHz schedule row' },
    row: { frequency: '431–432 MHz', power: '25 W', definition: 'ERP', notes: 'Use excluded inside a 100 km radius of Charing Cross, London.' },
    fields: [
      { key: 'radius', label: 'What exclusion radius is specified?', type: 'number', answer: '100', unit: 'km' },
      { key: 'restriction', label: 'Does this geographic exclusion apply at the given 80 km operating position?', type: 'select', options: [['applies', 'Yes — this position is inside the exclusion'], ['outside', 'No — this position is outside the exclusion'], ['power-override', 'No — lowering power removes this exclusion']], answer: 'applies' },
    ],
    steps: [
      { title: 'Keep the exact frequency row', instruction: 'On page 2, find the interval containing 431.5 MHz. Do not use the neighbouring 432–435 MHz entry.', column: 'frequency', hint: '431.5 is between 431 and 432.', explanation: 'The relevant entry is 431–432 MHz.' },
      { title: 'Read the condition in the status cell', instruction: 'Read the geographic wording beside the frequency. Here the restriction is in the service-status cell, rather than a numbered footnote.', column: 'notes', hint: 'Look for the radius measured from Charing Cross, London.', explanation: 'The exclusion radius is 100 km. The condition concerns the station’s operating position, not the operator’s home address.' },
      { title: 'Apply the condition before the power entry', instruction: 'Compare the given 80 km distance with the exclusion radius. Check whether the power entry overrides the condition.', column: 'power', hint: '80 km is less than 100 km; a power number does not cancel a geographic restriction.', explanation: 'The position is inside the exclusion. The 25 W ERP entry is not permission to operate there.' },
    ],
    explanation: 'The 100 km geographic exclusion applies at this 80 km position. A station outside it would still need all other applicable checks; this exercise grants no operating permission.',
    source: source(2, 'Schedule 1, 431–432 MHz status restriction'),
  },
  {
    id: 'calling-channels-2m',
    title: 'Follow the calling-channel note',
    scenario: 'Two learners are finding where a 2 m FM call is normally started, then checking the note for digital-voice callers. Read the calling entry and its numbered note together.',
    page: 3,
    lookup: { band: '2 m', rowLabel: 'FM calling entry and 2 m Note 12' },
    row: { frequency: '145.500 MHz; DV alternative 144.6125 MHz', power: 'No power limit is specified by this calling entry', definition: 'Calling-channel use, not a power schedule', notes: 'Note 12 directs DV calling away from the FM calling channel.' },
    fields: [
      { key: 'fm', label: 'Which frequency is identified for FM calling?', type: 'number', answer: '145.5', unit: 'MHz' },
      { key: 'dv', label: 'Which frequency does Note 12 point DV callers to?', type: 'number', answer: '144.6125', unit: 'MHz' },
    ],
    steps: [
      { title: 'Use the 2 m band plan', instruction: 'Open page 3 and use the 144 MHz / 2 m section, rather than the 14 MHz / 20 m section.', column: 'frequency', hint: 'Find the FM calling line within the 2 m simplex area.', explanation: 'The FM calling entry is 145.5000 MHz and points to Note 12.' },
      { title: 'Follow Note 12', instruction: 'Find Note 12 in the 2 m notes and read its guidance for digital voice.', column: 'notes', hint: 'The note asks DV callers to use a different frequency.', explanation: 'For DV calling the note identifies 144.6125 MHz, rather than the FM calling channel.' },
      { title: 'Distinguish use from permission', instruction: 'Identify what this band-plan line tells you, and which other table supplies licence power limits.', column: 'definition', hint: 'A calling-channel label describes use; page 2 is the licence-parameter schedule.', explanation: 'The band plan and the licence schedule answer different questions. A calling label does not waive identification, interference or other conditions.' },
    ],
    explanation: 'The booklet identifies 145.500 MHz for FM calling. Note 12 points DV callers to 144.6125 MHz. Follow the note as well as the line; these entries describe band-plan use, not a complete operating authorisation.',
    source: source(3, '2 m band plan, FM calling entry and Note 12'),
  },
  {
    id: 'bandwidth-20m',
    title: 'Read bandwidth rather than transmitter power',
    scenario: 'A learner checks the specimen 20 m band plan at 14.200 MHz. Read the necessary-bandwidth entry for the row containing that frequency, keeping its unit attached.',
    page: 3,
    lookup: { band: '20 m', frequency: '14.200 MHz', rowLabel: '14,125–14,300 kHz band-plan segment' },
    row: { frequency: '14,125–14,300 kHz', power: 'This band-plan column is bandwidth, not power', definition: 'Necessary bandwidth: 2.7 kHz', notes: 'Check usage annotations and the general band-plan notes too.' },
    fields: [{ key: 'bandwidth', label: 'What necessary bandwidth is listed for this segment?', type: 'number', answer: '2.7', unit: 'kHz' }],
    steps: [
      { title: 'Convert and locate', instruction: 'Open page 3, find the 20 m section and locate the row containing 14.200 MHz.', column: 'frequency', hint: '14.200 MHz is 14,200 kHz, between 14,125 and 14,300 kHz.', explanation: 'The correct band-plan row is 14,125–14,300 kHz.' },
      { title: 'Read the heading and unit', instruction: 'Read the necessary-bandwidth column. It is measured in frequency units, not watts.', column: 'definition', hint: 'The printed bandwidth value in this row is in kHz.', explanation: 'The row lists 2.7 kHz necessary bandwidth. That is 2700 Hz, not 2.7 W or the width of the entire segment.' },
      { title: 'Keep the usage notes', instruction: 'Read the usage text and check the general notes on page 2 before interpreting this selected entry.', column: 'notes', hint: 'Do not treat one bandwidth value as the complete licence or band plan.', explanation: 'Other usage annotations, adjacent activity and licence conditions remain relevant.' },
    ],
    explanation: 'The listed necessary bandwidth is 2.7 kHz. A bandwidth is a frequency width; transmitter power is a different quantity. Read the complete band-plan entry and applicable notes rather than treating this selected fact as permission.',
    source: source(3, '20 m band plan, 14,125–14,300 kHz'),
  },
  {
    id: 'allocation-broadcast-100mhz',
    title: 'Separate a service allocation from an amateur band',
    scenario: 'A receiver is tuned to 100 MHz. Use the page 4 frequency-allocation table to identify the service shown for that frequency; receiving a signal does not grant permission to transmit there.',
    page: 4,
    lookup: { band: 'VHF allocation table', frequency: '100 MHz', rowLabel: '87.5–108.0 MHz allocation' },
    row: { frequency: '87.5–108.0 MHz', power: 'No transmitter power permission is supplied here', definition: 'Broadcasting service', notes: 'An allocation category is different from an individual operating licence.' },
    fields: [{ key: 'service', label: 'Which service is shown for the interval containing 100 MHz?', type: 'select', options: [['broadcasting', 'Broadcasting'], ['amateur', 'Amateur and amateur satellite'], ['aeronautical', 'Aeronautical radionavigation']], answer: 'broadcasting' }],
    steps: [
      { title: 'Find the interval', instruction: 'Open page 4 and find the frequency interval containing 100 MHz.', column: 'frequency', hint: '100 is greater than 87.5 and less than 108.0.', explanation: 'Use the 87.5–108.0 MHz row.' },
      { title: 'Read the use column', instruction: 'Move across that row to the named use. Compare the use with the separate amateur allocation.', column: 'definition', hint: 'The amateur and amateur-satellite entry is at 144–146 MHz, not 100 MHz.', explanation: 'The 100 MHz example falls in the broadcasting allocation shown in this table.' },
    ],
    explanation: '100 MHz lies inside the listed 87.5–108.0 MHz broadcasting interval. Being within a receiver’s tuning range says nothing by itself about the learner’s transmission privileges.',
    source: source(4, 'Frequency allocation table, 87.5–108.0 MHz'),
  },
];

const numericPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

/** Mark only explicit booklet answers; a learner’s explanation is not auto-graded. */
export function gradeReference(task, answers) {
  const current = REFERENCE_TASKS.find(item => item.id === task?.id);
  if (!current) throw new RangeError('Choose a known reference exercise.');
  const record = answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {};
  const fields = current.fields.map(field => {
    const value = Object.hasOwn(record, field.key) ? record[field.key] : undefined;
    let correct = false;
    if (field.type === 'number') {
      const valid = typeof value === 'number' || (typeof value === 'string' && numericPattern.test(value.trim()));
      const number = valid ? Number(value) : NaN;
      const expected = Number(field.answer);
      correct = Number.isFinite(number) && Math.abs(number - expected) <= Number.EPSILON * Math.max(1, Math.abs(expected)) * 8;
    } else if (field.type === 'select') {
      correct = typeof value === 'string' && field.options.some(([option]) => option === value) && value === field.answer;
    }
    const label = field.type === 'select' ? field.options.find(([option]) => option === field.answer)?.[1] : `${field.answer} ${field.unit}`;
    return { key: field.key, correct, feedback: correct ? `Correct: ${label}.` : field.type === 'number' ? `Recheck this booklet entry. Enter a finite number in ${field.unit}, without typing the unit.` : 'Recheck the relevant row or note and choose one of the available entries.' };
  });
  return { correct: fields.every(field => field.correct), fields, explanation: current.explanation };
}
