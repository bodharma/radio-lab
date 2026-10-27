import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { freshLearning, loadLearning, LEARNING_KEY, DAY, recordReview, absorbExamEvidence, dueTopics, makeStudySession, PHASES } from '../src/learning.js';
import { coachQuestion, respondToExplanation } from '../src/coach.js';
import { activityFor, initialValues } from '../src/activities.js';
import { questions } from '../src/question-bank.js';

const course = JSON.parse(await readFile(new URL('../public/course.json', import.meta.url), 'utf8'));
const first = course.documents.find(document => document.id === course.modules[0].topics[0]);
const storage = value => ({ getItem: () => value });

test('review intervals advance only with spaced evidence and confidence; mistakes and guesses return sooner', () => {
  const state = freshLearning(), now = 100 * DAY;
  recordReview(state, first, true, 'sure', now);
  assert.equal(state.reviews[first.id].due, now + DAY);
  recordReview(state, first, true, 'sure', now + 1000);
  assert.equal(state.reviews[first.id].successes, 1);
  assert.equal(state.reviews[first.id].due, now + DAY);
  recordReview(state, first, true, 'sure', now + DAY);
  assert.equal(state.reviews[first.id].successes, 2);
  assert.equal(state.reviews[first.id].due, now + 4 * DAY);
  recordReview(state, first, true, 'guess', now + 4 * DAY);
  assert.equal(state.reviews[first.id].successes, 0);
  assert.equal(state.reviews[first.id].due, now + 5 * DAY);
  recordReview(state, first, false, 'sure', now + 5 * DAY);
  assert.equal(state.reviews[first.id].due, now + 5 * DAY + 600000);
  assert.deepEqual(dueTopics(state, course, {}, now + 5 * DAY + 600001), [first.id]);
  recordReview(state, { ...first, hash: 'new' }, true, 'sure', now + 6 * DAY);
  assert.equal(state.reviews[first.id].successes, 1);
});

test('exam evidence is imported once and an outstanding wrong answer is not erased by another correct item', () => {
  const state = freshLearning();
  const [one, two] = questions.filter(question => question.topic === first.stem);
  const stats = { [one.id]: { correct: false, attempts: 1, at: DAY }, [two.id]: { correct: true, attempts: 1, at: DAY + 1000 } };
  assert.equal(absorbExamEvidence(state, stats, course), true);
  assert.equal(state.reviews[first.id].correct, false);
  const attempts = state.reviews[first.id].attempts;
  assert.equal(absorbExamEvidence(state, stats, course), false);
  assert.equal(state.reviews[first.id].attempts, attempts);
  stats[one.id] = { correct: true, attempts: 2, at: 2 * DAY };
  absorbExamEvidence(state, stats, course);
  assert.equal(state.reviews[first.id].correct, true);
});

test('study sessions keep original topic order, a five-step 60-minute budget and resumable review selection', () => {
  const firstActivity = activityFor(first, course.modules[0].number);
  const state = freshLearning(), records = { [first.id]: { reviewed: true, hash: first.hash, sections: first.chunks.length, activity: firstActivity.kind, values: initialValues(firstActivity) } };
  const session = makeStudySession(state, course, records, DAY);
  assert.equal(session.topicId, course.modules[0].topics[1]);
  assert.deepEqual(session.reviewIds, [first.id]);
  assert.equal(PHASES.reduce((total, phase) => total + phase.minutes, 0), 60);
  session.phase = 3;
  assert.equal(makeStudySession(state, course, {}, 2 * DAY), session);
  const restored = loadLearning(storage(JSON.stringify(state)), course);
  assert.equal(restored.writable, true);
  assert.equal(restored.state.session.phase, 3);
  const changedCourse = structuredClone(course);
  changedCourse.documents.find(document => document.id === first.id).hash = 'changed';
  assert.equal(makeStudySession(freshLearning(), changedCourse, records, DAY).topicId, first.id);
});

test('corrupt learning records cannot overwrite saved work; task, chat and pilot boundaries are validated', () => {
  assert.equal(loadLearning(storage('{bad'), course).writable, false);
  assert.equal(loadLearning({ getItem() { throw Error(); } }, course).writable, false);
  for (const mutate of [
    state => { state.reviews.unknown = {}; },
    state => { state.coach[first.id] = { draft: '', turns: [{ role: 'learner', text: 'x'.repeat(6001) }] }; },
    state => { state.tasks[first.id] = { seed: -1 }; },
    state => { state.pilot.push({ at: DAY, stage: 'pre', note: '', score: 5, total: 2 }); },
    state => { state.pilot.push({ at: 1e100, stage: 'pre', note: '', score: 1, total: 2 }); },
    state => { state.session = { started: DAY, phase: 10, topicId: first.id }; },
  ]) {
    const state = freshLearning(); mutate(state);
    assert.equal(loadLearning(storage(JSON.stringify(state)), course).writable, false);
  }
  assert.equal(loadLearning(storage(null), course).writable, true);
  assert.notEqual(LEARNING_KEY, 'radio-lab-progress-v1');
});

test('written coaching gives a specific distinction, handles questions and never certifies unknown prose', () => {
  const signal = activityFor({ stem: 'Radio_Signals' }, 3);
  const result = respondToExplanation(signal, { missing: 'modulator' }, 'The message is missing so there is no carrier.');
  assert.equal(result.category, 'possible-misconception');
  assert.match(result.text, /leaves a carrier/);
  assert.match(result.followUp, /receiver detects RF/);
  const battery = activityFor({ stem: 'Batteries' }, 2);
  assert.match(respondToExplanation(battery, initialValues(battery), 'I think there is zero voltage when disconnected').text, /current/);
  assert.equal(respondToExplanation(signal, initialValues(signal), 'I don’t understand the oscillator').category, 'explain');
  assert.equal(respondToExplanation(signal, initialValues(signal), 'no').category, 'clarify');
  for (const module of course.modules) for (const id of module.topics) {
    const document = course.documents.find(document => document.id === id), a = activityFor(document, module.number);
    assert.ok(coachQuestion(a).length > 50);
    const reply = respondToExplanation(a, initialValues(a), 'Here is my explanation of what happened.');
    assert.match(reply.text, /cannot certify/);
    assert.ok(reply.followUp.length > 30);
    assert.doesNotMatch(reply.text + reply.followUp, /undefined|NaN/);
  }
});
