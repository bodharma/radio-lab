import { guideFor, explainState } from './teaching.js';

export function coachQuestion(activity) {
  return `Describe what happens in this ${activity.title.toLowerCase()} experiment. What causes the result? Include what changes and what stays the same. You can also write the exact part you do not understand.`;
}

const misconceptions = [
  { kinds: ['signal'], pattern: /(?:oscillator|carrier).{0,35}(?:creat|add|contain|carr).{0,15}(?:voice|message)|(?:modulat|message).{0,25}(?:off|missing|disconnect).{0,45}(?:no carrier|carrier stops|no rf)/i, response: 'Separate the RF source from the information input. The oscillator generates the carrier. Losing only the message input leaves a carrier in this model; switching off the oscillator removes its source.', follow: 'If a receiver detects RF but recovers no intended message, which of those two functions could still be working?' },
  { kinds: ['battery', 'connection'], pattern: /(?:no|zero|lose|loses|lost|disappear|stop).{0,15}voltage|voltage.{0,25}(?:zero|disappear|stop|used up)/i, response: 'Check voltage and current separately. Opening the load path stops current through it. The ideal cell still has a potential difference between its terminals.', follow: 'With two 1.5 V cells and the load disconnected, what voltage remains across the pack, and what current flows through the open load?' },
  { kinds: ['circuit', 'series', 'power'], pattern: /current.{0,25}(?:used up|consumed|runs out|less after)|resistan\w*.{0,25}(?:increase|higher|more).{0,25}(?:increase|higher|more).{0,10}current/i, response: 'In a single steady series path, current is the same on both sides of a resistor. Energy is transferred to heat. At fixed voltage, I = V/R: greater resistance gives smaller current.', follow: 'Keep 12 V fixed. If resistance changes from 6 Ω to 12 Ω, how do current and heating change?' },
  { kinds: ['wave', 'antenna'], pattern: /(?:higher|increase|more).{0,15}frequen\w*.{0,30}(?:longer|increase|bigger).{0,15}(?:wave|antenna)|(?:higher|increase).{0,15}frequen\w*.{0,25}(?:always|automatically).{0,15}(?:farther|further|range)/i, response: 'For the same wave speed, wavelength = speed/frequency. A higher frequency gives a shorter wavelength. Range also depends on the path, antennas, power, noise and other conditions.', follow: 'If frequency doubles while wave speed stays the same, what happens to wavelength and an ideal quarter-wave element?' },
  { kinds: ['modulation'], pattern: /\bfm\b.{0,25}(?:height|amplitude).{0,20}(?:changes|varies)|\bam\b.{0,25}(?:spacing|frequency).{0,20}(?:changes|varies)/i, response: 'Compare the quantity being varied by the message. Ideal AM varies carrier amplitude. Ideal FM varies instantaneous frequency while its amplitude stays constant.', follow: 'Which trace feature would you inspect to distinguish AM from FM: height or spacing, and why?' },
  { kinds: ['rules'], pattern: /(?:pass|certificate).{0,30}(?:automatically|already|enough|can transmit|permission)/i, response: 'Passing the examination and holding an operating licence are separate steps. RSGB examination evidence supports an application; Ofcom issues the UK amateur licence and its conditions apply.', follow: 'After receiving a pass certificate, what must be in place before you operate under your own licence?' },
];

export function respondToExplanation(activity, values, text, turn = 0) {
  const guide = guideFor(activity);
  const clean = String(text).trim().slice(0, 1500);
  if (clean.length < 8) return { category: 'clarify', text: 'Give me one complete thought or name the part that is unclear. For example: “I can see the lamp went out, but why is voltage still present?”', followUp: coachQuestion(activity) };
  const match = misconceptions.find(item => item.kinds.includes(activity.kind) && item.pattern.test(clean));
  if (match) return { category: 'possible-misconception', text: `Your wording may mix up two ideas. ${match.response} If I have read your wording incorrectly, compare your intended meaning with this distinction.`, followUp: match.follow };
  if (/\b(?:confus|unclear|don.t understand|don.t know|what is|what does|why)\b/i.test(clean)) {
    const words = new Set(clean.toLowerCase().match(/[a-z0-9]+/g) || []);
    const term = guide.terms.find(([name]) => name.toLowerCase().split(/[^a-z0-9]+/).some(word => word.length > 2 && words.has(word))) || guide.terms[turn % guide.terms.length];
    return { category: 'explain', text: `${term[0]}: ${term[1]} ${guide.steps[turn % guide.steps.length]}`, followUp: `Where does this fit in the current diagram? Explain its input and the result it produces; you can name the part that still feels unclear.` };
  }
  const follows = [activity.scenario.transfer, `Apply the same idea to a different situation. ${guide.mistake}`, `Explain the connection between ${guide.terms[0][0]} and ${guide.terms[1][0]}. What would change if the first condition changed?`];
  return { category: 'compare', text: `Compare your explanation with the model: ${explainState(activity, values)} I cannot certify a free-text explanation as correct. Check that your cause, changed quantity and unchanged quantity agree with that sequence.`, followUp: follows[turn % follows.length] };
}
