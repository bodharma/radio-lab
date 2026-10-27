import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { questions } from '../src/question-bank.js';
import { questionDiagram } from '../src/question-diagrams.js';
import { SECTIONS, EXAM } from '../src/exam-spec.js';
import { ASSESSMENT_KEY, validateBank, createSession, loadAssessment, answerQuestion, checkAnswer, finishSession, expireSession, scoreSession, topicStatus, questionById } from '../src/assessment.js';

const fresh = () => loadAssessment({ getItem: () => null }).state;
let seed = 123;
const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);

test('the original question bank covers every course topic with four unique options', async () => {
  const course = JSON.parse(await readFile(new URL('../public/course.json', import.meta.url), 'utf8'));
  validateBank(course);
  assert.equal(new Set(questions.map(q => q.topic)).size, 86);
  assert.ok(questions.length >= 172);
  for (const question of questions) if (question.diagram) {
    const svg = questionDiagram(question.diagram);
    assert.match(svg, /role="img"/);
    assert.doesNotMatch(svg, /NaN|undefined|topic-focus/);
  }
});

test('every mock follows the official allocation with no duplicate questions or answer orders', () => {
  for (let i = 0; i < 30; i++) {
    const session = createSession({ mode: 'mock', timed: true }, 1000, random);
    assert.equal(session.paper.length, 26);
    assert.equal(new Set(session.paper.map(item => item.id)).size, 26);
    assert.equal(session.deadline, 1000 + 60 * 60000);
    for (const section of SECTIONS) assert.equal(session.paper.filter(item => questionById.get(item.id).section === section.id).length, section.count);
    for (const item of session.paper) assert.deepEqual(item.order.toSorted(), [0, 1, 2, 3]);
  }
});

test('shuffled display positions are marked using the selected canonical answer and threshold is 19', () => {
  for (const correct of [18, 19, 26]) {
    const state = fresh(); state.session = createSession({ mode: 'mock' }, 1000, random);
    state.session.paper.forEach((item, i) => answerQuestion(state, i, i < correct ? questionById.get(item.id).correct : 1, 2000));
    assert.equal(scoreSession(state.session).correct, correct);
    finishSession(state, 3000);
    assert.equal(scoreSession(state.session).passed, correct >= EXAM.pass);
    assert.equal(answerQuestion(state, 0, 2, 4000), false);
    assert.equal(finishSession(state, 5000), false);
    assert.equal(state.history.length, 1);
  }
});

test('practice records the first checked answer and cannot erase it by editing', () => {
  const state = fresh(); state.session = createSession({ mode: 'topic', topics: ['Batteries'] }, 1000, random);
  const first = state.session.paper[0];
  answerQuestion(state, 0, 1, 2000);
  assert.equal(checkAnswer(state, 0, 3000), true);
  assert.equal(answerQuestion(state, 0, 0, 4000), false);
  assert.equal(checkAnswer(state, 0, 5000), false);
  finishSession(state, 6000);
  assert.equal(state.stats[first.id].attempts, 1);
  assert.equal(topicStatus(state, 'Batteries').weak, true);
  assert.equal(topicStatus(state, 'Batteries').answered, 1);
});

test('mock answers cannot be checked early and an expired deadline marks unanswered items zero', () => {
  const state = fresh(); state.session = createSession({ mode: 'mock', timed: true }, 1000, random);
  answerQuestion(state, 0, 0, 2000);
  assert.equal(checkAnswer(state, 0, 3000), false);
  const restored = loadAssessment({ getItem: () => JSON.stringify(state) }).state;
  assert.equal(expireSession(restored, 1000 + 60 * 60000), true);
  assert.equal(scoreSession(restored.session).correct, 1);
  assert.equal(scoreSession(restored.session).unanswered, 25);
  assert.equal(restored.session.reason, 'time');
  assert.equal(answerQuestion(restored, 1, 0), false);
  assert.equal(expireSession(restored), false);
});

test('invalid assessment storage is preserved while legacy lesson progress is untouched', () => {
  const calls = [];
  const broken = loadAssessment({ getItem: key => { calls.push(key); return '{broken'; } });
  assert.equal(broken.writable, false);
  assert.deepEqual(calls, [ASSESSMENT_KEY]);
  const state = fresh(); state.session = createSession({ mode: 'mock' }, 1000, random);
  state.session.paper[0].order = [0, 0, 2, 3];
  assert.equal(loadAssessment({ getItem: () => JSON.stringify(state) }).writable, false);
});
