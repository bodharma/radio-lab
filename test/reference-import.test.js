import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseReference, parseExtractedReference, SOURCE_URL, SOURCE_SHA256, PDF_PATH, CHART_PATH } from '../scripts/import-reference.mjs';

const run = promisify(execFile);
const reference = await parseReference(PDF_PATH);
const [bbox, layout] = await Promise.all([
  run('pdftotext', ['-bbox', '-enc', 'UTF-8', PDF_PATH, '-'], { maxBuffer: 5 * 1024 * 1024 }),
  run('pdftotext', ['-layout', '-enc', 'UTF-8', PDF_PATH, '-'], { maxBuffer: 5 * 1024 * 1024 }),
]);
const sections = reference.pages.flatMap(page => page.sections);
const section = id => sections.find(item => item.id === id);
const metadata = { sha256: reference.sha256, downloadedAt: reference.downloadedAt, chart: section('frequency-wavelength-chart').image };
const row = (id, prefix) => section(id).rows.find(item => item.cells[0].startsWith(prefix));

test('all four original text layers, every source word and the complete table inventory are preserved', () => {
  assert.equal(reference.pages.length, 4);
  assert.deepEqual(sections.filter(item => item.kind === 'table').map(item => item.rows.length), [32, 14, 9, 13, 4]);
  assert.equal(reference.counts.rows, 72);
  assert.equal(reference.counts.notes, 26);
  assert.equal(reference.counts.licenceNoteBlocks, 2);
  const original = layout.stdout.split('\f').filter(text => text.trim());
  assert.deepEqual(reference.pages.map(page => page.text), original.map(text => text.trim()));
  for (const page of reference.pages) assert.equal(page.extraction.words, page.extraction.assignedWords);
  assert.equal(reference.counts.words, reference.pages.reduce((sum, page) => sum + page.extraction.words, 0));
  assert.equal(reference.sourceUrl, SOURCE_URL);
  assert.equal(reference.sha256, SOURCE_SHA256);
  assert.equal(reference.edition, 'January 2026');
  assert.ok(Number.isFinite(Date.parse(reference.downloadedAt)));
});

test('schedule cells retain power references, restrictions and separate amateur/satellite allocations', () => {
  const schedule = section('foundation-schedule');
  assert.equal(schedule.columns.length, 4);
  assert.match(schedule.columns[3], /Peak Envelope Power/);
  assert.equal(row('foundation-schedule', '135.7').cells[3], '1W (0 dBW) ERP');
  const restricted = row('foundation-schedule', '431 to 432');
  assert.match(restricted.cells[1], /100km radius\nof Charing Cross, London/);
  assert.equal(restricted.cells[2], 'Not allocated');
  assert.equal(restricted.cells[3], '25W (13.98 dBW) ERP');
  assert.match(row('foundation-schedule', '7000').cells[3], /500 mW EIRP airborne/);
  assert.equal(row('foundation-schedule', '2400').cells[3], '2 W (3 dBW)');
  assert.equal(row('foundation-schedule', '5650').cells[2], 'Secondary. Earth to space only');
  assert.equal(row('foundation-schedule', '10.475').cells[1], 'Not allocated');
  assert.equal(row('foundation-schedule', '10.475').cells[2], 'Secondary');
});

test('both band plans preserve blank bandwidths, duplicated frequency starts and combined footnote references', () => {
  assert.equal(row('bandplan-2m', '144.400').cells[1], '');
  assert.equal(row('bandplan-2m', '144.490').cells[1], '');
  assert.equal(row('bandplan-20m', '14,099').cells[1], '');
  assert.equal(section('bandplan-2m').rows.filter(item => item.cells[0].startsWith('145.200')).length, 2);
  assert.deepEqual(row('bandplan-2m', '144.990').noteRefs, [2, 5]);
  assert.deepEqual(row('bandplan-2m', '145.200-').noteRefs, [3, 5, 6, 10, 12, 11]);
  const simplex = row('bandplan-2m', '145.200-').cells[2];
  assert.match(simplex, /145\.5000MHz – FM Calling \(Note 12\)/);
  assert.match(row('bandplan-2m', '144.500').cells[2], /144\.6125MHz – UK Digital Voice \(DV\) Calling \(Note 9\)/);
  assert.equal(row('bandplan-20m', '14,125').cells[1], '2.7kHz');
  assert.match(row('bandplan-20m', '14,125').cells[2], /14,195 ±5kHz – Priority for DXpeditions/);
});

test('all general, numbered and separate licence-note blocks remain correctly separated', () => {
  const general = section('general-bandplan-notes').items, numbered = section('2m-numbered-notes').items;
  assert.equal(general.length, 12);
  assert.deepEqual(general.map(value => value.split(':')[0]), ['Necessary bandwidth', 'All Modes', 'Image Modes', 'Narrowband Modes', 'Digimodes', 'Sideband usage', 'Amplitude Modulation (AM)', 'Extended SSB (eSSB)', 'Digital Voice (DV)', 'FM Repeater & Gateway Access', 'MGM', 'WSPR']);
  assert.equal(numbered.length, 14);
  assert.match(numbered[11], /144\.6125MHz\nfor calling/);
  assert.equal(numbered[12], 'Note 13: Not used.');
  assert.match(numbered[6], /144\.110-\n144\.160MHz/);
  assert.match(section('2m-licence-notes').text, /50km of TA 012869 \(Scarborough\)/);
  assert.match(section('20m-licence-notes').text, /14,000-14,250kHz/);
});

test('allocation and dB tables keep middle-dot decimals, units and row associations', () => {
  assert.deepEqual(section('frequency-allocation').rows[0].cells, ['87·5 - 108·0MHz', 'Broadcasting']);
  assert.deepEqual(row('frequency-allocation', '144·0').cells, ['144·0 - 146·0MHz', 'Amateur & Amateur Satellite']);
  assert.deepEqual(section('db-conversion').rows.map(item => item.cells), [['3dB', '2'], ['6dB', '4'], ['9dB', '8'], ['10dB', '10']]);
  assert.match(section('reference-edition').text, /EX307 © RSGB Jan 2026/);
});

test('the original raster chart and accessible exponent are retained rather than omitted by text extraction', async () => {
  const chart = section('frequency-wavelength-chart'), image = await readFile(CHART_PATH);
  assert.equal(chart.imageUrl, '/reference/ex307-jan-2026-chart.png');
  assert.match(chart.alt, /logarithmic axes/);
  assert.match(chart.alt, /1–1000 MHz.*300–0\.3 m/);
  assert.match(chart.text, /3 x 10\^8/);
  assert.equal(chart.image.width, 1200); assert.equal(chart.image.height, 1014);
  assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(createHash('sha256').update(image).digest('hex'), chart.image.sha256);
  assert.match(section('publisher').text, /Advancing amateur radio since 1913/);
});

test('unexpected geometry, missing rows, changed edition and modified PDF bytes are rejected', async () => {
  assert.throws(() => parseExtractedReference(bbox.stdout.replace('width="595.276000"', 'width="600.000000"'), layout.stdout, metadata), /page 1 size/);
  assert.throws(() => parseExtractedReference(bbox.stdout.replace(/<word xMin="39\.584600"[^>]*>[\s\S]*?<\/word>/g, ''), layout.stdout, metadata), /rows|cells|unassigned/);
  assert.throws(() => parseExtractedReference(bbox.stdout, layout.stdout.replace('Jan 2026', 'Feb 2026'), metadata), /edition label/);
  assert.throws(() => parseExtractedReference(bbox.stdout, layout.stdout, {}), /source metadata/);
  const temporary = await mkdtemp(join(tmpdir(), 'radio-lab-reference-test-'));
  try {
    const corrupted = Buffer.from(await readFile(PDF_PATH)); corrupted[100] ^= 1;
    const path = join(temporary, 'changed.pdf'); await writeFile(path, corrupted);
    await assert.rejects(parseReference(path), /checksum changed/);
  } finally { await rm(temporary, { recursive: true, force: true }); }
});
