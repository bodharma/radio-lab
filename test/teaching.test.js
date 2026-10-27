import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { guideFor, guideHtml, explainState } from '../src/teaching.js';
import { activityFor, initialValues } from '../src/activities.js';

test('every course topic has definitions, a causal walkthrough, a worked example and primary sources', async () => {
  const course = JSON.parse(await readFile(new URL('../public/course.json', import.meta.url), 'utf8'));
  const documents = new Map(course.documents.map(document => [document.id, document]));
  const authorities = ['rsgb.services', 'openstax.org', 'www.ofcom.org.uk', 'www.ti.com', 'www.hse.gov.uk', 'www.nato.int', 'www.spaceweather.gov', 'rsgb.org', 'www.cisco.com'];
  let count = 0;
  for (const module of course.modules) for (const id of module.topics) {
    const activity = activityFor(documents.get(id), module.number), guide = guideFor(activity);
    assert.ok(guide?.intro?.length > 100, id);
    assert.ok(guide.terms.length >= 2 && guide.terms.every(([term, meaning]) => term && meaning.length > 25), id);
    assert.ok(guide.steps.length >= 3 && guide.steps.length <= 5, id);
    assert.ok(guide.example.length > 100 && guide.mistake.length > 50, id);
    const words = [guide.intro, ...guide.terms.flat(), ...guide.steps, guide.example, guide.mistake].join(' ').split(/\s+/).length;
    assert.ok(words >= 200, `${id}: insufficient explanation (${words} words)`);
    for (const source of guide.sources) assert.ok(authorities.includes(new URL(source.url).hostname), `${id}: unexpected source`);
    assert.doesNotMatch(guideHtml(activity), /undefined|NaN/);
    assert.ok(explainState(activity, initialValues(activity)).length > 100, id);
    count++;
  }
  assert.equal(count, 86);
});

test('a missing message input is distinguished from an absent carrier source', () => {
  const activity = activityFor({ stem: 'Radio_Signals' }, 3);
  const noCarrier = explainState(activity, { missing: 'oscillator' });
  const noMessage = explainState(activity, { missing: 'modulator' });
  assert.match(noCarrier, /no RF carrier/);
  assert.match(noMessage, /carrier is still being generated/);
  assert.match(noMessage, /not physically removing/);
  assert.notEqual(noCarrier, noMessage);
});

test('guide headings escape imported titles and numeric explanations retain units', () => {
  const activity = activityFor({ stem: 'Formula_Resistance' }, 2);
  const html = guideHtml(activity, '<img src=x onerror=alert(1)>');
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
  assert.match(explainState(activity, { voltage: 12, resistance: 6 }), /24 W/);
});
