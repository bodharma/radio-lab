import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { activityFor, initialValues, readings, drawActivity, validControlValue } from '../src/activities.js';
import { scenarios } from '../src/scenarios.js';

test('every imported source is intact and every course topic has a working visual model', async () => {
  let course;
  try { course = JSON.parse(await readFile(new URL('../public/course.json', import.meta.url), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  const ids = new Map(course.documents.map(document => [document.id, document]));
  assert.equal(ids.size, course.coverage.documents);
  assert.equal(course.modules.length, 9);
  for (const document of course.documents) {
    assert.equal(createHash('sha256').update(document.raw).digest('hex'), document.hash, document.source);
    assert.equal(document.chunks.join(''), document.body, document.source);
  }
  let count = 0;
  const stems = [];
  for (const module of course.modules) for (const id of module.topics) {
    const document = ids.get(id);
    assert.ok(document, id);
    const activity = activityFor(document, module.number);
    assert.equal(activity.kind, scenarios[document.stem].kind, `${id}: explicit model required`);
    assert.ok(scenarios[document.stem].focusTarget, `${id}: explicit visual part required`);
    stems.push(document.stem);
    for (const field of ['setting', 'focus', 'action', 'result', 'transfer']) assert.ok(activity.scenario?.[field]?.length > 15, `${id}: missing ${field}`);
    const before = initialValues(activity);
    const values = { ...before };
    for (const control of activity.controls) {
      const input = control.type === 'select' ? control.options.at(-1)[0] : control.type === 'text' ? 'AB1/CD' : control.max;
      values[control.key] = validControlValue(control, input);
    }
    const output = readings(activity, values);
    assert.ok(output.text || Number.isFinite(output.value), id);
    const svg = drawActivity(activity, values, before);
    assert.ok(svg.includes('<svg'), id);
    assert.ok(svg.includes('data-focus='), `${id}: missing visual focus`);
    assert.ok(svg.includes(`data-focus="${activity.scenario.focusTarget}" class="topic-focus"`), `${id}: the specified part must be visibly highlighted`);
    assert.ok(!/NaN|Infinity|undefined/.test(svg), id);
    for (const control of activity.controls) {
      const choices = control.type === 'select' ? control.options.map(([value]) => value) : control.type === 'text' ? ['', 'A1/B'] : [control.min, control.max];
      for (const value of choices) {
        const trial = { ...before, [control.key]: value };
        const reading = readings(activity, trial);
        assert.ok(reading.text || Number.isFinite(reading.value), `${id}: ${control.key}=${value}`);
        assert.ok(!/NaN|Infinity|undefined/.test(drawActivity(activity, trial, before)), `${id}: ${control.key}=${value}`);
      }
    }
    count++;
  }
  assert.equal(count, course.coverage.courseTopics);
  assert.deepEqual(Object.keys(scenarios).sort(), stems.sort());
});
