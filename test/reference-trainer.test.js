import test from 'node:test';
import assert from 'node:assert/strict';
import { REFERENCE_TASKS, gradeReference } from '../src/reference-trainer.js';
import { EXAM_SOURCES } from '../src/exam-spec.js';

const taskById = id => REFERENCE_TASKS.find(task => task.id === id);
const answersFor = task => Object.fromEntries(task.fields.map(field => [field.key, field.answer]));

test('each authored booklet task has an explicit page, selected row and guided lookup steps', () => {
  assert.equal(REFERENCE_TASKS.length, 6);
  assert.equal(new Set(REFERENCE_TASKS.map(task => task.id)).size, REFERENCE_TASKS.length);
  assert.deepEqual([...new Set(REFERENCE_TASKS.map(task => task.page))].sort(), [2, 3, 4]);
  for (const task of REFERENCE_TASKS) {
    assert.ok(task.title && task.scenario && task.lookup.band && task.lookup.rowLabel, task.id);
    assert.deepEqual(Object.keys(task.row).sort(), ['definition', 'frequency', 'notes', 'power']);
    assert.ok(Object.values(task.row).every(value => typeof value === 'string' && value.length > 0), task.id);
    assert.equal(task.source.url, `${EXAM_SOURCES.reference}#page=${task.page}`);
    assert.match(task.source.title, /RSGB EX307, January 2026/);
    assert.ok(task.steps.length >= 2 && task.steps.length <= 4, task.id);
    for (const step of task.steps) {
      assert.ok(['frequency', 'power', 'definition', 'notes'].includes(step.column), task.id);
      assert.ok(step.title && step.instruction && step.hint && step.explanation, task.id);
    }
    assert.equal(new Set(task.fields.map(field => field.key)).size, task.fields.length);
    for (const field of task.fields) {
      assert.equal(typeof field.answer, 'string');
      if (field.type === 'select') {
        assert.equal(field.options.filter(([value]) => value === field.answer).length, 1, task.id);
        assert.equal(new Set(field.options.map(([value]) => value)).size, field.options.length);
      } else {
        assert.equal(field.type, 'number');
        assert.ok(Number.isFinite(Number(field.answer)) && field.unit, task.id);
      }
    }
  }
});

test('the selected EX307 facts preserve units, references, geography and numbered notes', () => {
  assert.equal(taskById('frequency-row-40m').fields[0].answer, '7000-7100');
  assert.deepEqual(answersFor(taskById('power-definition-136khz')), { power: '1', reference: 'erp' });
  assert.deepEqual(answersFor(taskById('geographic-restriction-431mhz')), { radius: '100', restriction: 'applies' });
  assert.match(taskById('geographic-restriction-431mhz').steps[1].instruction, /status cell, rather than a numbered footnote/);
  assert.deepEqual(answersFor(taskById('calling-channels-2m')), { fm: '145.5', dv: '144.6125' });
  assert.match(taskById('calling-channels-2m').lookup.rowLabel, /Note 12/);
  assert.equal(taskById('bandwidth-20m').fields[0].answer, '2.7');
  assert.equal(taskById('bandwidth-20m').fields[0].unit, 'kHz');
  assert.equal(taskById('allocation-broadcast-100mhz').fields[0].answer, 'broadcasting');
});

test('every task marks each correct field and rejects wrong or incomplete answers without mutation', () => {
  for (const task of REFERENCE_TASKS) {
    const answers = answersFor(task), before = JSON.stringify(answers);
    const correct = gradeReference(task, answers);
    assert.equal(correct.correct, true, task.id);
    assert.ok(correct.fields.every(field => field.correct && field.feedback.startsWith('Correct:')), task.id);
    assert.equal(correct.explanation, task.explanation);
    assert.equal(JSON.stringify(answers), before);
    for (const field of task.fields) {
      const wrong = { ...answers, [field.key]: field.type === 'number' ? Number(field.answer) + 1 : field.options.find(([value]) => value !== field.answer)[0] };
      const result = gradeReference(task, wrong);
      assert.equal(result.correct, false, `${task.id}:${field.key}`);
      assert.equal(result.fields.find(item => item.key === field.key).correct, false);
      assert.equal(result.fields.filter(item => item.correct).length, task.fields.length - 1);
    }
    const missing = gradeReference(task, {});
    assert.equal(missing.correct, false);
    assert.ok(missing.fields.every(field => !field.correct));
  }
});

test('numeric answers allow equivalent decimal/scientific forms but reject coercion and wrong units', () => {
  const task = taskById('calling-channels-2m');
  for (const fm of ['145.5000', ' 145.5 ', '1.455e2', 145.5]) {
    assert.equal(gradeReference(task, { fm, dv: '144.612500' }).correct, true);
  }
  for (const invalid of ['', ' ', null, undefined, true, false, [], [145.5], { valueOf: () => 145.5 }, NaN, Infinity, 'Infinity', 'NaN', '1e999', '0x91.8', '145.5 MHz', '145,5', '145.5001', '145500']) {
    assert.equal(gradeReference(task, { fm: invalid, dv: '144.6125' }).correct, false, String(invalid));
  }
});

test('invalid answer containers, inherited fields and forged task keys cannot create a pass', () => {
  const task = taskById('power-definition-136khz');
  for (const invalid of [null, undefined, false, '1', [], 1]) assert.equal(gradeReference(task, invalid).correct, false);
  assert.equal(gradeReference(task, Object.create({ power: '1', reference: 'erp' })).correct, false);
  assert.equal(gradeReference(task, { power: '1', reference: 'ERP' }).correct, false);
  assert.equal(gradeReference(task, { power: '1', reference: '<script>erp</script>' }).correct, false);
  const forged = { ...task, fields: [{ key: 'anything', type: 'number', answer: '999' }] };
  assert.equal(gradeReference(forged, { anything: '999' }).correct, false);
  assert.throws(() => gradeReference({ id: 'missing' }, {}), RangeError);
  assert.throws(() => gradeReference(null, {}), RangeError);
});
