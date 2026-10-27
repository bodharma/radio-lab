import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sourceAudit, contentNotes } from '../src/content-notes.js';
import { createPublicCourse } from '../scripts/create-public-course.mjs';

const course = JSON.parse(await readFile(new URL('../public/course.json', import.meta.url), 'utf8'));
const authored = course.provenance === 'authored-public';
const documents = new Map(course.documents.map(document => [document.stem, document]));

test('every audit annotation has a primary reference and matches the imported source when present', () => {
  const allowed = new Set(['rsgb.services', 'rsgb.org', 'www.ofcom.org.uk', 'www.ti.com', 'www.arrl.org', 'www.nato.int', 'www.hse.gov.uk', 'www.eaton.com', 'systemfusion.yaesu.com', 'www.spaceweather.gov']);
  const claims = new Set();
  for (const item of sourceAudit) {
    if (!authored) {
      assert.ok(documents.has(item.topic), item.topic);
      assert.ok(documents.get(item.topic).body.includes(item.claim), `${item.topic}: excerpt no longer matches; re-audit changed source`);
    }
    assert.ok(item.claim.length > 12 && item.correction.length > 30, item.topic);
    assert.notEqual(item.claim, item.correction);
    assert.equal(item.checked, '2026-10-27');
    assert.ok(['correction', 'context'].includes(item.severity));
    const url = new URL(item.source.url);
    assert.equal(url.protocol, 'https:');
    assert.ok(allowed.has(url.hostname), item.source.url);
    assert.ok(item.source.title.length > 10);
    const key = `${item.topic}:${item.claim}`;
    assert.ok(!claims.has(key), `Duplicate finding: ${key}`);
    claims.add(key);
  }
});

test('the authored public course does not copy the imported claims that require corrections', () => {
  const publicCourse = createPublicCourse();
  assert.equal(publicCourse.provenance, 'authored-public');
  const publicDocuments = new Map(publicCourse.documents.map(document => [document.stem, document]));
  for (const item of sourceAudit) {
    assert.ok(!publicDocuments.get(item.topic)?.body.includes(item.claim), `${item.topic}: imported claim leaked into public study material`);
  }
  assert.equal(publicCourse.modules.flatMap(module => module.topics).length, 86);
  assert.ok(publicDocuments.get('Glossary').body.length > 100);
});

test('the existing string-map API retains every structured correction', () => {
  for (const item of sourceAudit) {
    assert.equal(typeof contentNotes[item.topic], 'string');
    assert.ok(contentNotes[item.topic].includes(item.correction));
  }
  assert.match(contentNotes.Amplitude_Modulation_and_Frequency_Modulation, /Message frequency is not FM deviation/);
  assert.match(contentNotes.Licence_Levels, /Intermediate 46\/90\/pass 28/);
});

test('priority contradictions have explicit annotations instead of silently changing source text', () => {
  for (const topic of ['Amateur_Radio_Bands', 'Licence_Levels', 'Supervision_Clause', 'Operating_Overseas', 'EMF_Compliance', 'User_Services_Clause', 'Antenna_Matching_and_SWR', 'Mains_Plugs_and_Fuses', 'Mains_and_RF_Earths', 'Glossary']) {
    assert.ok(sourceAudit.some(item => item.topic === topic), topic);
  }
  for (const document of course.documents) assert.equal(document.chunks.join(''), document.body);
  assert.equal(course.documents.length, course.coverage.documents);
  assert.equal(course.modules.flatMap(module => module.topics).length, 86);
  if (!authored) assert.equal(course.documents.length, 120);
});
