import { questionById } from './assessment.js';
import { isReviewed } from './progress.js';
import { activityFor } from './activities.js';

export const LEARNING_KEY = 'radio-lab-learning-v1';
export const DAY = 86400000;
export const PHASES = [
  { name: 'Recall earlier topics', minutes: 10 },
  { name: 'Explore the next topic', minutes: 20 },
  { name: 'Take a break', minutes: 5 },
  { name: 'Solve a new situation', minutes: 15 },
  { name: 'Check and explain', minutes: 10 },
];
export function studyPhases(duration = 60) {
  if (![5, 15, 60].includes(duration)) throw new RangeError('Choose a 5, 15 or 60-minute session.');
  const schedule = duration === 5 ? [[0, 1], [3, 3], [4, 1]] : PHASES.map((_, index) => [index, duration === 15 ? [3, 5, 1, 4, 2][index] : PHASES[index].minutes]);
  return schedule.map(([kind, minutes]) => ({ ...PHASES[kind], kind, minutes }));
}
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const time = value => Number.isFinite(value) && value >= 0 && value <= 8.64e15;
const integer = (value, max) => Number.isInteger(value) && value >= 0 && value <= max;
export const freshLearning = () => ({ version: 1, reviews: {}, seenQuestions: {}, coach: {}, tasks: {}, session: null, pilot: [] });

export function loadLearning(storage, course) {
  const fresh = freshLearning();
  const topics = new Set(course.modules.flatMap(module => module.topics));
  try {
    const raw = storage.getItem(LEARNING_KEY);
    if (!raw) return { state: fresh, writable: true, warning: '' };
    const state = JSON.parse(raw);
    if (!object(state) || state.version !== 1 || !['reviews', 'seenQuestions', 'coach', 'tasks'].every(key => object(state[key])) || !Array.isArray(state.pilot) || state.pilot.length > 20) throw Error();
    for (const [id, review] of Object.entries(state.reviews)) {
      if (!topics.has(id) || !object(review) || !time(review.at) || !time(review.due) || !integer(review.successes, 4) || !integer(review.attempts, 1000000) || typeof review.correct !== 'boolean' || !['sure', 'unsure', 'guess'].includes(review.confidence) || typeof review.hash !== 'string') throw Error();
    }
    for (const [id, at] of Object.entries(state.seenQuestions)) if (!questionById.has(id) || !time(at)) throw Error();
    for (const [id, chat] of Object.entries(state.coach)) {
      if (!topics.has(id) || !object(chat) || typeof chat.draft !== 'string' || chat.draft.length > 1500 || !Array.isArray(chat.turns) || chat.turns.length > 6 || chat.turns.some(turn => !object(turn) || !['learner', 'coach'].includes(turn.role) || typeof turn.text !== 'string' || turn.text.length > 6000)) throw Error();
    }
    for (const [id, task] of Object.entries(state.tasks)) {
      if (!topics.has(id) || !object(task) || !integer(task.seed, 1000000) || !integer(task.level, 2) || typeof task.hash !== 'string' || !object(task.values) || Object.keys(task.values).length > 12 || Object.values(task.values).some(value => !(typeof value === 'string' && value.length <= 100) && !Number.isFinite(value)) || typeof task.answer !== 'string' || task.answer.length > 80 || !integer(task.hint, 2) || typeof task.checked !== 'boolean' || typeof task.correct !== 'boolean' || !['sure', 'unsure', 'guess'].includes(task.confidence)) throw Error();
    }
    const session = state.session;
    if (session !== null && (!object(session) || !time(session.started) || !integer(session.phase, 4) || !topics.has(session.topicId) || !Array.isArray(session.reviewIds) || session.reviewIds.length > 3 || session.reviewIds.some(id => !topics.has(id)) || !integer(session.reviewIndex, session.reviewIds.length) || !Array.isArray(session.completed) || session.completed.length > 5 || new Set(session.completed).size !== session.completed.length || session.completed.some(phase => !integer(phase, 4)) || typeof session.finished !== 'boolean')) throw Error();
    if (session !== null && ((session.duration !== undefined && ![5, 15, 60].includes(session.duration)) || session.phase >= studyPhases(session.duration).length || session.completed.some(phase => phase >= studyPhases(session.duration).length))) throw Error();
    for (const entry of state.pilot) if (!object(entry) || !time(entry.at) || !['pre', 'post', 'delayed', 'official', 'feedback', 'teacher'].includes(entry.stage) || typeof entry.note !== 'string' || entry.note.length > 1500 || (entry.score !== null && !integer(entry.score, 1000)) || (entry.total !== null && (!integer(entry.total, 1000) || entry.total === 0)) || (entry.score !== null && (entry.total === null || entry.score > entry.total))) throw Error();
    return { state, writable: true, warning: '' };
  } catch {
    return { state: fresh, writable: false, warning: 'Saved learning data could not be opened. It is preserved; changes in this session cannot be saved.' };
  }
}

export function recordReview(state, document, correct, confidence = 'unsure', now = Date.now()) {
  if (typeof correct !== 'boolean' || !['sure', 'unsure', 'guess'].includes(confidence) || !time(now)) return;
  const old = state.reviews[document.id];
  const previous = old?.hash === document.hash ? old : null;
  const spaced = !previous || now - previous.at >= 18 * 3600000;
  // shortcut: fixed 1/3/7/14-day intervals; calibrate against retention data before claiming personal optimisation.
  const successes = !correct || confidence === 'guess' ? 0 : Math.min(4, (previous?.successes || 0) + (spaced ? 1 : 0));
  const days = confidence === 'sure' ? [1, 1, 3, 7, 14][successes] : 1;
  const due = correct ? now + days * DAY : now + 10 * 60000;
  state.reviews[document.id] = { at: now, due: previous && correct && !spaced && previous.correct ? Math.min(previous.due, due) : due, successes, attempts: Math.min(1000000, (previous?.attempts || 0) + 1), correct, confidence, hash: document.hash };
}

export function absorbExamEvidence(state, stats, course) {
  const byStem = new Map(course.documents.map(document => [document.stem, document]));
  const changed = new Map();
  for (const [id, evidence] of Object.entries(stats).sort((a, b) => a[1].at - b[1].at)) {
    if (!time(evidence.at)) continue;
    if ((state.seenQuestions[id] ?? -1) >= evidence.at) continue;
    const document = byStem.get(questionById.get(id)?.topic);
    if (!document) continue;
    state.seenQuestions[id] = evidence.at;
    changed.set(document.id, { document, at: Math.max(changed.get(document.id)?.at || 0, evidence.at) });
  }
  for (const { document, at } of changed.values()) {
    const topicResults = Object.entries(stats).filter(([id]) => questionById.get(id)?.topic === document.stem);
    recordReview(state, document, topicResults.every(([, evidence]) => evidence.correct), 'unsure', at);
  }
  return changed.size > 0;
}

export function dueTopics(state, course, records = {}, now = Date.now()) {
  return course.modules.flatMap(module => module.topics).filter(id => {
    const review = state.reviews[id], document = course.documents.find(document => document.id === id);
    return review ? review.hash !== document.hash || review.due <= now : reviewedTopic(course, id, records);
  }).sort((a, b) => (state.reviews[a]?.due || 0) - (state.reviews[b]?.due || 0));
}

function reviewedTopic(course, id, records) {
  const document = course.documents.find(document => document.id === id);
  const module = course.modules.find(module => module.topics.includes(id));
  return isReviewed(document, records[id], activityFor(document, module.number));
}

export function makeStudySession(state, course, records = {}, now = Date.now(), duration = 60) {
  studyPhases(duration);
  if (state.session && !state.session.finished) return state.session;
  const ordered = course.modules.flatMap(module => module.topics);
  const reviewIds = dueTopics(state, course, records, now).slice(0, 3);
  const nextTopic = ordered.find(id => !reviewedTopic(course, id, records)) || reviewIds[0] || ordered[0];
  const topicId = duration === 5 ? reviewIds[0] || nextTopic : nextTopic;
  state.session = { started: now, phase: 0, duration, topicId, reviewIds, reviewIndex: 0, completed: [], finished: false };
  return state.session;
}
