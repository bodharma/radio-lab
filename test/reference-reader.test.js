import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateReferenceData, filteredSections } from '../src/reference-reader.js';

const data = JSON.parse(await readFile(new URL('../public/reference/ex307-jan-2026.json', import.meta.url), 'utf8'));

test('readable reference retains four pages, all tables, licence notes and original graph provenance', () => {
  assert.equal(validateReferenceData(data), data);
  assert.equal(data.pages.length, 4);
  const tables = data.pages.flatMap(page => page.sections).filter(section => section.kind === 'table');
  assert.deepEqual(tables.map(table => table.rows.length), [32, 14, 9, 13, 4]);
  const chart = data.pages[3].sections.find(section => section.imageUrl);
  assert.equal(chart.imageUrl, '/reference/ex307-jan-2026-chart.png');
  assert.match(chart.alt, /1000/);
  assert.match(chart.text, /10\^8|10⁸/);
  assert.equal(data.pages[2].sections.filter(section => section.id.endsWith('licence-notes')).length, 2);
});

test('booklet search filters factual rows and notes without mutating the full document', () => {
  const original = JSON.stringify(data);
  const result = filteredSections(data.pages[1], 'Charing Cross');
  assert.equal(result[0].rows.length, 1);
  assert.match(result[0].rows[0].cells.join(' '), /431/);
  assert.match(result[0].rows[0].cells.join(' '), /100/);
  assert.ok(filteredSections(data.pages[2], '144.6125').length > 0);
  assert.equal(filteredSections(data.pages[3], '87.5')[0].rows.length, 1);
  assert.match(filteredSections(data.pages[3], '87.5')[0].rows[0].cells[0], /87·5/);
  assert.deepEqual(filteredSections(data.pages[1], 'unknown nonsense no match'), []);
  assert.equal(JSON.stringify(data), original);
});

test('reader rejects unsupported source URLs, missing pages, unsafe figures and misaligned table cells', () => {
  for (const mutate of [
    value => { value.version = 2; },
    value => { value.sourceUrl = 'https://example.org/unverified.pdf'; },
    value => { value.pdfUrl = 'javascript:alert(1)'; },
    value => { value.pages.pop(); },
    value => { value.downloadedAt = null; },
    value => { value.pages[1].sections[0].rows.pop(); },
    value => { value.pages[2].sections.find(section => section.kind === 'notes').items.pop(); },
    value => { value.pages[1].sections[0].rows[0].cells.pop(); },
    value => { value.pages[3].sections[0].imageUrl = 'https://example.org/image.png'; },
  ]) {
    const value = structuredClone(data); mutate(value);
    assert.throws(() => validateReferenceData(value));
  }
});
