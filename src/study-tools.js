export const TOOLS_KEY = 'radio-lab-tools-v1';
export const FEEDBACK_REASONS = { term: 'A term is unfamiliar', step: 'A step is missing or unclear', example: 'I need another everyday example', diagram: 'The diagram and explanation do not connect', other: 'Something else' };
export const FOCUS_VIEWS = ['experiment', 'explanation', 'check', 'discussion'];
export const freshTools = () => ({ version: 1, settings: { focus: false, focusView: 'experiment', duration: 60 }, feedback: [], reference: { mode: 'guided', index: 0, step: 0, answers: {}, checked: false, reflection: '', history: [] } });
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, limit) => typeof value === 'string' && value.length <= limit;
const integer = (value, maximum) => Number.isInteger(value) && value >= 0 && value <= maximum;
const time = value => Number.isFinite(value) && value >= 0 && value <= 8.64e15;

export function loadTools(storage, course) {
  try {
    const raw = storage.getItem(TOOLS_KEY);
    if (!raw) return { state: freshTools(), writable: true, warning: '' };
    const state = JSON.parse(raw), ids = new Set(course.documents.map(document => document.id));
    if (!object(state) || state.version !== 1 || !object(state.settings) || typeof state.settings.focus !== 'boolean' || !FOCUS_VIEWS.includes(state.settings.focusView) || ![5, 15, 60].includes(state.settings.duration) || !Array.isArray(state.feedback) || state.feedback.length > 100) throw Error();
    for (const entry of state.feedback) {
      if (!object(entry) || !text(entry.id, 100) || !time(entry.at) || (entry.topicId !== null && !ids.has(entry.topicId)) || !text(entry.title, 160) || !text(entry.route, 220) || !['lesson', 'practice', 'reference', 'assessment', 'session', 'tools'].includes(entry.area) || !Object.hasOwn(FEEDBACK_REASONS, entry.reason) || !text(entry.note, 1500) || !text(entry.prompt, 500) || !Array.isArray(entry.controls) || entry.controls.length > 12 || entry.controls.some(control => !object(control) || !text(control.key, 60) || !text(control.label, 100) || !text(control.value, 100) || !['select', 'range', 'number', 'text'].includes(control.type))) throw Error();
    }
    const ref = state.reference;
    if (!object(ref) || !['guided', 'independent'].includes(ref.mode) || !integer(ref.index, 5) || !integer(ref.step, 4) || typeof ref.checked !== 'boolean' || !object(ref.answers) || Object.keys(ref.answers).length > 8 || Object.entries(ref.answers).some(([key, value]) => !/^[a-zA-Z][a-zA-Z0-9]*$/.test(key) || !text(value, 120)) || !Array.isArray(ref.history) || ref.history.length > 20 || ref.history.some(entry => !object(entry) || !integer(entry.index, 5) || !time(entry.at) || typeof entry.correct !== 'boolean' || !['guided', 'independent'].includes(entry.mode))) throw Error();
    if (ref.reflection !== undefined && !text(ref.reflection, 1500)) throw Error();
    return { state, writable: true, warning: '' };
  } catch {
    return { state: freshTools(), writable: false, warning: 'Saved study-tool data could not be opened. It is preserved; changes in this session cannot be saved.' };
  }
}

export function feedbackExport(state, includePrivate = false) {
  return { format: 'radio-lab-feedback', version: 1, includesPrivateText: includePrivate, entries: state.feedback.map(({ at, title, topicId, area, reason, route, controls, prompt, note }) => ({ date: new Date(at).toISOString().slice(0, 10), title, topicId, area, reason, route, controls: controls.filter(control => includePrivate || control.type !== 'text'), prompt, ...(includePrivate ? { note } : {}) })) };
}
