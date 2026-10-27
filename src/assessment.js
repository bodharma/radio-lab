import { questions } from './question-bank.js';
import { BANK_VERSION, EXAM, SECTIONS } from './exam-spec.js';

export const ASSESSMENT_KEY = 'radio-lab-assessment-v1';
export const questionById = new Map(questions.map(question => [question.id, question]));
const modes = ['topic', 'module', 'mock', 'weak'];
const isAnswer = value => value === null || (Number.isInteger(value) && value >= 0 && value < 4);
const object = value => value && typeof value === 'object' && !Array.isArray(value);

export function validateBank(course) {
  const topics = new Set(course.modules.flatMap(module => module.topics.map(id => course.documents.find(document => document.id === id)?.stem)));
  if (questionById.size !== questions.length) throw new Error('Duplicate practice question ID.');
  for (const question of questions) {
    if (!topics.has(question.topic) || !/^[1-8][A-Z]\d+$/.test(question.code) || question.section !== question.code[0] || question.options.length !== 4 || new Set(question.options).size !== 4 || question.options.some(option => typeof option !== 'string' || !option.trim()) || !Number.isInteger(question.correct) || question.correct < 0 || question.correct > 3 || !question.prompt || !question.explanation) throw new Error(`Invalid practice question: ${question.id}`);
  }
  for (const topic of topics) if (questions.filter(question => question.topic === topic).length < 2) throw new Error(`Missing topic checks: ${topic}`);
  for (const section of SECTIONS) if (questions.filter(question => question.section === section.id).length < section.count) throw new Error(`Too few questions for ${section.name}`);
}

export function shuffled(values, random = Math.random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createSession({ mode, topics = [], ids = [], label = '', timed = false }, now = Date.now(), random = Math.random) {
  if (!modes.includes(mode)) throw new Error('Unknown practice mode.');
  let selected;
  if (mode === 'mock') {
    selected = SECTIONS.flatMap(section => {
      const pool = questions.filter(question => question.section === section.id);
      const codes = shuffled([...new Set(pool.map(question => question.code))], random);
      if (codes.length < section.count) throw new Error(`Insufficient syllabus variety: ${section.name}`);
      return codes.slice(0, section.count).map(code => shuffled(pool.filter(question => question.code === code), random)[0]);
    });
  } else selected = questions.filter(question => mode === 'weak' ? ids.includes(question.id) : topics.includes(question.topic));
  if (!selected?.length) throw new Error('There are no questions for this selection.');
  return {
    id: `${now}-${Math.floor(random() * 1e12)}`, mode, label: String(label).slice(0, 160),
    paper: shuffled(selected, random).map(question => ({ id: question.id, order: shuffled([0, 1, 2, 3], random), answer: null, flag: false, checked: false })),
    index: 0, startedAt: now, deadline: mode === 'mock' && timed ? now + EXAM.minutes * 60000 : null, submittedAt: null, reason: null,
  };
}

function validSession(session) {
  if (!object(session) || !modes.includes(session.mode) || typeof session.id !== 'string' || typeof session.label !== 'string' || session.label.length > 160 || !Number.isFinite(session.startedAt) || session.startedAt < 0 || !Array.isArray(session.paper) || !session.paper.length || session.paper.length > questions.length || !Number.isInteger(session.index) || session.index < 0 || session.index >= session.paper.length) return false;
  if (session.deadline !== null && (session.mode !== 'mock' || session.deadline !== session.startedAt + EXAM.minutes * 60000)) return false;
  if (session.submittedAt !== null && (!Number.isFinite(session.submittedAt) || session.submittedAt < session.startedAt)) return false;
  if (![null, 'submitted', 'time'].includes(session.reason) || (session.submittedAt === null) !== (session.reason === null)) return false;
  if (new Set(session.paper.map(item => item?.id)).size !== session.paper.length) return false;
  for (const item of session.paper) {
    if (!object(item) || !questionById.has(item.id) || !Array.isArray(item.order) || item.order.length !== 4 || item.order.toSorted().join(',') !== '0,1,2,3' || !item.order.every(Number.isInteger) || !isAnswer(item.answer) || typeof item.flag !== 'boolean' || typeof item.checked !== 'boolean' || (item.checked && item.answer === null) || (session.mode === 'mock' && item.checked)) return false;
  }
  if (session.mode === 'mock' && (session.paper.length !== EXAM.questions || SECTIONS.some(section => session.paper.filter(item => questionById.get(item.id).section === section.id).length !== section.count))) return false;
  return true;
}

export function loadAssessment(storage) {
  const fresh = { version: 1, bankVersion: BANK_VERSION, stats: {}, history: [], session: null };
  try {
    const raw = storage.getItem(ASSESSMENT_KEY);
    if (!raw) return { state: fresh, writable: true, warning: '' };
    const state = JSON.parse(raw);
    if (!object(state) || state.version !== 1 || state.bankVersion !== BANK_VERSION || !object(state.stats) || !Array.isArray(state.history) || state.history.length > 10 || (state.session !== null && !validSession(state.session))) throw new Error('Invalid assessment record');
    for (const [id, entry] of Object.entries(state.stats)) if (!questionById.has(id) || !object(entry) || typeof entry.correct !== 'boolean' || !Number.isInteger(entry.attempts) || entry.attempts < 1 || entry.attempts > 1000000 || !Number.isFinite(entry.at)) throw new Error('Invalid question history');
    for (const entry of state.history) if (!object(entry) || !modes.includes(entry.mode) || typeof entry.label !== 'string' || entry.label.length > 160 || !Number.isFinite(entry.at) || !Number.isInteger(entry.total) || entry.total < 1 || entry.total > questions.length || !Number.isInteger(entry.correct) || entry.correct < 0 || entry.correct > entry.total) throw new Error('Invalid result history');
    return { state, writable: true, warning: '' };
  } catch {
    return { state: fresh, writable: false, warning: 'Saved assessment data could not be opened or uses another question-bank version. This session will not overwrite it.' };
  }
}

export function scoreSession(session) {
  const sections = SECTIONS.map(section => ({ ...section, total: 0, correct: 0 }));
  let correct = 0, unanswered = 0;
  for (const item of session.paper) {
    const question = questionById.get(item.id);
    const right = item.answer === question.correct;
    if (right) correct++;
    if (item.answer === null) unanswered++;
    const section = sections.find(section => section.id === question.section);
    section.total++;
    if (right) section.correct++;
  }
  return { correct, total: session.paper.length, unanswered, passed: session.mode === 'mock' && correct >= EXAM.pass, sections: sections.filter(section => section.total) };
}

function recordAnswer(state, item, now) {
  const previous = state.stats[item.id];
  state.stats[item.id] = { correct: item.answer === questionById.get(item.id).correct, attempts: Math.min(1000000, (previous?.attempts || 0) + 1), at: now };
}

export function finishSession(state, now = Date.now(), reason = 'submitted') {
  const session = state.session;
  if (!session || session.submittedAt !== null) return false;
  const expired = session.deadline !== null && now >= session.deadline;
  session.submittedAt = expired ? session.deadline : now;
  session.reason = expired ? 'time' : reason;
  for (const item of session.paper) if (!item.checked && (session.mode === 'mock' || item.answer !== null)) recordAnswer(state, item, session.submittedAt);
  const score = scoreSession(session);
  state.history.unshift({ mode: session.mode, label: session.label, total: score.total, correct: score.correct, at: session.submittedAt });
  state.history = state.history.slice(0, 10);
  return true;
}

export function expireSession(state, now = Date.now()) {
  return state.session?.submittedAt === null && state.session.deadline !== null && now >= state.session.deadline ? finishSession(state, now, 'time') : false;
}

export function answerQuestion(state, index, answer, now = Date.now()) {
  const session = state.session;
  if (!session || session.submittedAt !== null || expireSession(state, now) || !Number.isInteger(index) || !session.paper[index] || !isAnswer(answer)) return false;
  const item = session.paper[index];
  if (item.checked) return false;
  item.answer = answer;
  return true;
}

export function checkAnswer(state, index, now = Date.now()) {
  const session = state.session, item = session?.paper[index];
  if (!session || session.mode === 'mock' || session.submittedAt !== null || !item || item.answer === null || item.checked) return false;
  item.checked = true;
  recordAnswer(state, item, now);
  return true;
}

export function topicStatus(state, topic) {
  const items = questions.filter(question => question.topic === topic);
  const checked = items.filter(question => state.stats[question.id]);
  return { total: items.length, answered: checked.length, correct: checked.filter(question => state.stats[question.id].correct).length, weak: checked.some(question => !state.stats[question.id].correct) };
}
