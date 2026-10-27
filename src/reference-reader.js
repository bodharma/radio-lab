import { EXAM_SOURCES } from './exam-spec.js';
import { escapeHtml as esc } from './activities.js';

const IMAGE = '/reference/ex307-jan-2026-chart.png';
const isText = (value, max = 50000) => typeof value === 'string' && value.length <= max;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clean = value => value.normalize('NFKC').replace(/\u00ad/g, '').replace(/[·⋅]/g, '.').replace(/\s+/g, ' ').toLowerCase();
const link = (url, title) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(title)}</a>`;

export function validateReferenceData(data) {
  if (!object(data) || data.version !== 1 || data.id !== 'ex307-jan-2026' || data.sourceUrl !== EXAM_SOURCES.reference || data.pdfUrl !== EXAM_SOURCES.referenceLocal || !isText(data.title, 200) || data.edition !== 'January 2026' || !/^[a-f0-9]{64}$/.test(data.sha256) || !isText(data.downloadedAt, 100) || !Number.isFinite(new Date(data.downloadedAt).getTime()) || !Array.isArray(data.pages) || data.pages.length !== 4) throw new Error('The local EX307 data has an unsupported format or version. Re-import the original document.');
  const ids = new Set();
  for (const [index, page] of data.pages.entries()) {
    if (!object(page) || page.number !== index + 1 || !isText(page.title, 200) || !isText(page.text) || !Array.isArray(page.sections) || !page.sections.length || page.sections.length > 30) throw new Error('The local EX307 page structure is incomplete. Re-import the original document.');
    for (const section of page.sections) {
      if (!object(section) || !/^[a-z0-9-]{1,100}$/.test(section.id) || ids.has(section.id) || !isText(section.title, 200) || !['table', 'text', 'notes'].includes(section.kind)) throw new Error('The local EX307 section structure is invalid.');
      ids.add(section.id);
      if (section.kind === 'table' && (!Array.isArray(section.columns) || section.columns.length < 2 || section.columns.length > 6 || section.columns.some(column => !isText(column, 200)) || !Array.isArray(section.rows) || !section.rows.length || section.rows.length > 200 || section.rows.some(row => !object(row) || !Array.isArray(row.cells) || row.cells.length !== section.columns.length || row.cells.some(cell => !isText(cell, 10000))))) throw new Error('A local EX307 table has missing or misaligned cells.');
      if (section.text !== undefined && !isText(section.text)) throw new Error('An EX307 text section is invalid.');
      if (section.items !== undefined && (!Array.isArray(section.items) || section.items.length > 100 || section.items.some(item => !isText(item, 10000)))) throw new Error('The EX307 notes are invalid.');
      if (section.imageUrl !== undefined && (section.imageUrl !== IMAGE || !isText(section.alt, 1000))) throw new Error('The EX307 figure does not refer to the expected local asset.');
    }
  }
  const tables = data.pages.flatMap(page => page.sections).filter(section => section.kind === 'table');
  const notes = data.pages.flatMap(page => page.sections).filter(section => section.kind === 'notes');
  if (tables.map(table => table.rows.length).join(',') !== '32,14,9,13,4' || notes.map(section => section.items?.length).join(',') !== '12,14' || !ids.has('2m-licence-notes') || !ids.has('20m-licence-notes') || !data.pages[3].sections.some(section => section.imageUrl === IMAGE)) throw new Error('The local EX307 extract is incomplete. Re-import the reviewed document.');
  return data;
}

export function filteredSections(page, query = '') {
  const term = clean(query.trim());
  if (!term) return page.sections;
  return page.sections.flatMap(section => {
    if (clean(`${section.title} ${page.title}`).includes(term)) return [section];
    if (section.kind === 'table') {
      const rows = section.rows.filter(row => clean(row.cells.join(' ')).includes(term));
      return rows.length ? [{ ...section, rows }] : [];
    }
    const items = section.items?.filter(item => clean(item).includes(term));
    if (clean(section.text || '').includes(term) || clean(section.alt || '').includes(term)) return [section];
    return items?.length ? [{ ...section, items }] : [];
  });
}

function sectionHtml(section, page) {
  const source = `${EXAM_SOURCES.referenceLocal}#page=${page}`;
  let body = '';
  if (section.kind === 'table') {
    body = `<div class="reference-table-scroll" tabindex="0" role="region" aria-label="${esc(section.title)}"><table class="reference-data-table"><caption>${esc(section.title)} · original page ${page}</caption><thead><tr>${section.columns.map(column => `<th scope="col">${esc(column)}</th>`).join('')}</tr></thead><tbody>${section.rows.map(row => `<tr>${row.cells.map((cell, index) => index === 0 ? `<th scope="row">${esc(cell)}</th>` : `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="reference-mobile-rows">${section.rows.map(row => `<dl>${row.cells.map((cell, index) => `<div><dt>${esc(section.columns[index])}</dt><dd>${esc(cell) || '—'}</dd></div>`).join('')}</dl>`).join('')}</div>`;
  } else {
    body = `${section.text ? section.text.split(/\n\s*\n/).map(paragraph => `<p class="reference-paragraph">${esc(paragraph)}</p>`).join('') : ''}${section.items ? `<ul class="reference-note-list">${section.items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>` : ''}${section.imageUrl ? `<figure class="reference-source-figure"><img src="${IMAGE}" alt="${esc(section.alt)}" loading="lazy"/><figcaption>Original chart extracted from page ${page}. ${link(source, 'Compare with the PDF')}</figcaption></figure>` : ''}`;
  }
  return `<section class="reader-section" id="ref-section-${esc(section.id)}"><div class="reader-section-heading"><h3>${esc(section.title)}</h3>${link(source, `Original page ${page}`)}</div>${body}</section>`;
}

export function createReferenceReader({ root, backToLearning, afterRender = () => {} }) {
  let data = null, pageNumber = 2, query = '', generation = 0;
  const ownsRoute = () => { try { return decodeURIComponent(location.hash.slice(1)).startsWith('reference-book'); } catch { return false; } };

  function bodyHtml() {
    const pages = query.trim() ? data.pages : data.pages.filter(page => page.number === pageNumber);
    let sections = 0;
    const html = pages.map(page => {
      const matches = filteredSections(page, query);
      if (!matches.length) return '';
      sections += matches.length;
      return `<article class="reader-page" data-reference-page="${page.number}"><h2 class="reader-page-heading" tabindex="-1">Page ${page.number}: ${esc(page.title)}</h2>${matches.map(section => sectionHtml(section, page.number)).join('')}${!query.trim() ? `<details class="reference-extracted-text"><summary>Verify the extracted page text</summary><pre>${esc(page.text)}</pre></details>` : ''}</article>`;
    }).join('');
    return { sections, html: html || '<p class="notice">No entries match this search. Try a frequency, service name or shorter phrase.</p>' };
  }

  function draw() {
    const page = data.pages[pageNumber - 1];
    root.innerHTML = `<main class="assessment-workspace reference-reader"><nav class="assessment-top" aria-label="Reference navigation"><a href="#today">My study session</a><a href="#reference">Practise booklet lookup</a><button id="reader-back" class="subtle-button">Back to learning</button></nav><h1 id="reference-title" tabindex="-1">EX307 in Radio Lab format</h1><p class="learning-intro">The four-page Foundation reference booklet, arranged as readable tables, notes and sections. Figures and values come from the saved original; no lesson hints are added here.</p><div class="reference-provenance"><strong>${esc(data.edition)}</strong><span>Local copy · 4 pages</span>${link(`${data.pdfUrl}#page=${pageNumber}`, `Open original PDF at page ${pageNumber}`)}<a href="${data.pdfUrl}" download="EX307-Foundation-January-2026.pdf">Download original PDF</a></div><p class="source-caption">This is the examination reference snapshot. The band plans are for examination use; check current official guidance before real operation. ${link(data.sourceUrl, 'RSGB source')}</p><nav class="reader-page-tabs" aria-label="Reference pages">${data.pages.map(item => `<a href="#reference-book/${item.number}" data-reader-page="${item.number}" ${item.number === pageNumber && !query.trim() ? 'aria-current="page"' : ''}>${item.number}. ${esc(item.title)}</a>`).join('')}</nav><label for="reference-search">Search all four pages</label><div class="reader-search"><input id="reference-search" type="search" maxlength="120" value="${esc(query)}" placeholder="Frequency, ERP, calling, bandwidth…"/><button id="clear-reference-search" class="subtle-button">Clear search</button></div><p id="reference-search-status" role="status" aria-live="polite"></p><div id="reference-content"></div><details class="reference-integrity"><summary>File version and verification</summary><dl><dt>Edition</dt><dd>${esc(data.edition)}</dd><dt>Downloaded</dt><dd>${new Date(data.downloadedAt).toLocaleDateString('en-GB')}</dd><dt>Original PDF SHA-256</dt><dd class="hash-value">${esc(data.sha256)}</dd><dt>Current page</dt><dd>${pageNumber}: ${esc(page.title)}</dd></dl><p>The PDF remains unchanged. The extracted text is available on each page for comparison; use the original PDF whenever a line or layout is unclear.</p></details></main>`;
    updateContent();
    root.querySelector('#reader-back').onclick = backToLearning;
    root.querySelector('#reference-search').oninput = event => { query = event.target.value.slice(0, 120); updateContent(); };
    root.querySelector('#clear-reference-search').onclick = () => { query = ''; root.querySelector('#reference-search').value = ''; updateContent(); root.querySelector('#reference-search').focus(); };
    for (const anchor of root.querySelectorAll('[data-reader-page]')) anchor.onclick = event => {
      const next = Number(anchor.dataset.readerPage); query = '';
      if (next === pageNumber) { event.preventDefault(); draw(); root.querySelector('.reader-page-heading').focus(); }
    };
    afterRender();
  }

  function updateContent() {
    const content = bodyHtml();
    root.querySelector('#reference-content').innerHTML = content.html;
    root.querySelector('#reference-search-status').textContent = query.trim() ? `${content.sections} matching section${content.sections === 1 ? '' : 's'} across the booklet.` : `Showing original page ${pageNumber} in readable form.`;
    for (const anchor of root.querySelectorAll('[data-reader-page]')) {
      if (!query.trim() && Number(anchor.dataset.readerPage) === pageNumber) anchor.setAttribute('aria-current', 'page'); else anchor.removeAttribute('aria-current');
    }
  }

  async function render(route = 'reference-book') {
    if (route.includes('/')) query = '';
    const value = Number(route.split('/')[1] || 2);
    pageNumber = Number.isInteger(value) && value >= 1 && value <= 4 ? value : 2;
    const ticket = ++generation;
    if (data) { draw(); return; }
    root.innerHTML = '<main class="assessment-workspace"><h1 id="reference-title" tabindex="-1">Opening the local EX307 reference…</h1><p role="status">Loading the parsed document from this device.</p></main>';
    afterRender();
    try {
      const response = await fetch(EXAM_SOURCES.referenceData);
      if (!response.ok) throw new Error('The local reference files are missing. Run npm run import:reference, then reopen this page.');
      const text = await response.text();
      if (text.length > 2 * 1024 * 1024) throw new Error('The local reference data is unexpectedly large. Re-import the original document.');
      const parsed = validateReferenceData(JSON.parse(text));
      if (ticket !== generation || !ownsRoute()) return;
      data = parsed; draw(); root.querySelector('#reference-title').focus({ preventScroll: true });
    } catch (error) {
      if (ticket !== generation || !ownsRoute()) return;
      root.innerHTML = `<main class="assessment-workspace"><h1 id="reference-title" tabindex="-1">The local reference could not be opened</h1><p role="status">${esc(error.message)}</p><p>${link(EXAM_SOURCES.reference, 'Open the RSGB original online')}</p><button id="reference-retry" class="primary-button">Try the local file again</button><button id="reader-back" class="subtle-button">Back to learning</button></main>`;
      root.querySelector('#reference-retry').onclick = () => render(route); root.querySelector('#reader-back').onclick = backToLearning; afterRender();
    }
  }
  return { render };
}
