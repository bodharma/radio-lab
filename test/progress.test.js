import test from 'node:test';
import assert from 'node:assert/strict';
import { activityFor } from '../src/activities.js';
import { loadProgress, topicRecord, isReviewed, canReview } from '../src/progress.js';

const document = { stem: 'Formula_Resistance', hash: 'new', chunks: ['one', 'two'] };
const activity = activityFor(document, 2);

test('corrupt or inaccessible storage cannot silently overwrite saved work', () => {
  assert.equal(loadProgress({ getItem: () => '{broken' }).writable, false);
  assert.equal(loadProgress({ getItem() { throw new Error('Denied'); } }).writable, false);
});

test('changed source requires a new review but keeps the learner’s reflection', () => {
  const record = topicRecord(document, activity, { hash: 'old', reviewed: true, reflection: 'My explanation', values: { voltage: 99 } });
  assert.equal(record.reviewed, false);
  assert.equal(record.reflection, 'My explanation');
  assert.equal(record.values.voltage, 12);
  assert.equal(isReviewed(document, { hash: 'old', reviewed: true }), false);
});

test('review requires every information section, an action and a written reflection', () => {
  const record = topicRecord(document, activity);
  record.seen = [0, 1]; record.changes = 1;
  assert.equal(canReview(document, record), false);
  record.reflection = 'Current fell when resistance increased.';
  assert.equal(canReview(document, record), true);
});

test('saved values and section indexes are checked before rendering', () => {
  const record = topicRecord(document, activity, { hash: 'new', sections: 2, values: { voltage: Infinity, resistance: -4 }, part: 500, seen: [0, 0, -1, 20], reviewed: false });
  assert.equal(record.part, 1);
  assert.deepEqual(record.seen, [0]);
  assert.equal(record.values.resistance, 6);
});

test('a changed experiment preserves reading progress and reflection but requires trying the new model', () => {
  const battery = activityFor({ stem: 'Batteries' }, 2);
  const saved = { hash: 'new', sections: 2, values: { voltage: 12, resistance: 6 }, changes: 7, seen: [0, 1], part: 1, reflection: 'My original note', reviewed: true };
  const record = topicRecord(document, battery, saved);
  assert.deepEqual(record.seen, [0, 1]);
  assert.equal(record.part, 1);
  assert.equal(record.reflection, 'My original note');
  assert.equal(record.values.cells, 2);
  assert.equal(record.changes, 0);
  assert.equal(record.reviewed, false);
  assert.equal(isReviewed(document, saved, battery), false);
  record.values.cells = 3;
  record.changes = 1;
  record.reviewed = true;
  assert.equal(topicRecord(document, battery, record).values.cells, 3);
  assert.equal(isReviewed(document, record, battery), true);
});

test('phonetic controls normalize untrusted text before it reaches a diagram', () => {
  const phonetic = activityFor({ stem: 'Phonetic_Alphabet' }, 9);
  const record = topicRecord(document, phonetic, { hash: 'new', sections: 2, values: { word: '<img> a1/' } });
  assert.equal(record.values.word, 'IMGA1/');
});
