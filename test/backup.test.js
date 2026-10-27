import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createBackup, inspectBackup, restoreBackup, BACKUP_KEYS, MAX_BACKUP_BYTES } from '../src/backup.js';
import { STORAGE_KEY, topicRecord } from '../src/progress.js';
import { ASSESSMENT_KEY, createSession, loadAssessment, answerQuestion, checkAnswer } from '../src/assessment.js';
import { LEARNING_KEY, freshLearning, recordReview, makeStudySession } from '../src/learning.js';
import { TOOLS_KEY, freshTools } from '../src/study-tools.js';
import { activityFor } from '../src/activities.js';
import { createChallenge } from '../src/challenges.js';

const course = JSON.parse(await readFile(new URL('../public/course.json', import.meta.url), 'utf8'));
const document = stem => course.documents.find(item => item.stem === stem);
const model = stem => activityFor(document(stem), course.modules.find(module => module.topics.includes(document(stem).id))?.number);
const now = 1800000000000;

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}

function populated() {
  const records = {};
  for (const stem of ['Batteries', 'Phonetic_Alphabet']) {
    const record = topicRecord(document(stem), model(stem));
    record.reflection = 'PRIVATE reflection'; record.changes = 1; record.reviewed = true;
    if (stem === 'Phonetic_Alphabet') record.values.word = record.before.word = 'PRIVATE';
    records[document(stem).id] = record;
  }
  const progress = { version: 1, activeId: document('Batteries').id, records };
  const assessment = loadAssessment(storage()).state;
  assessment.session = createSession({ mode: 'topic', topics: ['Batteries'], label: 'PRIVATE label' }, now, () => 0.5);
  answerQuestion(assessment, 0, 0, now); checkAnswer(assessment, 0, now);
  const learning = freshLearning();
  recordReview(learning, document('Batteries'), true, 'sure', now);
  makeStudySession(learning, course, records, now);
  learning.coach[document('Batteries').id] = { draft: 'PRIVATE draft', turns: [{ role: 'learner', text: 'PRIVATE explanation' }, { role: 'coach', text: 'PRIVATE echo' }] };
  for (const stem of ['Batteries', 'Phonetic_Alphabet']) {
    const challenge = createChallenge(model(stem), 2, 0);
    learning.tasks[document(stem).id] = { hash: document(stem).hash, seed: 0, level: 2, values: { ...challenge.initial }, answer: challenge.answer === null ? '' : String(challenge.answer), hint: 0, checked: true, correct: true, confidence: 'sure' };
    if (stem === 'Phonetic_Alphabet') learning.tasks[document(stem).id].values.word = 'PRIVATE';
  }
  learning.pilot.push({ at: now, stage: 'post', score: 2, total: 3, note: 'PRIVATE pilot' });
  const tools = freshTools();
  tools.feedback.push({ id: 'example-feedback', at: now, topicId: document('Phonetic_Alphabet').id, title: 'Phonetic Alphabet', route: '#Topics/Phonetic_Alphabet', area: 'lesson', reason: 'term', note: 'PRIVATE feedback', prompt: 'Spell a call sign', controls: [{ key: 'word', label: 'Word', value: 'PRIVATE', type: 'text' }, { key: 'power', label: 'Power', value: '12', type: 'range' }] });
  tools.reference.answers = { row: '7000-7100' }; tools.reference.checked = true; tools.reference.reflection = 'PRIVATE reference explanation';
  tools.reference.history.push({ index: 1, at: now, correct: true, mode: 'independent' });
  return storage(Object.fromEntries([[STORAGE_KEY, progress], [ASSESSMENT_KEY, assessment], [LEARNING_KEY, learning], [TOOLS_KEY, tools]].map(([key, value]) => [key, JSON.stringify(value)])));
}

test('full backup roundtrips all four stores including sessions, recalls, scores and private writing', () => {
  const source = populated(), before = new Map(source.values);
  const backup = createBackup(source, course, { includePrivate: true }, now);
  const inspection = inspectBackup(JSON.stringify(backup), course);
  assert.equal(inspection.summary.savedRecords, 4);
  assert.equal(inspection.summary.practiceTasks, 2);
  assert.equal(inspection.summary.includesPrivateWriting, true);
  assert.equal(inspection.warnings.length, 0);
  const destination = storage({ unrelated: 'keep' });
  assert.deepEqual(restoreBackup(destination, inspection), { restored: 4 });
  for (const key of BACKUP_KEYS) assert.deepEqual(JSON.parse(destination.getItem(key)), JSON.parse(source.getItem(key)));
  assert.equal(destination.getItem('unrelated'), 'keep');
  assert.deepEqual(source.values, before);
});

test('default backup removes every private writing path while retaining numeric answers and result history', () => {
  const source = populated(), snapshot = new Map(source.values);
  const backup = createBackup(source, course, {}, now);
  assert.doesNotMatch(JSON.stringify(backup), /PRIVATE/);
  assert.equal(backup.includePrivate, false);
  assert.equal(backup.records[LEARNING_KEY].tasks[document('Batteries').id].answer, '4.5');
  assert.equal(backup.records[LEARNING_KEY].tasks[document('Batteries').id].checked, true);
  assert.equal(backup.records[LEARNING_KEY].tasks[document('Phonetic_Alphabet').id].checked, false);
  assert.equal(backup.records[STORAGE_KEY].records[document('Phonetic_Alphabet').id].reviewed, false);
  assert.equal(backup.records[TOOLS_KEY].feedback[0].controls.length, 1);
  assert.equal(backup.records[TOOLS_KEY].reference.history.length, 1);
  assert.deepEqual(backup.records[TOOLS_KEY].reference.answers, { row: '7000-7100' });
  assert.equal(backup.records[TOOLS_KEY].reference.checked, true);
  assert.equal(backup.records[TOOLS_KEY].reference.reflection, '');
  assert.equal(backup.records[ASSESSMENT_KEY].stats[backup.records[ASSESSMENT_KEY].session.paper[0].id].correct, true);
  assert.deepEqual(source.values, snapshot);
  assert.equal(inspectBackup(JSON.stringify(backup), course).summary.includesPrivateWriting, false);
  const tools = freshTools(); tools.reference.index = 1; tools.reference.answers = { power: '1e13' };
  const largeNumericAnswer = storage({ [TOOLS_KEY]: JSON.stringify(tools) });
  for (const includePrivate of [false, true]) assert.equal(createBackup(largeNumericAnswer, course, { includePrivate }, now).records[TOOLS_KEY].reference.answers.power, '1e13');
});

test('absence is preserved and an inspected empty backup removes only the four known records', () => {
  const backup = createBackup(storage(), course, {}, now);
  assert.ok(BACKUP_KEYS.every(key => backup.records[key] === null));
  const destination = populated(); destination.setItem('unrelated', 'keep');
  restoreBackup(destination, inspectBackup(JSON.stringify(backup), course));
  assert.ok(BACKUP_KEYS.every(key => destination.getItem(key) === null));
  assert.equal(destination.getItem('unrelated'), 'keep');
});

test('invalid JSON, versions, IDs, controls and extra fields fail before any restore write', () => {
  const backup = createBackup(populated(), course, { includePrivate: true }, now);
  const reject = change => { const value = structuredClone(backup); change(value); assert.throws(() => inspectBackup(JSON.stringify(value), course)); };
  assert.throws(() => inspectBackup('{', course), /valid JSON/);
  assert.throws(() => inspectBackup(' '.repeat(MAX_BACKUP_BYTES + 1), course), /5 MB/);
  assert.throws(() => inspectBackup('"' + 'é'.repeat(MAX_BACKUP_BYTES / 2) + '"', course), /5 MB/);
  reject(value => { value.version = 2; });
  reject(value => { value.includePrivate = false; });
  reject(value => { value.bankVersion = 'another-bank'; });
  reject(value => { value.records[ASSESSMENT_KEY].bankVersion = 'another-bank'; });
  reject(value => { value.records[STORAGE_KEY].activeId = 'Topics/Unknown'; });
  reject(value => { value.records[STORAGE_KEY].records['Topics/Unknown'] = value.records[STORAGE_KEY].records[document('Batteries').id]; });
  reject(value => { value.records[STORAGE_KEY].records[document('Batteries').id].values.cells = 900; });
  reject(value => { value.records[STORAGE_KEY].records[document('Batteries').id].values.extra = 'PRIVATE imported body'; });
  reject(value => { value.records[LEARNING_KEY].tasks[document('Batteries').id].values.cells = 900; });
  reject(value => { value.records[LEARNING_KEY].session.duration = 999; });
  reject(value => { value.records[LEARNING_KEY].coach[document('Batteries').id].lessonBody = 'Never export notes'; });
  reject(value => { value.records[TOOLS_KEY].feedback[0].controls[0].extra = 'PRIVATE'; });
  reject(value => { value.records[TOOLS_KEY].reference.index = 999; });
  reject(value => { value.records[TOOLS_KEY].reference.answers = { secret: 'PRIVATE' }; });
  reject(value => { value.records[ASSESSMENT_KEY].stats[value.records[ASSESSMENT_KEY].session.paper[0].id].at = -1; });
  reject(value => { value.records[ASSESSMENT_KEY].session.paper[0].order = [0, 0, 0, 0]; });
  const destination = populated(), snapshot = new Map(destination.values);
  assert.throws(() => restoreBackup(destination, { backup }), /Preview/);
  assert.deepEqual(destination.values, snapshot);
  const preview = inspectBackup(JSON.stringify(backup), course); preview.backup.records[TOOLS_KEY].settings.focus = true;
  assert.throws(() => restoreBackup(destination, preview), /Preview/);
  assert.deepEqual(destination.values, snapshot);
});

test('source changes retain original hashes and warn instead of claiming old reviews are current', () => {
  const backup = createBackup(populated(), course, { includePrivate: true }, now);
  backup.records[STORAGE_KEY].records[document('Batteries').id].hash = 'a'.repeat(64);
  backup.records[LEARNING_KEY].reviews[document('Batteries').id].hash = 'a'.repeat(64);
  const preview = inspectBackup(JSON.stringify(backup), course);
  assert.ok(preview.warnings.some(warning => warning.includes(document('Batteries').id)));
  assert.equal(preview.backup.records[STORAGE_KEY].records[document('Batteries').id].hash, 'a'.repeat(64));
});

test('corrupt existing records are never silently omitted or overwritten by export', () => {
  const source = populated(); source.setItem(LEARNING_KEY, '{broken');
  const snapshot = new Map(source.values);
  assert.throws(() => createBackup(source, course), /raw rescue copy/);
  assert.deepEqual(source.values, snapshot);
  source.setItem(LEARNING_KEY, JSON.stringify({ version: 99 }));
  assert.throws(() => createBackup(source, course), /corrupt or incompatible/);
});

test('restore failure rolls back every previous record and preserves unrelated data', () => {
  const preview = inspectBackup(JSON.stringify(createBackup(storage(), course, {}, now)), course);
  const destination = populated(), snapshot = new Map(destination.values);
  const remove = destination.removeItem;
  let failed = false;
  destination.removeItem = key => { if (!failed && key === LEARNING_KEY) { failed = true; throw Error('Storage unavailable'); } remove(key); };
  assert.throws(() => restoreBackup(destination, preview), error => error.partialRollback === false && /previous records were restored/.test(error.message));
  assert.deepEqual(destination.values, snapshot);
});

test('a failed rollback identifies the affected records and directs the user to the rescue copy', () => {
  const source = populated(), preview = inspectBackup(JSON.stringify(createBackup(source, course, { includePrivate: true }, now)), course);
  const destination = storage({ [STORAGE_KEY]: 'old lesson data', [ASSESSMENT_KEY]: 'old assessment data' });
  const write = destination.setItem;
  destination.setItem = (key, value) => {
    if ((key === ASSESSMENT_KEY && value !== 'old assessment data') || (key === STORAGE_KEY && value === 'old lesson data')) throw Error('Quota');
    write(key, value);
  };
  assert.throws(() => restoreBackup(destination, preview), error => error.partialRollback === true && error.rollbackFailed.includes(STORAGE_KEY) && /raw rescue download/.test(error.message));
  assert.equal(destination.getItem(ASSESSMENT_KEY), 'old assessment data');
});
