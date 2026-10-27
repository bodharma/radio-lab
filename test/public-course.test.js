import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createPublicCourse } from '../scripts/create-public-course.mjs';
import { scenarios } from '../src/scenarios.js';
import { activityFor, initialValues, drawActivity } from '../src/activities.js';
import { validateBank } from '../src/assessment.js';

test('public course deterministically includes every authored topic, complete material and working models without private source data', () => {
  const course = createPublicCourse();
  assert.deepEqual(course, createPublicCourse());
  assert.equal(course.provenance, 'authored-public');
  assert.ok(Number.isFinite(Date.parse(course.importedAt)));
  assert.equal(course.modules.length, 9);
  assert.deepEqual(course.modules.map(module => module.topics.length), [5, 14, 10, 14, 4, 9, 7, 11, 12]);
  assert.equal(course.coverage.courseTopics, 86);
  assert.equal(course.coverage.documents, 87);
  const topics = course.documents.filter(document => document.category === 'Topics');
  assert.deepEqual(topics.map(document => document.stem), Object.keys(scenarios));
  assert.deepEqual(course.modules.flatMap(module => module.topics), topics.map(document => document.id));
  validateBank(course);
  for (const document of course.documents) {
    assert.equal(document.chunks.join(''), document.body);
    assert.equal(document.raw, document.body);
    assert.equal(document.hash, createHash('sha256').update(document.raw).digest('hex'));
    if (document.category === 'Topics') {
      for (const heading of ['In everyday life', 'What the terms mean', 'How it works', 'Worked example', 'A common misunderstanding', 'Apply it elsewhere', 'Primary sources']) assert.ok(document.body.includes(`## ${heading}`), document.id);
      const activity = activityFor(document);
      const values = initialValues(activity);
      assert.ok(drawActivity(activity, values, values).includes('<svg'), document.id);
    }
  }
  assert.ok(course.documents.find(document => document.id === 'Glossary').body.includes('## Transmitter'));
  assert.doesNotMatch(JSON.stringify(course), /\/Users\/|bodharma|Obsidian|CibaHealth|Cibahealth|Imported personal study material/);
});

test('public course CLI writes safe output and refuses to replace imported or invalid data', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'radio-lab-public-test-'));
  const target = join(directory, 'course.json');
  const script = new URL('../scripts/create-public-course.mjs', import.meta.url);
  try {
    execFileSync(process.execPath, [script.pathname, directory], { stdio: 'pipe' });
    assert.deepEqual(JSON.parse(await readFile(target, 'utf8')), createPublicCourse());
    execFileSync(process.execPath, [script.pathname, directory], { stdio: 'pipe' });
    for (const content of ['{"version":1,"documents":["PRIVATE"]}', 'malformed PRIVATE data']) {
      await writeFile(target, content);
      assert.throws(() => execFileSync(process.execPath, [script.pathname, directory], { stdio: 'pipe' }));
      assert.equal(await readFile(target, 'utf8'), content);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
