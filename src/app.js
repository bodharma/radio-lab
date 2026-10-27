import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { activityFor, initialValues, readings, drawActivity, describeChange, validControlValue, escapeHtml as esc } from './activities.js';
import { loadProgress, topicRecord, isReviewed, canReview, STORAGE_KEY } from './progress.js';
import { sourceAudit } from './content-notes.js';
import { validateBank } from './assessment.js';
import { createAssessmentUI } from './assessment-ui.js';
import { guideHtml, explainState } from './teaching.js';
import { createLearningUI } from './learning-ui.js';
import { createStudyToolsUI } from './study-tools-ui.js';
import { createReferenceReader } from './reference-reader.js';
import './styles.css';
import thirdPartyNoticesUrl from '../THIRD_PARTY_NOTICES.txt?url';
import licenseUrl from '../LICENSE.txt?url';
import projectNotice from '../NOTICE.txt?raw';

const app = document.querySelector('#app');
document.querySelector('#dependency-notices').href = thirdPartyNoticesUrl;
document.querySelector('#project-license').href = licenseUrl;
document.querySelector('#project-notice').textContent = projectNotice;
const number = value => new Intl.NumberFormat('en-GB', { maximumFractionDigits: 4 }).format(value);
let course, byId, byStem, ordered, moduleByTopic, progress, state, active, activity, record, assessment, learning, studyTools, referenceReader;
let referenceMode = false;
let search = '';
let notice = '';

function save() {
  if (!progress.writable) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { progress.writable = false; notice = 'Progress cannot be saved in this browser. Your current session still works.'; }
  const status = document.querySelector('#save-status');
  if (status) status.textContent = notice || (progress.writable ? 'Place saved on this device' : progress.warning);
}

function markdown(content) {
  const wikilinks = content.replace(/!?\[\[([^\]]+)\]\]/g, (_match, target) => {
    const [destination, alias] = target.split(/\\?\|/);
    const stem = destination.split('#')[0].split('/').at(-1).replace(/\.md$/, '');
    const document = byStem.get(stem);
    return document ? `[${(alias || stem.replaceAll('_', ' ')).replace(/[\[\]]/g, '')}](#${encodeURIComponent(document.id)})` : esc(alias || destination);
  });
  const html = DOMPurify.sanitize(marked.parse(wikilinks, { breaks: false }), {
    FORBID_TAGS: ['audio', 'video', 'iframe', 'object', 'embed', 'style', 'form', 'input', 'button'],
    FORBID_ATTR: ['autoplay'],
  });
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  for (const link of wrapper.querySelectorAll('a[href]')) {
    if (/^https?:/i.test(link.getAttribute('href'))) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
  }
  for (const image of wrapper.querySelectorAll('img')) { image.loading = 'lazy'; image.referrerPolicy = 'no-referrer'; }
  return wrapper.innerHTML;
}

function requestedId() {
  try { return decodeURIComponent(location.hash.slice(1)); } catch { return ''; }
}

function studyContext() {
  const route = requestedId();
  const area = route === 'assessment' ? 'assessment' : route === 'reference' || route.startsWith('reference-book') ? 'reference' : ['today', 'pilot'].includes(route) ? 'session' : route === 'tools' ? 'tools' : route.startsWith('practice/') ? 'practice' : 'lesson';
  const topicId = route.startsWith('practice/') ? route.slice(9) : byId.has(route) ? route : area === 'lesson' ? state.activeId || ordered[0] : null;
  const topic = byId.get(topicId);
  const controls = new Map();
  for (const input of app.querySelectorAll('[data-control], [data-task-control], [data-reference-answer]')) {
    if (!input.getClientRects().length) continue;
    const key = input.dataset.control || input.dataset.taskControl || input.dataset.referenceAnswer;
    const type = input.tagName === 'SELECT' ? 'select' : ['range', 'number'].includes(input.type) ? input.type : 'text';
    controls.set(key, { key: key.slice(0, 60), label: (input.labels?.[0]?.textContent || input.getAttribute('aria-label') || key).trim().slice(0, 100), value: input.value.slice(0, 100), type });
  }
  return { topicId: topic?.id || null, title: (app.querySelector('h1')?.textContent || topic?.title || 'Radio Lab').trim().slice(0, 160), route: route.slice(0, 220), area, controls: [...controls.values()].slice(0, 12), prompt: (app.querySelector('.task-prompt, .question-panel legend, .experiment-prompt, .reader-page-heading')?.textContent || '').trim().slice(0, 500) };
}

function goTo(id) {
  if (!byId.has(id)) return;
  referenceMode = !moduleByTopic.has(id);
  state.activeId = id;
  save();
  if (requestedId() === id) render(); else location.hash = encodeURIComponent(id);
}

function reviewedCount(ids) {
  return ids.filter(id => isReviewed(byId.get(id), state.records[id], activityFor(byId.get(id), moduleByTopic.get(id)?.number))).length;
}

function navContent() {
  const query = search.toLocaleLowerCase();
  const matches = document => !query || document.title.toLocaleLowerCase().includes(query) || document.stem.toLocaleLowerCase().includes(query);
  if (referenceMode) {
    const references = course.documents.filter(document => !ordered.includes(document.id) && matches(document));
    return `<p class="nav-description">All supplemental topics, resources, glossary and original module hubs.</p>${references.map(document => topicButton(document, true)).join('') || '<p>No matching notes.</p>'}`;
  }
  return course.modules.map(module => {
    const ids = module.topics.filter(id => matches(byId.get(id)));
    if (!ids.length) return '';
    return `<details class="module" ${module.topics.includes(active.id) || query ? 'open' : ''}>
      <summary><span class="module-number">${module.number}</span><span>${esc(module.title)}</span><span class="module-progress">${reviewedCount(module.topics)}/${module.topics.length}</span></summary>
      <div class="module-topics">${ids.map(id => topicButton(byId.get(id))).join('')}</div></details>`;
  }).join('') || '<p>No matching topics.</p>';
}

function topicButton(document, reference = false) {
  const reviewed = isReviewed(document, state.records[document.id], activityFor(document, moduleByTopic.get(document.id)?.number));
  return `<button class="topic-link ${document.id === active.id ? 'current' : ''}" data-topic="${esc(document.id)}" ${document.id === active.id ? 'aria-current="page"' : ''}>
    <span class="topic-status ${reviewed ? 'reviewed' : ''}" aria-label="${reviewed ? 'Reviewed' : reference ? 'Reference' : 'Not reviewed'}">${reviewed ? '✓' : reference ? '·' : ''}</span><span>${esc(document.title)}</span></button>`;
}

function controlsHtml() {
  return activity.controls.map(control => {
    const value = record.values[control.key];
    if (control.type === 'select') return `<div class="control"><label for="control-${control.key}">${esc(control.label)}</label><select id="control-${control.key}" data-control="${control.key}">${control.options.map(([option, label]) => `<option value="${esc(option)}" ${value === option ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></div>`;
    if (control.type === 'text') return `<div class="control"><label for="control-${control.key}">${esc(control.label)}</label><input type="text" id="control-${control.key}" data-control="${control.key}" value="${esc(value)}" maxlength="${control.maxLength}" autocomplete="off" autocapitalize="characters" spellcheck="false"/></div>`;
    return `<div class="control"><div class="control-top"><label for="control-${control.key}">${esc(control.label)}</label><div class="exact-value"><input type="number" id="exact-${control.key}" data-control="${control.key}" value="${value}" min="${control.min}" max="${control.max}" step="${control.step}" aria-label="${esc(control.label)} exact value"/><span>${esc(control.unit)}</span></div></div>
      <input id="control-${control.key}" type="range" data-control="${control.key}" min="${control.min}" max="${control.max}" step="${control.step}" value="${value}" aria-valuetext="${value} ${esc(control.unit)}"/><div class="range-ends"><span>${control.min} ${esc(control.unit)}</span><span>${control.max} ${esc(control.unit)}</span></div></div>`;
  }).join('');
}

function readingHtml(values, isBefore = false) {
  const result = readings(activity, values);
  return `<span class="reading-time">${isBefore ? 'Before' : 'Now'}</span><span class="reading-label">${esc(result.label)}</span><strong>${result.text ? esc(result.text) : `${number(result.value)} <small>${esc(result.unit)}</small>`}</strong>`;
}

function render() {
  if (requestedId().startsWith('reference-book')) { referenceReader.render(requestedId()); studyTools.syncContext(); return; }
  if (['tools', 'reference'].includes(requestedId())) { studyTools.render(requestedId()); return; }
  if (requestedId() === 'assessment') { assessment.render(); studyTools.syncContext(); return; }
  if (['today', 'pilot'].includes(requestedId()) || requestedId().startsWith('practice/')) { learning.render(requestedId()); studyTools.syncContext(); return; }
  const id = byId.has(requestedId()) ? requestedId() : byId.has(state.activeId) ? state.activeId : ordered[0];
  active = byId.get(id);
  learning.exposeLesson(id);
  const authored = course.provenance === 'authored-public';
  const corrections = authored ? [] : sourceAudit.filter(entry => entry.topic === active.stem);
  const module = moduleByTopic.get(id);
  activity = activityFor(active, module?.number);
  record = topicRecord(active, activity, state.records[id]);
  if (!record.seen.includes(record.part)) record.seen.push(record.part);
  state.records[id] = record;
  state.activeId = id;
  const position = ordered.indexOf(id);
  const completed = reviewedCount(ordered);
  const modulePosition = module?.topics.indexOf(id);
  app.innerHTML = `<div class="shell">
    <aside class="course-rail" aria-label="Course navigation">
      <a class="brand" href="#${encodeURIComponent(ordered[0])}" aria-label="Radio Lab home"><span class="brand-symbol" aria-hidden="true">◉</span><span>Radio Lab<small>Foundation workbench</small></span></a>
      <div class="course-progress"><div><strong>${completed}</strong><span>of ${ordered.length} topics reviewed</span></div><progress max="${ordered.length}" value="${completed}" aria-label="Course review progress"></progress><small>Reviewed means explored, not exam-ready.</small></div>
      <div class="nav-switch" role="group" aria-label="Browse content"><button data-nav="course" aria-pressed="${!referenceMode}">Course order</button><button data-nav="reference" aria-pressed="${referenceMode}">References</button></div>
      <a class="assessment-link" href="#assessment">Knowledge checks & mock exam</a>
      <a class="assessment-link" href="#today">My study session</a>
      <a class="text-button" href="#pilot">Review before sharing</a>
      <label class="search-label" for="topic-search">Find a topic</label><input type="search" id="topic-search" placeholder="Search your material" value="${esc(search)}" autocomplete="off"/>
      <nav id="topic-nav" aria-label="${referenceMode ? 'Reference notes' : 'Modules and topics'}">${navContent()}</nav>
      <div class="coverage-note">${course.coverage.modules} modules · ${course.coverage.documents} complete notes<small>${authored ? 'Original Radio Lab study material' : 'Original information preserved'}</small><button class="text-button" id="coverage-button">View content coverage</button></div>
    </aside>
    <main class="workspace">
      <header class="workspace-header"><span>${module ? `Module ${module.number} / Topic ${modulePosition + 1} of ${module.topics.length}` : 'Reference library'}</span><span class="quiet-status"><span aria-hidden="true">●</span> Text + visuals</span></header>
      <div class="topic-heading"><div><p>${module ? esc(module.title) : esc(active.category)}</p><h1 id="lesson-title" tabindex="-1">${esc(active.title)}</h1></div><a class="source-link" href="https://rsgb.org/main/clubs-training/for-students/foundation/" target="_blank" rel="noopener noreferrer">Official exam information ↗</a></div>
      ${notice || progress.warning ? `<p class="notice" role="status">${esc(notice || progress.warning)}</p>` : ''}
      ${learning.sessionBanner()}
      ${corrections.length ? `<div class="notice content-correction"><strong>Source notes need care.</strong> This note has ${corrections.length} sourced correction${corrections.length === 1 ? '' : 's'} or context qualification${corrections.length === 1 ? '' : 's'}. <button id="read-corrections" class="text-button">Read source corrections</button></div>` : ''}
      <div class="learning-layout ${module ? '' : 'reference-layout'}">
        ${module ? `<section class="workbench" aria-labelledby="bench-title"><div class="panel-heading"><div><span class="small-label">Your experiment</span><h2 id="bench-title">${esc(activity.title)}</h2></div><button id="reset-controls" class="subtle-button" title="Reset this experiment; keep your written reflection">Reset controls</button></div>
          <p class="daily-setting"><span class="small-label">In everyday life</span>${esc(activity.scenario.setting)}</p>
          <p class="focus-label"><span aria-hidden="true">◉</span> Focus: ${esc(activity.scenario.focus)}</p>
          <p class="experiment-prompt"><strong>Try:</strong> ${esc(activity.prompt)}</p>
          <button id="explain-basics" class="text-button">Explain the terms and mechanism</button>
          <div id="scene" class="scene">${drawActivity(activity, record.values, record.before)}</div>
          <div class="state-explanation"><strong>Why this state gives this result</strong><p id="state-explanation" aria-live="polite">${esc(explainState(activity, record.values))}</p></div>
          <div class="comparison"><div id="before-reading" class="before-reading">${readingHtml(record.before, true)}</div><div id="now-reading" class="now-reading">${readingHtml(record.values)}</div></div>
          ${activity.presets ? `<div class="example-presets" role="group" aria-label="Everyday examples">${activity.presets.map((preset, i) => `<button class="example-button" data-preset="${i}">${esc(preset.label)}</button>`).join('')}</div>` : ''}
          <div class="controls">${controlsHtml()}</div><button id="pin-before" class="text-button">Keep these settings as “before”</button>
          <p id="change-note" class="change-note" aria-live="polite">${esc(describeChange(activity, record.values, record.before))}</p>
          <p class="daily-result"><strong>Why it matters:</strong> ${esc(activity.scenario.result)}</p>
          ${activity.context ? `<p class="safety-context"><strong>In this topic:</strong> ${esc(activity.context[0])}. ${esc(activity.context[1])}</p>` : ''}<details class="model-note"><summary>What this model shows</summary><p>${esc(activity.model)}</p>${activity.source ? `<a href="${esc(activity.source)}" target="_blank" rel="noopener noreferrer">Model source ↗</a>` : ''}</details>
        </section>` : ''}
        <section class="topic-information" aria-labelledby="section-title">${module ? guideHtml(activity, active.title) : ''}${corrections.map(entry => `<details class="source-correction-detail" open><summary>Correction to a specific source claim</summary><blockquote>${esc(entry.claim)}</blockquote><p>${esc(entry.correction)}</p><a href="${esc(entry.source.url)}" target="_blank" rel="noopener noreferrer">${esc(entry.source.title)}</a><small> · checked ${esc(entry.checked)}</small></details>`).join('')}<div class="panel-heading"><div><span class="small-label">${authored ? 'Authored study material' : 'Complete imported material'}</span><h2 id="section-title" tabindex="-1">Section ${record.part + 1} of ${active.chunks.length}</h2></div><span class="section-seen">${record.seen.length}/${active.chunks.length} opened</span></div>
          <div class="section-dots" aria-label="Information section progress">${active.chunks.map((_, i) => `<span class="${i === record.part ? 'active' : record.seen.includes(i) ? 'seen' : ''}" title="Section ${i + 1}"></span>`).join('')}</div>
          <div class="lesson-copy">${markdown(active.chunks[record.part])}</div>
          <div class="section-navigation"><button id="previous-section" class="subtle-button" ${record.part === 0 ? 'disabled' : ''}>Previous section</button><button id="next-section" class="primary-button" ${record.part === active.chunks.length - 1 ? 'disabled' : ''}>Next section</button></div>
          <details class="source-note"><summary>${authored ? 'View the complete study note' : 'View the complete original note'}</summary><p class="source-caption">${esc(active.source)} · ${authored ? 'Authored Radio Lab study material.' : 'Imported personal study material.'} Some guidance may be dated; check current RSGB sources for exam and licence requirements.</p><div class="lesson-copy full-source">${markdown(active.body)}</div></details>
        </section>
      </div>
      ${module ? `${learning.coachCard(active, record.values)}${assessment.topicCard(active.stem)}<section class="reflection-section" aria-labelledby="reflection-title"><div><span class="small-label">Use it in another situation</span><h2 id="reflection-title">${esc(activity.scenario.transfer)}</h2><p>Explain in your own words, or write what is still unclear.</p></div><div><label class="sr-only" for="reflection">Your written explanation or question</label><textarea id="reflection" rows="3" maxlength="4000" placeholder="I changed… and noticed… because…">${esc(record.reflection)}</textarea><div class="review-row"><small id="review-requirements"></small><button id="mark-reviewed" class="primary-button" ${canReview(active, record) ? '' : 'disabled'}>${record.reviewed ? 'Reviewed ✓' : 'Mark topic reviewed'}</button></div></div></section>` : ''}
      <footer class="topic-footer"><div><span id="save-status">${esc(notice || progress.warning || 'Place saved on this device')}</span><small>Your explanations are self-reflections, not automatically graded answers.</small></div><div class="topic-actions">${position > 0 ? '<button id="previous-topic" class="subtle-button">Previous topic</button>' : ''}<button id="next-topic" class="primary-button">${position >= 0 && position < ordered.length - 1 ? 'Next topic' : position < 0 ? 'Return to course' : 'Review the course'}</button></div></footer>
    </main>
    <dialog id="coverage-dialog"><div class="dialog-heading"><h2>${authored ? 'Public study material coverage' : 'Every source note accounted for'}</h2><button id="close-coverage" class="subtle-button">Close</button></div><p>${course.coverage.courseTopics} ordered course topics across all ${course.coverage.modules} modules. ${authored ? `${course.coverage.documents} authored study notes, including the glossary. No personal source notes are included.` : `${course.coverage.documents} complete Markdown notes preserved, including resources, supplemental topics and module hubs.`}</p><div class="coverage-table"><table><thead><tr><th>Module</th><th>Topics</th><th>Information sections</th></tr></thead><tbody>${course.modules.map(module => `<tr><td>${module.number}. ${esc(module.title)}</td><td>${module.topics.length}</td><td>${module.topics.reduce((sum, id) => sum + byId.get(id).chunks.length, 0)}</td></tr>`).join('')}</tbody></table></div><p>All 86 course topics have an everyday situation, a named visual focus, an action, a practical consequence and a transfer question. Related topics reuse suitable models; no model or reflection is a validated exam assessment.</p><p class="source-caption">${authored ? `Authored study material edition ${new Date(course.importedAt).toLocaleDateString('en-GB')}. Built from the teaching guides and visual scenarios; no personal notes were imported.` : `Imported ${new Date(course.importedAt).toLocaleDateString('en-GB')}. Instruction files are excluded. No source note was edited by the importer.`}</p></dialog>
  </div>`;
  bindEvents();
  studyTools.syncContext();
  updateReviewStatus();
  save();
}

function updateReviewStatus() {
  const hint = document.querySelector('#review-requirements');
  if (!hint) return;
  const remaining = [];
  if (record.seen.length < active.chunks.length) remaining.push(`open ${active.chunks.length - record.seen.length} remaining section${active.chunks.length - record.seen.length === 1 ? '' : 's'}`);
  if (!record.changes) remaining.push('try a control');
  if (record.reflection.trim().length < 3) remaining.push('write a short reflection');
  hint.textContent = remaining.length ? `Before marking reviewed: ${remaining.join('; ')}.` : record.reviewed ? 'Explored and reviewed. Revisit without hints to check recall.' : 'Ready to mark reviewed. This records your review, not mastery.';
  const button = document.querySelector('#mark-reviewed');
  button.disabled = !canReview(active, record);
}

function updateWorkbench() {
  document.querySelector('#scene').innerHTML = drawActivity(activity, record.values, record.before);
  document.querySelector('#before-reading').innerHTML = readingHtml(record.before, true);
  document.querySelector('#now-reading').innerHTML = readingHtml(record.values);
  document.querySelector('#change-note').textContent = describeChange(activity, record.values, record.before);
  document.querySelector('#state-explanation').textContent = explainState(activity, record.values);
  updateReviewStatus();
  save();
}

function updateControl(input) {
  const control = activity.controls.find(control => control.key === input.dataset.control);
  if (!control || !input.checkValidity() || (input.value === '' && control.type !== 'text')) { input.reportValidity(); return; }
  const value = validControlValue(control, input.value);
  if (record.values[control.key] !== value) record.changes++;
  record.values[control.key] = value;
  for (const peer of document.querySelectorAll('[data-control]')) if (peer.dataset.control === control.key) {
    peer.value = value;
    if (peer.type === 'range') peer.setAttribute('aria-valuetext', `${value} ${control.unit || ''}`);
  }
  updateWorkbench();
}

function bindEvents() {
  if (moduleByTopic.has(active.id)) learning.bindCoach(active, record.values);
  document.querySelector('#read-corrections')?.addEventListener('click', () => {
    studyTools.setFocusView('explanation');
    const correction = document.querySelector('.source-correction-detail');
    correction.open = true; correction.querySelector('summary').focus(); correction.scrollIntoView({ block: 'start' });
  });
  document.querySelector('#explain-basics')?.addEventListener('click', () => { studyTools.setFocusView('explanation'); document.querySelector('#guide-title').focus(); });
  document.querySelector('[data-check-topic]')?.addEventListener('click', event => assessment.startTopic(event.currentTarget.dataset.checkTopic));
  for (const button of document.querySelectorAll('[data-topic]')) button.addEventListener('click', () => goTo(button.dataset.topic));
  for (const button of document.querySelectorAll('[data-nav]')) button.addEventListener('click', () => {
    referenceMode = button.dataset.nav === 'reference'; search = ''; render();
  });
  document.querySelector('#topic-search').addEventListener('input', event => {
    search = event.target.value;
    document.querySelector('#topic-nav').innerHTML = navContent();
    for (const button of document.querySelectorAll('[data-topic]')) button.addEventListener('click', () => goTo(button.dataset.topic));
  });
  for (const control of document.querySelectorAll('[data-control]')) control.addEventListener(['range', 'text'].includes(control.type) ? 'input' : 'change', () => updateControl(control));
  for (const button of document.querySelectorAll('[data-preset]')) button.addEventListener('click', () => {
    const preset = activity.presets[Number(button.dataset.preset)];
    record.before = { ...record.values };
    for (const control of activity.controls) if (control.key in preset.values) {
      const value = validControlValue(control, preset.values[control.key]);
      if (record.values[control.key] !== value) record.changes++;
      record.values[control.key] = value;
    }
    for (const input of document.querySelectorAll('[data-control]')) {
      const control = activity.controls.find(item => item.key === input.dataset.control);
      input.value = record.values[control.key];
      if (input.type === 'range') input.setAttribute('aria-valuetext', `${input.value} ${control.unit || ''}`);
    }
    updateWorkbench();
  });
  document.querySelector('#reset-controls')?.addEventListener('click', () => { record.values = initialValues(activity); record.before = { ...record.values }; render(); });
  document.querySelector('#pin-before')?.addEventListener('click', () => { record.before = { ...record.values }; updateWorkbench(); });
  for (const [selector, amount] of [['#previous-section', -1], ['#next-section', 1]]) document.querySelector(selector).addEventListener('click', () => {
    record.part = Math.max(0, Math.min(active.chunks.length - 1, record.part + amount));
    render(); document.querySelector('#section-title').focus({ preventScroll: true });
  });
  document.querySelector('#reflection')?.addEventListener('input', event => { record.reflection = event.target.value; updateReviewStatus(); save(); });
  document.querySelector('#mark-reviewed')?.addEventListener('click', () => { if (!canReview(active, record)) return; record.reviewed = true; save(); render(); document.querySelector('#next-topic').focus({ preventScroll: true }); });
  const position = ordered.indexOf(active.id);
  document.querySelector('#previous-topic')?.addEventListener('click', () => goTo(ordered[position - 1]));
  document.querySelector('#next-topic').addEventListener('click', () => { referenceMode = false; goTo(ordered[position >= 0 && position < ordered.length - 1 ? position + 1 : 0]); window.scrollTo({ top: 0, behavior: 'instant' }); });
  document.querySelector('#coverage-button').addEventListener('click', () => document.querySelector('#coverage-dialog').showModal());
  document.querySelector('#close-coverage').addEventListener('click', () => document.querySelector('#coverage-dialog').close());
}

async function start() {
  try {
    const response = await fetch('/course.json');
    if (!response.ok) throw new Error('Your course material has not been imported. Run the import command in README.md, then refresh.');
    course = await response.json();
    if (course?.version !== 1 || !Array.isArray(course.modules) || course.modules.length !== 9 || !Array.isArray(course.documents)) throw new Error('The course data is incomplete. Import the source notes again.');
    byId = new Map(course.documents.map(document => [document.id, document]));
    byStem = new Map(course.documents.map(document => [document.stem, document]));
    ordered = course.modules.flatMap(module => module.topics);
    if (ordered.some(id => !byId.has(id)) || course.documents.some(document => !Array.isArray(document.chunks) || !document.chunks.length || document.chunks.some(chunk => typeof chunk !== 'string'))) throw new Error('A course topic or information section is missing. Import the source notes again.');
    moduleByTopic = new Map(course.modules.flatMap(module => module.topics.map(id => [id, module])));
    let storage;
    try { storage = localStorage; } catch { storage = { getItem() { throw new Error('Storage unavailable'); } }; }
    progress = loadProgress(storage); state = progress.state;
    validateBank(course);
    studyTools = createStudyToolsUI({ root: app, course, getContext: studyContext, openTopic: goTo, backToLearning: () => goTo(byId.has(state.activeId) ? state.activeId : ordered[0]) });
    referenceReader = createReferenceReader({ root: app, backToLearning: () => goTo(byId.has(state.activeId) ? state.activeId : ordered[0]), afterRender: studyTools.syncContext });
    learning = createLearningUI({ root: app, course, legacyRecords: () => state.records, openTopic: goTo, startTopicCheck: topic => assessment.startTopic(topic), getDuration: studyTools.getDuration, setDuration: studyTools.setDuration });
    assessment = createAssessmentUI({ root: app, course, backToLearning: () => goTo(byId.has(state.activeId) ? state.activeId : ordered[0]), openTopic: goTo, onEvidence: learning.recordExam });
    referenceMode = !moduleByTopic.has(byId.has(requestedId()) ? requestedId() : byId.has(state.activeId) ? state.activeId : ordered[0]);
    window.addEventListener('hashchange', () => { referenceMode = !moduleByTopic.has(requestedId()); render(); document.querySelector('#lesson-title, #assessment-title, #learning-title, #tools-title, #reference-title')?.focus({ preventScroll: true }); });
    render();
  } catch (error) {
    app.innerHTML = `<main class="load-error"><h1>We couldn’t open the course</h1><p>${esc(error.message)}</p><p>Your source notes are unchanged.</p><button class="primary-button" id="retry">Try again</button></main>`;
    document.querySelector('#retry').addEventListener('click', () => location.reload());
  }
}

start();
