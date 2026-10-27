import { STORAGE_KEY, loadProgress } from './progress.js';
import { ASSESSMENT_KEY, loadAssessment } from './assessment.js';
import { LEARNING_KEY, loadLearning } from './learning.js';
import { TOOLS_KEY, loadTools } from './study-tools.js';
import { BANK_VERSION } from './exam-spec.js';
import { activityFor } from './activities.js';
import { createChallenge } from './challenges.js';
import { REFERENCE_TASKS } from './reference-trainer.js';

export const BACKUP_KEYS = [STORAGE_KEY, ASSESSMENT_KEY, LEARNING_KEY, TOOLS_KEY];
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const previews = new WeakMap();
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const time = value => Number.isFinite(value) && value >= 0 && value <= 8.64e15;
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const numericText = value => typeof value === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim()) && Number.isFinite(Number(value));
const size = text => new TextEncoder().encode(text).byteLength;
const fail = message => { throw new Error(message); };

function shape(value, required, optional = []) {
  return object(value) && required.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => required.includes(key) || optional.includes(key));
}

function context(course) {
  const documents = new Map(course.documents.map(document => [document.id, document]));
  const modules = new Map(course.modules.flatMap(module => module.topics.map(id => [id, module.number])));
  const activities = new Map([...documents].map(([id, document]) => [id, activityFor(document, modules.get(id))]));
  return { documents, activities };
}

function validValues(values, activity, initial = null) {
  const keys = [...activity.controls.map(control => control.key), ...Object.keys(activity.fixed || {})];
  if (!shape(values, keys)) return false;
  if (initial && Object.entries(initial).some(([key, value]) => values[key] !== value)) return false;
  for (const control of activity.controls) {
    const value = values[control.key];
    if (control.type === 'select' && !control.options.some(([option]) => option === value)) return false;
    if (control.type === 'text' && (typeof value !== 'string' || value.length > control.maxLength || !/^[A-Z0-9/]*$/.test(value))) return false;
    if (control.type === 'range' && (!Number.isFinite(value) || value < control.min || value > control.max || Math.abs((value - control.min) / control.step - Math.round((value - control.min) / control.step)) > 0.00001)) return false;
  }
  return Object.entries(activity.fixed || {}).every(([key, value]) => values[key] === value);
}

function validateProgress(state, ctx, changed) {
  if (!shape(state, ['version', 'activeId', 'records']) || state.version !== 1 || typeof state.activeId !== 'string' || (state.activeId !== '' && !ctx.documents.has(state.activeId)) || !object(state.records)) fail('The lesson-progress record has an incompatible shape or unknown topic.');
  for (const [id, record] of Object.entries(state.records)) {
    const document = ctx.documents.get(id), activity = ctx.activities.get(id);
    if (!document || !shape(record, ['hash', 'sections', 'values', 'before', 'part', 'seen', 'reflection', 'changes', 'reviewed'], ['activity']) || !hash(record.hash) || !integer(record.sections, 1, 10000) || !integer(record.part, 0, record.sections - 1) || !Array.isArray(record.seen) || record.seen.length > record.sections || new Set(record.seen).size !== record.seen.length || record.seen.some(index => !integer(index, 0, record.sections - 1)) || typeof record.reflection !== 'string' || record.reflection.length > 4000 || !integer(record.changes, 0, 100000) || typeof record.reviewed !== 'boolean') fail(`Invalid lesson progress for ${id}.`);
    const storedActivity = record.activity && record.activity !== activity.kind ? [...ctx.activities.values()].find(item => item.kind === record.activity) : activity;
    if (!storedActivity || (record.activity !== undefined && typeof record.activity !== 'string') || !validValues(record.values, storedActivity) || !validValues(record.before, storedActivity)) fail(`Invalid saved controls for ${id}.`);
    if (record.hash !== document.hash || record.sections !== document.chunks.length || (record.activity && record.activity !== activity.kind)) changed.add(id);
  }
}

function validateAssessment(state) {
  if (!shape(state, ['version', 'bankVersion', 'stats', 'history', 'session'])) fail('The assessment record has unknown or missing fields.');
  for (const entry of Object.values(state.stats || {})) if (!shape(entry, ['correct', 'attempts', 'at']) || !time(entry.at)) fail('Invalid assessment evidence.');
  for (const entry of state.history || []) if (!shape(entry, ['mode', 'label', 'total', 'correct', 'at']) || !time(entry.at)) fail('Invalid assessment history.');
  if (state.session !== null) {
    const session = state.session;
    if (!shape(session, ['id', 'mode', 'label', 'paper', 'index', 'startedAt', 'deadline', 'submittedAt', 'reason']) || typeof session.id !== 'string' || !/^\d+-\d+$/.test(session.id) || session.id.length > 80 || !time(session.startedAt) || (session.deadline !== null && !time(session.deadline)) || (session.submittedAt !== null && !time(session.submittedAt))) fail('Invalid assessment session.');
    for (const item of session.paper || []) if (!shape(item, ['id', 'order', 'answer', 'flag', 'checked'])) fail('Invalid assessment question record.');
  }
}

function validateLearning(state, ctx, changed) {
  if (!shape(state, ['version', 'reviews', 'seenQuestions', 'coach', 'tasks', 'session', 'pilot'])) fail('The learning record has unknown or missing fields.');
  for (const [id, review] of Object.entries(state.reviews || {})) {
    if (!shape(review, ['at', 'due', 'successes', 'attempts', 'correct', 'confidence', 'hash']) || !hash(review.hash)) fail(`Invalid recall record for ${id}.`);
    if (review.hash !== ctx.documents.get(id)?.hash) changed.add(id);
  }
  for (const chat of Object.values(state.coach || {})) {
    if (!shape(chat, ['draft', 'turns'])) fail('Invalid tutor conversation.');
    for (const turn of chat.turns || []) if (!shape(turn, ['role', 'text'])) fail('Invalid tutor turn.');
  }
  for (const [id, task] of Object.entries(state.tasks || {})) {
    if (!shape(task, ['hash', 'seed', 'level', 'values', 'answer', 'hint', 'checked', 'correct', 'confidence']) || !hash(task.hash)) fail(`Invalid practice task for ${id}.`);
    const activity = ctx.activities.get(id);
    if (!activity) fail(`Unknown practice topic ${id}.`);
    const challenge = createChallenge(activity, task.level, task.seed);
    const valid = challenge.answer === null ? validValues(task.values, activity) : shape(task.values, Object.keys(challenge.initial)) && Object.entries(challenge.initial).every(([key, value]) => task.values[key] === value);
    if (!valid) fail(`Invalid practice values for ${id}.`);
    if (task.hash !== ctx.documents.get(id).hash) changed.add(id);
  }
  if (state.session !== null && (!shape(state.session, ['started', 'phase', 'topicId', 'reviewIds', 'reviewIndex', 'completed', 'finished'], ['duration']) || (state.session.duration !== undefined && ![5, 15, 60].includes(state.session.duration)))) fail('Invalid study-session fields.');
  for (const entry of state.pilot || []) if (!shape(entry, ['at', 'stage', 'note', 'score', 'total'])) fail('Invalid pilot observation.');
}

function validateTools(state) {
  if (!shape(state, ['version', 'settings', 'feedback', 'reference']) || !shape(state.settings, ['focus', 'focusView', 'duration']) || !shape(state.reference, ['mode', 'index', 'step', 'answers', 'checked', 'history'], ['reflection']) || (state.reference.reflection !== undefined && (typeof state.reference.reflection !== 'string' || state.reference.reflection.length > 1500))) fail('The study-tools record has unknown or missing fields.');
  for (const entry of state.feedback) {
    if (!shape(entry, ['id', 'at', 'topicId', 'title', 'route', 'area', 'reason', 'note', 'prompt', 'controls'])) fail('Invalid feedback fields.');
    for (const control of entry.controls) if (!shape(control, ['key', 'label', 'value', 'type']) || (['number', 'range'].includes(control.type) && control.value !== '' && !numericText(control.value))) fail('Invalid feedback control fields.');
  }
  const task = REFERENCE_TASKS[state.reference.index];
  for (const [key, value] of Object.entries(state.reference.answers)) {
    const field = task?.fields.find(item => item.key === key);
    if (!field || (value !== '' && (field.type === 'number' ? !numericText(value) : !field.options.some(([option]) => option === value)))) fail('Invalid reference-practice answer fields.');
  }
  for (const entry of state.reference.history) if (!shape(entry, ['index', 'at', 'correct', 'mode'])) fail('Invalid reference-practice history.');
}

function validateRecords(records, course) {
  if (!shape(records, BACKUP_KEYS)) fail('The backup must contain exactly the four Radio Lab storage records.');
  const ctx = context(course), changed = new Set();
  const store = { getItem: key => records[key] === null ? null : JSON.stringify(records[key]) };
  const loaders = [() => loadProgress(store), () => loadAssessment(store), () => loadLearning(store, course), () => loadTools(store, course)];
  for (let index = 0; index < BACKUP_KEYS.length; index++) {
    const key = BACKUP_KEYS[index];
    if (records[key] === null) continue;
    if (!object(records[key]) || !loaders[index]().writable) fail(`Saved data in ${key} is corrupt or incompatible. No records were changed. Save a raw rescue copy before repairing it.`);
  }
  if (records[STORAGE_KEY]) validateProgress(records[STORAGE_KEY], ctx, changed);
  if (records[ASSESSMENT_KEY]) validateAssessment(records[ASSESSMENT_KEY]);
  if (records[LEARNING_KEY]) validateLearning(records[LEARNING_KEY], ctx, changed);
  if (records[TOOLS_KEY]) validateTools(records[TOOLS_KEY]);
  return { ctx, warnings: [...changed].map(id => `Source changed for ${id}. Original hashes are preserved; source-dependent reviews and tasks must be checked again.`) };
}

function redact(records, ctx) {
  for (const [id, record] of Object.entries(records[STORAGE_KEY]?.records || {})) {
    record.reflection = '';
    const current = ctx.activities.get(id), activity = record.activity && record.activity !== current.kind ? [...ctx.activities.values()].find(item => item.kind === record.activity) : current;
    for (const control of activity.controls) if (control.type === 'text') { record.values[control.key] = control.initial; record.before[control.key] = control.initial; record.changes = 0; record.reviewed = false; }
  }
  const assessment = records[ASSESSMENT_KEY];
  if (assessment) {
    if (assessment.session) assessment.session.label = 'Saved practice attempt';
    for (const entry of assessment.history) entry.label = 'Saved practice attempt';
  }
  const learning = records[LEARNING_KEY];
  if (learning) {
    for (const chat of Object.values(learning.coach)) { chat.draft = ''; chat.turns = []; }
    for (const [id, task] of Object.entries(learning.tasks)) {
      const activity = ctx.activities.get(id), challenge = createChallenge(activity, task.level, task.seed);
      if (challenge.answer === null || !numericText(task.answer)) { if (task.answer !== '') { task.checked = false; task.correct = false; } task.answer = ''; }
      for (const control of activity.controls) if (control.type === 'text') { task.values[control.key] = control.initial; task.checked = false; task.correct = false; }
    }
    for (const entry of learning.pilot) entry.note = '';
  }
  const tools = records[TOOLS_KEY];
  if (tools) {
    for (const entry of tools.feedback) { entry.note = ''; entry.controls = entry.controls.filter(control => control.type !== 'text'); }
    if (Object.hasOwn(tools.reference, 'reflection')) tools.reference.reflection = '';
  }
}

export function createBackup(storage, course, { includePrivate = false } = {}, now = Date.now()) {
  if (typeof includePrivate !== 'boolean' || !time(now)) fail('Choose whether to include private writing and use a valid export date.');
  const records = {};
  for (const key of BACKUP_KEYS) {
    try { const raw = storage.getItem(key); records[key] = raw === null ? null : JSON.parse(raw); }
    catch { fail(`Cannot export ${key}: its saved data could not be read. Current data is unchanged. Download a raw rescue copy before repairing it.`); }
  }
  const { ctx } = validateRecords(records, course);
  if (!includePrivate) redact(records, ctx);
  const backup = { format: 'radio-lab-backup', version: 1, bankVersion: BANK_VERSION, createdAt: now, includePrivate, records };
  return inspectBackup(JSON.stringify(backup), course).backup;
}

export function inspectBackup(text, course) {
  if (typeof text !== 'string' || size(text) > MAX_BACKUP_BYTES) fail('Choose a Radio Lab JSON backup no larger than 5 MB.');
  let backup;
  try { backup = JSON.parse(text); } catch { fail('The selected file is not valid JSON. No records were changed.'); }
  if (!shape(backup, ['format', 'version', 'bankVersion', 'createdAt', 'includePrivate', 'records']) || backup.format !== 'radio-lab-backup' || backup.version !== 1 || backup.bankVersion !== BANK_VERSION || !time(backup.createdAt) || typeof backup.includePrivate !== 'boolean') fail('This file uses an unsupported backup format or question-bank version. No records were changed.');
  const { ctx, warnings } = validateRecords(backup.records, course);
  if (!backup.includePrivate) {
    const stripped = JSON.parse(JSON.stringify(backup.records));
    redact(stripped, ctx);
    if (JSON.stringify(stripped) !== JSON.stringify(backup.records)) fail('This file claims to omit private writing but still contains it. Export it again using the intended privacy option.');
  }
  const progress = backup.records[STORAGE_KEY], assessment = backup.records[ASSESSMENT_KEY], learning = backup.records[LEARNING_KEY];
  const summary = { savedRecords: BACKUP_KEYS.filter(key => backup.records[key] !== null).length, lessonTopics: Object.keys(progress?.records || {}).length, checkedQuestions: Object.keys(assessment?.stats || {}).length, assessmentAttempts: assessment?.history.length || 0, recallTopics: Object.keys(learning?.reviews || {}).length, practiceTasks: Object.keys(learning?.tasks || {}).length, pilotObservations: learning?.pilot.length || 0, includesPrivateWriting: backup.includePrivate };
  const inspection = { backup, summary, warnings };
  previews.set(inspection, { text: JSON.stringify(backup), records: Object.fromEntries(BACKUP_KEYS.map(key => [key, backup.records[key] === null ? null : JSON.stringify(backup.records[key])])) });
  return inspection;
}

export function restoreBackup(storage, inspection) {
  const preview = previews.get(inspection);
  if (!preview || JSON.stringify(inspection.backup) !== preview.text) fail('Preview this backup again before confirming the restore. No records were changed.');
  const previous = {};
  try { for (const key of BACKUP_KEYS) previous[key] = storage.getItem(key); }
  catch { fail('Current storage could not be read. Restore was cancelled before changing any records.'); }
  const write = (key, raw) => raw === null ? storage.removeItem(key) : storage.setItem(key, raw);
  try { for (const key of BACKUP_KEYS) write(key, preview.records[key]); }
  catch {
    const failed = [];
    for (const key of BACKUP_KEYS) try { write(key, previous[key]); } catch { try { if (storage.getItem(key) !== previous[key]) failed.push(key); } catch { failed.push(key); } }
    const error = new Error(failed.length ? `Restore failed and this browser prevented rollback of ${failed.join(', ')}. Keep the raw rescue download; do not continue studying until storage works and that copy can be restored.` : 'Restore failed. All four previous records were restored. Free browser storage or allow local storage, then preview the backup and try again.');
    error.partialRollback = failed.length > 0;
    error.rollbackFailed = failed;
    throw error;
  }
  return { restored: BACKUP_KEYS.length };
}
