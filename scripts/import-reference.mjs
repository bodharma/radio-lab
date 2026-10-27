import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp, readdir, rename, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const directory = join(root, 'public/reference');
export const SOURCE_URL = 'https://rsgb.services/public/exams/exam-forms/260122_EX307_Foundation_v1.pdf';
export const SOURCE_SHA256 = '10e6cf663cf0b4148b325a3f8fe785d6bfb28439280f88fd6bd11a68415126ed';
export const PDF_PATH = join(directory, 'ex307-jan-2026.pdf');
export const JSON_PATH = join(directory, 'ex307-jan-2026.json');
export const CHART_PATH = join(directory, 'ex307-jan-2026-chart.png');
const digest = buffer => createHash('sha256').update(buffer).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(`EX307 import stopped: ${message}`); };

function decode(text) {
  return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity) => entity[0] === '#' ? String.fromCodePoint(entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1))) : ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[entity.toLowerCase()]);
}

function bboxPages(xml) {
  const pages = [...xml.matchAll(/<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g)].map((match, pageIndex) => {
    const width = Number(match[1]), height = Number(match[2]);
    assert(Math.abs(width - 595.276) < 0.1 && Math.abs(height - 841.89) < 0.1, `unexpected page ${pageIndex + 1} size`);
    const words = [...match[3].matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([\s\S]*?)<\/word>/g)].map((word, index) => ({ id: index, x: Number(word[1]), y: Number(word[2]), right: Number(word[3]), bottom: Number(word[4]), text: decode(word[5]).trim().replace(/\s+/g, ' ') }));
    assert(words.length > 100 && words.length < 10000 && words.every(word => word.text && word.x >= 0 && word.right >= word.x && word.right <= width && word.y >= 0 && word.bottom >= word.y && word.bottom <= height), `invalid word geometry on page ${pageIndex + 1}`);
    return { words, used: new Set() };
  });
  assert(pages.length === 4, 'expected exactly four A4 pages');
  return pages;
}

function region(page, x0, y0, x1, y1) {
  return page.words.filter(word => word.x >= x0 && word.x < x1 && word.y >= y0 && word.y < y1);
}

function lines(words) {
  const result = [];
  for (const word of [...words].sort((a, b) => a.y - b.y || a.x - b.x)) {
    let line = result.find(item => Math.abs(item.y - word.y) < 1.3);
    if (!line) result.push(line = { y: word.y, words: [] });
    line.words.push(word);
  }
  return result.sort((a, b) => a.y - b.y).map(line => ({ ...line, text: line.words.sort((a, b) => a.x - b.x).map(word => word.text).join(' ') }));
}

const text = words => lines(words).map(line => line.text).join('\n');
function take(page, words) {
  for (const word of words) { assert(!page.used.has(word.id), 'one source word was assigned to two sections'); page.used.add(word.id); }
  return text(words);
}

function noteRefs(value) {
  return [...new Set([...value.matchAll(/\bNotes?\s+(\d+(?:\s*(?:,|&|and)\s*\d+)*)/g)].flatMap(match => match[1].match(/\d+/g).map(Number)))];
}

function table(page, { id, title, bounds, cuts, y0, y1, count, headerBounds, titleBounds, columns }) {
  const [x0, x1] = bounds;
  const words = region(page, x0, y0, x1, y1);
  const starts = lines(words.filter(word => word.x < cuts[1])).map(line => line.y);
  assert(starts.length === count, `${id} has ${starts.length} rows; expected ${count}`);
  assert(starts.every((value, index) => index === 0 || value - starts[index - 1] > 4), `ambiguous row boundaries in ${id}`);
  if (titleBounds) title = take(page, region(page, ...titleBounds));
  if (headerBounds) {
    const header = region(page, ...headerBounds);
    const parsed = cuts.slice(0, -1).map((left, index) => text(header.filter(word => word.x >= left && word.x < cuts[index + 1])).replaceAll('\n', ' '));
    if (!columns) columns = parsed;
    take(page, header);
  }
  const rows = starts.map((start, index) => {
    const row = words.filter(word => word.y >= start - 0.6 && word.y < (starts[index + 1] ?? y1) - 0.6);
    const cells = cuts.slice(0, -1).map((left, column) => text(row.filter(word => word.x >= left && word.x < cuts[column + 1])));
    assert(cells.length === columns.length && cells[0], `invalid cells in ${id} row ${index + 1}`);
    take(page, row);
    const refs = noteRefs(cells.join('\n'));
    return { cells, ...(refs.length ? { noteRefs: refs } : {}) };
  });
  return { id, title, kind: 'table', columns, rows };
}

function paragraphItems(words, expected) {
  const all = lines(words), groups = [];
  for (const line of all) {
    if (!groups.length || line.y - groups.at(-1).at(-1).y > 11) groups.push([]);
    groups.at(-1).push(line);
  }
  assert(groups.length === expected, `expected ${expected} note paragraphs, found ${groups.length}`);
  return groups.map(group => group.map(line => line.text).join('\n'));
}

// shortcut: fixed January 2026 geometry; review layout and facts before supporting another edition.
export function parseExtractedReference(xml, layout, metadata) {
  assert(metadata && /^[a-f0-9]{64}$/.test(metadata.sha256) && typeof metadata.downloadedAt === 'string' && Number.isFinite(Date.parse(metadata.downloadedAt)) && metadata.chart?.width === 1200 && metadata.chart?.height === 1014, 'missing source metadata or original chart');
  const source = bboxPages(xml);
  const texts = layout.split('\f');
  while (texts.length && !texts.at(-1).trim()) texts.pop();
  assert(texts.length === 4 && /EX307\s+©\s+RSGB\s+Jan\s+2026/.test(texts[3]), 'unexpected edition label or text page count');
  assert(/Reference Data/.test(texts[0]) && /Foundation Level Examination/.test(texts[0]), 'unexpected examination title');
  const pages = [];
  const page = source[0];
  pages.push({ number: 1, title: 'Reference data and examination guidance', sections: [
    { id: 'publisher', title: 'Publisher', kind: 'text', columns: [], rows: [], text: 'Radio Society of Great Britain\nAdvancing amateur radio since 1913', transcription: 'Verified from the publisher artwork; not present in the PDF text layer.' },
    { id: 'reference-title', title: 'Foundation examination reference data', kind: 'text', columns: [], rows: [], text: take(page, region(page, 0, 0, 595.276, 300)) },
    { id: 'what-next', title: 'What next', kind: 'text', columns: [], rows: [], text: take(page, region(page, 0, 300, 595.276, 450)) },
    { id: 'queries', title: 'Queries', kind: 'text', columns: [], rows: [], text: take(page, region(page, 0, 450, 595.276, 841.89)) },
  ], text: texts[0].trim() });
  const second = source[1];
  const schedule = table(second, { id: 'foundation-schedule', title: '', bounds: [0, 595.276], cuts: [0, 123, 287, 407, 595.276], y0: 85, y1: 605, count: 32, headerBounds: [0, 64, 595.276, 84], titleBounds: [0, 35, 595.276, 64] });
  assert(schedule.columns.length === 4 && /Amateur Satellite/.test(schedule.columns[2]) && /Peak Envelope Power/.test(schedule.columns[3]), 'schedule headers changed');
  const noteTitle = take(second, region(second, 0, 610, 595.276, 645));
  const leftNotes = region(second, 0, 645, 298, 841.89), rightNotes = region(second, 298, 645, 595.276, 841.89);
  const generalNotes = [...paragraphItems(leftNotes, 6), ...paragraphItems(rightNotes, 6)];
  take(second, leftNotes); take(second, rightNotes);
  pages.push({ number: 2, title: 'Foundation licence parameters and general band-plan notes', sections: [schedule, { id: 'general-bandplan-notes', title: noteTitle, kind: 'notes', columns: [], rows: [], items: generalNotes }], text: texts[1].trim() });
  const third = source[2];
  const twoMetres = table(third, { id: 'bandplan-2m', title: '144 MHz (2 m) specimen band plan', bounds: [0, 325], cuts: [0, 104, 142, 325], y0: 54, y1: 550, count: 14, headerBounds: [0, 30, 325, 54], columns: ['Frequency entry (MHz unless otherwise printed)', 'Necessary bandwidth', 'UK usage'] });
  const specimenTitle = take(third, region(third, 325, 0, 595.276, 285));
  const noteWords = region(third, 325, 304, 595.276, 525);
  const noteLines = lines(noteWords), numbered = [];
  for (const line of noteLines) {
    if (/^Note \d+:/.test(line.text)) numbered.push(line.text);
    else { assert(numbered.length, '2 m note continuation without its heading'); numbered[numbered.length - 1] += `\n${line.text}`; }
  }
  assert(numbered.length === 14 && numbered.every((value, index) => value.startsWith(`Note ${index + 1}:`)), 'the fourteen 2 m notes changed');
  take(third, noteWords);
  const noteHeading = take(third, region(third, 325, 285, 595.276, 304));
  const licence2m = take(third, region(third, 325, 525, 595.276, 560));
  const twentyMetres = table(third, { id: 'bandplan-20m', title: '14 MHz (20 m) specimen band plan', bounds: [0, 325], cuts: [0, 104, 142, 325], y0: 594, y1: 760, count: 9, headerBounds: [0, 570, 325, 594], columns: ['Frequency entry (kHz unless otherwise printed)', 'Bandwidth', 'UK usage'] });
  const licence20m = take(third, region(third, 325, 570, 595.276, 780));
  const copyright = take(third, region(third, 0, 780, 595.276, 841.89));
  pages.push({ number: 3, title: 'Specimen 2 m and 20 m band plans', sections: [
    { id: 'bandplan-title', title: 'Examination band plans', kind: 'text', columns: [], rows: [], text: specimenTitle }, twoMetres,
    { id: '2m-numbered-notes', title: noteHeading, kind: 'notes', columns: [], rows: [], items: numbered },
    { id: '2m-licence-notes', title: '2 m licence notes', kind: 'text', columns: [], rows: [], text: licence2m }, twentyMetres,
    { id: '20m-licence-notes', title: '20 m licence notes', kind: 'text', columns: [], rows: [], text: licence20m },
    { id: 'bandplan-copyright', title: 'Copyright', kind: 'text', columns: [], rows: [], text: copyright },
  ], text: texts[2].trim() });
  const fourth = source[3];
  const speed = take(fourth, region(fourth, 0, 0, 595.276, 490));
  assert(/3 x 10 8/.test(speed), 'radio-wave velocity or exponent changed');
  const allocation = table(fourth, { id: 'frequency-allocation', title: '', bounds: [0, 365], cuts: [0, 160, 365], y0: 543, y1: 770, count: 13, headerBounds: [0, 525, 365, 543], titleBounds: [0, 495, 365, 525] });
  const decibels = table(fourth, { id: 'db-conversion', title: '', bounds: [365, 595.276], cuts: [365, 470, 595.276], y0: 543, y1: 620, count: 4, headerBounds: [365, 525, 595.276, 543], titleBounds: [365, 495, 595.276, 525] });
  const edition = take(fourth, region(fourth, 0, 780, 595.276, 841.89));
  pages.push({ number: 4, title: 'Frequency, wavelength, allocations and decibels', sections: [
    { id: 'frequency-wavelength-chart', title: 'Conversion chart: frequency to wavelength', kind: 'text', columns: [], rows: [], imageUrl: '/reference/ex307-jan-2026-chart.png', image: metadata.chart, alt: 'Original RSGB conversion chart with logarithmic axes: frequency 1–1000 MHz and wavelength 300–0.3 m. The descending line expresses wavelength in metres = 300 / frequency in MHz.', text: 'The velocity of radio waves is 3 x 10^8 meters per second (m/s).', sourceText: speed },
    allocation, decibels,
    { id: 'reference-edition', title: 'Document edition and copyright', kind: 'text', columns: [], rows: [], text: edition },
  ], text: texts[3].trim() });
  for (let index = 0; index < source.length; index++) {
    assert(source[index].used.size === source[index].words.length, `${source[index].words.length - source[index].used.size} unassigned text words on page ${index + 1}`);
    pages[index].extraction = { words: source[index].words.length, assignedWords: source[index].used.size };
  }
  const tables = pages.flatMap(item => item.sections).filter(section => section.kind === 'table');
  assert(tables.length === 5 && tables.reduce((sum, item) => sum + item.rows.length, 0) === 72, 'unexpected table inventory');
  return { version: 1, id: 'ex307-jan-2026', title: 'RSGB Foundation examination reference data (EX307)', edition: 'January 2026', sourceUrl: SOURCE_URL, pdfUrl: '/reference/ex307-jan-2026.pdf', sha256: metadata.sha256, downloadedAt: metadata.downloadedAt, pages, counts: { pages: 4, sections: pages.reduce((sum, item) => sum + item.sections.length, 0), tables: 5, rows: 72, notes: 26, licenceNoteBlocks: 2, chartImages: 1, words: source.reduce((sum, item) => sum + item.words.length, 0), textCharacters: pages.reduce((sum, item) => sum + item.text.length, 0) }, extractionNotes: ['Page text preserves the complete PDF text layer, not a complete visual transcription.', 'The publisher motto and the two band-plan labels were verified from artwork. The page 4 chart is the original extracted bitmap.', 'Cell line breaks, blank bandwidth cells, frequency units, source wording and footnote associations are preserved. The original local PDF preserves all artwork and layout.'] };
}

async function parseDocument(pdfPath, { downloadedAt } = {}) {
  const pdf = await readFile(pdfPath);
  assert(pdf.subarray(0, 5).toString() === '%PDF-' && pdf.length < 10 * 1024 * 1024, 'source is not an expected-size PDF');
  assert(digest(pdf) === SOURCE_SHA256, 'the January 2026 source checksum changed; verify the new document before updating this fixed-edition parser');
  const temporary = await mkdtemp(join(tmpdir(), 'radio-lab-reference-'));
  try {
    const [bbox, layout] = await Promise.all([
      run('pdftotext', ['-bbox', '-enc', 'UTF-8', pdfPath, '-'], { maxBuffer: 5 * 1024 * 1024 }),
      run('pdftotext', ['-layout', '-enc', 'UTF-8', pdfPath, '-'], { maxBuffer: 5 * 1024 * 1024 }),
    ]);
    await run('pdfimages', ['-f', '4', '-l', '4', '-png', pdfPath, join(temporary, 'chart')]);
    const images = (await readdir(temporary)).filter(name => name.endsWith('.png'));
    assert(images.length === 1, 'expected one original chart bitmap on page 4');
    const chart = await readFile(join(temporary, images[0]));
    assert(chart.length >= 24 && chart.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && chart.readUInt32BE(16) === 1200 && chart.readUInt32BE(20) === 1014, 'the original chart bitmap format or dimensions changed');
    const at = downloadedAt || (await stat(pdfPath)).mtime.toISOString();
    assert(typeof at === 'string' && Number.isFinite(Date.parse(at)), 'invalid download date');
    const reference = parseExtractedReference(bbox.stdout, layout.stdout, { sha256: digest(pdf), downloadedAt: at, chart: { sha256: digest(chart), bytes: chart.length, width: 1200, height: 1014 } });
    return { reference, pdf, chart };
  } finally { await rm(temporary, { recursive: true, force: true }); }
}

export async function parseReference(pdfPath, options = {}) { return (await parseDocument(resolve(pdfPath), options)).reference; }

export async function importReference({ fromLocal = false } = {}) {
  const staging = await mkdtemp(join(tmpdir(), 'radio-lab-reference-download-'));
  try {
    let path = PDF_PATH, downloadedAt;
    if (!fromLocal) {
      const response = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(30000) });
      assert(response.ok, `download returned HTTP ${response.status}`);
      assert(response.body && Number(response.headers.get('content-length') || 0) < 10 * 1024 * 1024, 'download is empty or exceeds 10 MB');
      const chunks = []; let bytes = 0;
      for await (const chunk of response.body) { bytes += chunk.length; assert(bytes < 10 * 1024 * 1024, 'download exceeds 10 MB'); chunks.push(chunk); }
      const buffer = Buffer.concat(chunks);
      path = join(staging, 'source.pdf');
      await writeFile(path, buffer); downloadedAt = new Date().toISOString();
    } else {
      try { const previous = JSON.parse(await readFile(JSON_PATH, 'utf8')); if (previous.sha256 === SOURCE_SHA256 && typeof previous.downloadedAt === 'string' && Number.isFinite(Date.parse(previous.downloadedAt))) downloadedAt = previous.downloadedAt; } catch { /* The local file's modification time remains the fallback. */ }
    }
    const parsed = await parseDocument(path, { downloadedAt });
    await mkdir(directory, { recursive: true });
    const outputs = [...(fromLocal ? [] : [[PDF_PATH, parsed.pdf]]), [CHART_PATH, parsed.chart], [JSON_PATH, `${JSON.stringify(parsed.reference, null, 2)}\n`]];
    for (const [destination, data] of outputs) {
      const temporary = `${destination}.${process.pid}.tmp`;
      try { await writeFile(temporary, data); await rename(temporary, destination); }
      finally { await rm(temporary, { force: true }); }
    }
    return parsed.reference;
  } finally { await rm(staging, { recursive: true, force: true }); }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--from-local')) { console.error('Usage: node scripts/import-reference.mjs [--from-local]'); process.exitCode = 1; }
  else importReference({ fromLocal: args.includes('--from-local') }).then(reference => console.log(`Imported ${reference.counts.pages} pages, ${reference.counts.tables} tables, ${reference.counts.rows} rows and the original chart. SHA-256 ${reference.sha256}`)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
