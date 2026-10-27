import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { freshTools, loadTools, TOOLS_KEY, feedbackExport } from '../src/study-tools.js';
import { studyPhases, makeStudySession, freshLearning, loadLearning, LEARNING_KEY } from '../src/learning.js';

const course = JSON.parse(await readFile(new URL('../public/course.json', import.meta.url), 'utf8'));

test('5/15/60-minute plans have their declared budget and a short pass does not imply full-topic completion', () => {
  for (const duration of [5, 15, 60]) {
    const phases = studyPhases(duration), state = freshLearning();
    assert.equal(phases.reduce((sum, phase) => sum + phase.minutes, 0), duration);
    const session = makeStudySession(state, course, {}, 100000, duration);
    session.phase = phases.length - 1;
    assert.equal(session.duration, duration);
    assert.equal(loadLearning({ getItem: key => key === LEARNING_KEY ? JSON.stringify(state) : null }, course).writable, true);
    assert.equal(session.finished, false);
  }
  assert.deepEqual(studyPhases(5).map(phase => phase.kind), [0, 3, 4]);
  assert.throws(() => studyPhases(10), RangeError);
  const old = freshLearning(); makeStudySession(old, course, {}, 100000); delete old.session.duration;
  assert.equal(loadLearning({ getItem: () => JSON.stringify(old) }, course).writable, true);
});

test('study helper state is bounded and corrupt records cannot be silently overwritten', () => {
  const state = freshTools();
  assert.equal(loadTools({ getItem: () => JSON.stringify(state) }, course).writable, true);
  for (const mutate of [
    value => { value.settings.duration = 9; },
    value => { value.settings.focusView = 'hidden'; },
    value => { value.reference.index = 6; },
    value => { value.feedback.push({ topicId: 'unknown' }); },
    value => { value.reference.reflection = 'x'.repeat(1501); },
  ]) {
    const value = freshTools(); mutate(value);
    assert.equal(loadTools({ getItem: () => JSON.stringify(value) }, course).writable, false);
  }
  assert.equal(loadTools({ getItem: () => '{broken' }, course).writable, false);
  assert.notEqual(TOOLS_KEY, LEARNING_KEY);
});

test('feedback exports preserve topic and model context while omitting private writing and text controls by default', () => {
  const state = freshTools();
  state.feedback.push({ id: 'entry', at: 1800000000000, title: 'Phonetic Alphabet', topicId: 'Topics/Phonetic_Alphabet', area: 'lesson', reason: 'term', route: 'Topics/Phonetic_Alphabet', controls: [{ key: 'word', label: 'Word', value: 'PRIVATE', type: 'text' }, { key: 'power', label: 'Power', value: '12', type: 'number' }], prompt: 'Explain the example', note: 'PRIVATE note' });
  const normal = feedbackExport(state), full = feedbackExport(state, true);
  assert.doesNotMatch(JSON.stringify(normal), /PRIVATE/);
  assert.equal(normal.entries[0].controls[0].value, '12');
  assert.equal(normal.entries[0].topicId, 'Topics/Phonetic_Alphabet');
  assert.equal(Object.hasOwn(normal.entries[0], 'at'), false);
  assert.equal(full.entries[0].note, 'PRIVATE note');
  assert.equal(full.entries[0].controls[0].value, 'PRIVATE');
});
