import { loadTools, TOOLS_KEY, FEEDBACK_REASONS, FOCUS_VIEWS, feedbackExport } from './study-tools.js';
import { createBackup, inspectBackup, restoreBackup } from './backup.js';
import { REFERENCE_TASKS, gradeReference } from './reference-trainer.js';
import { escapeHtml as esc } from './activities.js';
import { STORAGE_KEY } from './progress.js';
import { ASSESSMENT_KEY } from './assessment.js';
import { LEARNING_KEY } from './learning.js';
import { EXAM_SOURCES } from './exam-spec.js';

const link = (url, text) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`;
const labels = { experiment: 'Experiment', explanation: 'Explanation', check: 'Check', discussion: 'Discussion' };

export function createStudyToolsUI({ root, course, getContext, openTopic, backToLearning }) {
  let storage;
  try { storage = localStorage; } catch { storage = { getItem() { throw Error('Browser storage unavailable'); } }; }
  const saved = loadTools(storage, course), state = saved.state;
  let inspection = null, selection = 0, reportContext = null, status = '', bookletVisible = false;
  const bar = document.createElement('div'); bar.id = 'study-toolbar'; root.before(bar);
  bar.innerHTML = `<nav class="study-toolbar" aria-label="Study helpers"><button id="toggle-focus" class="subtle-button" aria-pressed="false">Focus mode: off</button><a href="#reference-book">EX307 reference</a><a href="#tools">Backup & feedback</a><button id="report-unclear" class="text-button">This is unclear</button></nav><nav id="focus-views" aria-label="Focus panel" hidden>${FOCUS_VIEWS.map(view => `<button data-focus-view="${view}" aria-pressed="false">${labels[view]}</button>`).join('')}</nav><p id="study-tools-status" class="toolbar-status" role="status"></p><dialog id="unclear-dialog" aria-labelledby="unclear-title"></dialog>`;

  function persist() {
    if (saved.writable) {
      try { storage.setItem(TOOLS_KEY, JSON.stringify(state)); }
      catch { saved.writable = false; saved.warning = 'Study helpers cannot save in this browser. Keep a recovery copy before closing it.'; }
    }
    bar.querySelector('#study-tools-status').textContent = saved.warning || status;
  }
  function syncContext() {
    const referenceOnly = !!root.querySelector('.reference-layout');
    const view = referenceOnly ? 'explanation' : state.settings.focusView;
    document.body.dataset.focus = String(state.settings.focus);
    document.body.dataset.focusView = view;
    const button = bar.querySelector('#toggle-focus');
    button.textContent = `Focus mode: ${state.settings.focus ? 'on' : 'off'}`; button.setAttribute('aria-pressed', String(state.settings.focus));
    bar.querySelector('#focus-views').hidden = !state.settings.focus || getContext().area !== 'lesson';
    for (const button of bar.querySelectorAll('[data-focus-view]')) {
      button.setAttribute('aria-pressed', String(button.dataset.focusView === view));
      button.disabled = referenceOnly && button.dataset.focusView !== 'explanation';
    }
  }
  function setFocusView(view) { if (FOCUS_VIEWS.includes(view)) { state.settings.focusView = view; persist(); syncContext(); } }
  bar.querySelector('#toggle-focus').onclick = () => { state.settings.focus = !state.settings.focus; persist(); syncContext(); };
  for (const button of bar.querySelectorAll('[data-focus-view]')) button.onclick = () => setFocusView(button.dataset.focusView);

  function download(name, value) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function openReport() {
    reportContext = getContext();
    const dialog = bar.querySelector('#unclear-dialog');
    dialog.innerHTML = `<div class="dialog-heading"><h2 id="unclear-title">What is unclear here?</h2><button id="close-unclear" class="subtle-button" type="button">Close</button></div><p><strong>${esc(reportContext.title)}</strong></p>${reportContext.prompt ? `<p>${esc(reportContext.prompt)}</p>` : ''}<details><summary>Context saved with this report</summary><p>${esc(reportContext.area)} · ${esc(reportContext.route)}</p><ul>${reportContext.controls.map(control => `<li>${esc(control.label)}: ${esc(control.value)}</li>`).join('')}</ul></details><form id="unclear-form"><label for="unclear-reason">Where did you get stuck?</label><select id="unclear-reason">${Object.entries(FEEDBACK_REASONS).map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}</select><label for="unclear-note">Add a private note (optional)</label><textarea id="unclear-note" maxlength="1500" rows="3" placeholder="I can see… but I cannot connect it to…"></textarea><p class="source-caption">Saved on this device only. Exports omit your note and typed text controls unless you choose to include them.</p><button class="primary-button" type="submit">Save this learning obstacle</button></form>`;
    dialog.querySelector('#close-unclear').onclick = () => dialog.close();
    dialog.querySelector('#unclear-form').onsubmit = event => {
      event.preventDefault();
      state.feedback.push({ ...reportContext, id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, at: Date.now(), reason: dialog.querySelector('#unclear-reason').value, note: dialog.querySelector('#unclear-note').value.slice(0, 1500) });
      state.feedback = state.feedback.slice(-100); status = saved.writable ? 'Obstacle saved on this device. Review it under Backup & feedback.' : 'Obstacle recorded for this session only; saving is unavailable.';
      persist(); dialog.close();
      if (location.hash === '#tools') render('tools');
    };
    dialog.showModal(); dialog.querySelector('#unclear-reason').focus();
  }
  bar.querySelector('#report-unclear').onclick = openReport;

  function backupPanel() {
    const summary = inspection ? `<section class="restore-preview"><h3>File preview</h3><dl>${Object.entries(inspection.summary).map(([key, value]) => `<dt>${esc(key.replace(/([A-Z])/g, ' $1'))}</dt><dd>${esc(typeof value === 'object' ? JSON.stringify(value) : String(value))}</dd>`).join('')}</dl>${inspection.warnings.map(warning => `<p class="notice">${esc(warning)}</p>`).join('')}<p>Restoring replaces saved study data in this browser. A private recovery copy of the current stored records will download first, including any existing private text.</p><label class="checkbox-label"><input id="confirm-restore" type="checkbox"/> I reviewed this file and want to replace my saved progress</label><button id="restore-backup" class="primary-button" disabled>Replace saved progress</button></section>` : '';
    return `<h1 id="tools-title" tabindex="-1">Backup & feedback</h1><p class="learning-intro">Keep your progress portable and record the exact places where learning gets stuck.</p><section class="assessment-panel"><h2>Save a complete progress file</h2><p>Includes lesson progress, checked answers, recall schedule, the current session, reference practice and study preferences. It does not include the course material itself.</p><label class="checkbox-label"><input id="backup-private" type="checkbox"/> Include private conversations, reflections, feedback notes and typed text</label><button id="download-backup" class="primary-button">Download progress backup</button><p id="backup-status" role="status"></p><p>Keep the file somewhere you control. Private-text exports can contain personal information.</p></section><section class="assessment-panel"><h2>Restore on this browser</h2><label for="restore-file">Choose a Radio Lab progress backup (JSON, up to 5 MB)</label><input id="restore-file" type="file" accept="application/json,.json"/><p id="restore-status" role="status"></p>${summary}</section><section class="assessment-panel"><h2>Recovery when a saved record cannot be opened</h2><p>This separate recovery download preserves raw stored records for diagnosis. It can contain private text and is not a normal import file.</p><button id="raw-recovery" class="subtle-button">Download private raw recovery file</button></section><section class="assessment-panel"><h2>Learning obstacles (${state.feedback.length})</h2><p>Each report records its topic, visible control settings and the kind of explanation you needed.</p>${state.feedback.length ? `<ul class="obstacle-list">${state.feedback.toReversed().map(entry => `<li><strong>${esc(entry.title)}</strong><p>${esc(FEEDBACK_REASONS[entry.reason])}</p>${entry.note ? `<p class="private-note">${esc(entry.note)}</p>` : ''}<small>${esc(entry.area)} · ${new Date(entry.at).toLocaleDateString('en-GB')}</small>${entry.topicId ? `<button class="text-button" data-obstacle-topic="${esc(entry.topicId)}">Return to this topic</button>` : ''}<details><summary>Recorded visible controls</summary><ul>${entry.controls.map(control => `<li>${esc(control.label)}: ${esc(control.value)}</li>`).join('')}</ul></details></li>`).join('')}</ul>` : '<p>No obstacles recorded yet. Use “This is unclear” at the moment you get stuck.</p>'}<label class="checkbox-label"><input id="feedback-private" type="checkbox"/> Include private notes and typed text in feedback export</label><details id="feedback-preview"><summary>Preview feedback export</summary><pre></pre></details><button id="download-feedback" class="subtle-button">Download feedback for review</button></section>`;
  }

  function referencePanel() {
    const ref = state.reference, task = REFERENCE_TASKS[ref.index], step = task.steps[Math.min(ref.step, task.steps.length - 1)], guided = ref.mode === 'guided';
    const result = ref.checked ? gradeReference(task, ref.answers) : null;
    const columns = { frequency: 'Frequency / interval', power: 'Power / relevant column', definition: 'Definition / unit / use', notes: 'Status, notes and restrictions' };
    const row = guided || ref.checked ? `<div class="reference-map" role="group" aria-label="Selected facts from the reference row">${Object.entries(columns).map(([key, label]) => `<div class="reference-cell ${step.column === key ? 'reference-highlight' : ''}" ${step.column === key ? 'aria-current="step"' : ''}><h3>${esc(label)}</h3><p>${esc(task.row[key])}</p></div>`).join('')}</div><section class="reference-step"><h2>${esc(step.title)}</h2><p>${esc(step.instruction)}</p><details><summary>Show this lookup hint</summary><p>${esc(step.hint)}</p><p>${esc(step.explanation)}</p></details><div class="assessment-start"><button id="reference-prev-step" class="subtle-button" ${ref.step === 0 ? 'disabled' : ''}>Previous lookup step</button><button id="reference-next-step" class="primary-button" ${ref.step >= task.steps.length - 1 ? 'disabled' : ''}>Next lookup step</button></div></section>` : '<p class="notice">Independent lookup: use the official booklet. The row aid and lookup hints appear after checking.</p>';
    return `<h1 id="tools-title" tabindex="-1">Read the EX307 booklet</h1><p class="learning-intro">Find the row, read the heading, check the qualifier and follow the notes. Guided answers are supported practice; independent answers are recorded separately.</p><div class="reference-toolbar"><label for="reference-task">Exercise</label><select id="reference-task">${REFERENCE_TASKS.map((item, index) => `<option value="${index}" ${ref.index === index ? 'selected' : ''}>${index + 1}. ${esc(item.title)}</option>`).join('')}</select><label for="reference-mode">Lookup support</label><select id="reference-mode"><option value="guided" ${guided ? 'selected' : ''}>Guided: highlight where to look</option><option value="independent" ${!guided ? 'selected' : ''}>Independent: official booklet only</option></select></div><section class="assessment-panel"><h2>${esc(task.title)}</h2><p class="task-prompt">${esc(task.scenario)}</p><p>${link(`${EXAM_SOURCES.referenceLocal}#page=${task.page}`, `Open official EX307 at page ${task.page}`)} · <a href="#reference-book/${task.page}">Read this page in Radio Lab format</a></p><button id="show-booklet" class="subtle-button">${bookletVisible ? 'Hide' : 'Show'} official booklet here</button><p class="source-caption">The original PDF is saved locally. Use Radio Lab format for readable tables, or open the unchanged PDF. Neither needs an external connection once imported.</p>${bookletVisible ? `<iframe class="reference-pdf" src="${EXAM_SOURCES.referenceLocal}#page=${task.page}" title="Official EX307 reference booklet, page ${task.page}" referrerpolicy="no-referrer"></iframe>` : ''}${row}<form id="reference-form" class="reference-answers">${task.fields.map(field => `<label for="ref-${field.key}">${esc(field.label)}${field.unit ? ` (${esc(field.unit)})` : ''}</label>${field.type === 'select' ? `<select id="ref-${field.key}" data-reference-answer="${field.key}" ${ref.checked ? 'disabled' : ''} required><option value="">Choose an entry</option>${field.options.map(([value, label]) => `<option value="${esc(value)}" ${ref.answers[field.key] === value ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select>` : `<input id="ref-${field.key}" data-reference-answer="${field.key}" type="number" step="any" value="${esc(ref.answers[field.key] || '')}" ${ref.checked ? 'disabled' : ''} required/>`}`).join('')}<button type="submit" class="primary-button" ${ref.checked ? 'disabled' : ''}>Check booklet answers</button><p id="reference-input-status" role="status"></p></form>${result ? `<div id="reference-result" class="answer-feedback ${result.correct ? 'correct' : 'incorrect'}" tabindex="-1"><h2>${result.correct ? 'The booklet answers match' : 'Revisit the row or note'}</h2>${result.fields.map(field => `<p>${esc(task.fields.find(item => item.key === field.key).label)}: ${esc(field.feedback)}</p>`).join('')}<p>${esc(result.explanation)}</p><label for="reference-reflection">Why does this answer follow? (private, not automatically graded)</label><textarea id="reference-reflection" maxlength="1500" rows="3">${esc(ref.reflection || '')}</textarea><button id="reference-next-task" class="primary-button">Try the next exercise</button></div>` : ''}<p class="source-caption">${link(task.source.url, guided || ref.checked ? task.source.title : `Official EX307 reference booklet, page ${task.page}`)}. Selected facts are a reading aid, not a complete band plan or operating authorisation.</p></section>${ref.history.length ? `<details class="assessment-panel"><summary>Recent reference attempts</summary><ul>${ref.history.toReversed().map(entry => `<li>${esc(REFERENCE_TASKS[entry.index].title)} · ${esc(entry.mode)} · ${entry.correct ? 'correct' : 'revisit'}</li>`).join('')}</ul></details>` : ''}`;
  }

  function rawRecovery() {
    const records = Object.fromEntries([STORAGE_KEY, ASSESSMENT_KEY, LEARNING_KEY, TOOLS_KEY].map(key => [key, storage.getItem(key)]));
    return { format: 'radio-lab-raw-recovery', version: 1, containsPrivateText: true, records };
  }

  function render(route) {
    root.innerHTML = `<main class="assessment-workspace tools-workspace"><nav class="assessment-top"><a href="#today">My study session</a><a href="#reference">EX307 trainer</a><a href="#tools">Backup & feedback</a><button id="tools-back" class="subtle-button">Back to learning</button></nav>${route === 'reference' ? referencePanel() : backupPanel()}</main>`;
    root.querySelector('#tools-back').onclick = backToLearning;
    if (route === 'reference') bindReference(); else bindBackup();
    persist(); syncContext();
  }

  function bindBackup() {
    root.querySelector('#download-backup').onclick = () => {
      try { download('radio-lab-progress.json', createBackup(storage, course, { includePrivate: root.querySelector('#backup-private').checked })); root.querySelector('#backup-status').textContent = 'Progress backup downloaded.'; }
      catch (error) { root.querySelector('#backup-status').textContent = `${error.message} Use the private raw recovery download to preserve records that cannot be opened.`; }
    };
    root.querySelector('#raw-recovery').onclick = () => { try { download('radio-lab-private-recovery.json', rawRecovery()); } catch { root.querySelector('#restore-status').textContent = 'Browser storage cannot be read. The saved records were not changed.'; } };
    root.querySelector('#restore-file').onchange = async event => {
      const input = event.target, current = ++selection, file = input.files[0]; inspection = null;
      root.querySelector('.restore-preview')?.remove();
      if (!file) return;
      root.querySelector('#restore-status').textContent = 'Checking the backup file…';
      try {
        if (file.size > 5 * 1024 * 1024) throw Error('Choose a backup of 5 MB or smaller.');
        const result = inspectBackup(await file.text(), course);
        if (current !== selection || location.hash !== '#tools' || root.querySelector('#restore-file') !== input) return;
        inspection = result; render('tools'); root.querySelector('.restore-preview').scrollIntoView({ block: 'nearest' });
      } catch (error) { if (current === selection && root.querySelector('#restore-file') === input) root.querySelector('#restore-status').textContent = `${error.message} Saved progress was not changed.`; }
    };
    const confirm = root.querySelector('#confirm-restore');
    if (confirm) confirm.onchange = () => { root.querySelector('#restore-backup').disabled = !confirm.checked; };
    root.querySelector('#restore-backup')?.addEventListener('click', () => {
      if (!inspection || !confirm.checked) return;
      try {
        download('radio-lab-before-restore-private-recovery.json', rawRecovery());
        restoreBackup(storage, inspection); history.replaceState(null, '', '#today'); location.reload();
      } catch (error) { root.querySelector('#restore-status').textContent = error.message; }
    });
    const preview = () => { root.querySelector('#feedback-preview pre').textContent = JSON.stringify(feedbackExport(state, root.querySelector('#feedback-private').checked), null, 2); };
    root.querySelector('#feedback-private').onchange = preview; preview();
    root.querySelector('#download-feedback').onclick = () => download('radio-lab-learning-obstacles.json', feedbackExport(state, root.querySelector('#feedback-private').checked));
    for (const button of root.querySelectorAll('[data-obstacle-topic]')) button.onclick = () => openTopic(button.dataset.obstacleTopic);
  }

  function bindReference() {
    const ref = state.reference, task = REFERENCE_TASKS[ref.index];
    const reset = () => { ref.step = 0; ref.answers = {}; ref.checked = false; ref.reflection = ''; persist(); render('reference'); };
    root.querySelector('#reference-task').onchange = event => { ref.index = Number(event.target.value); reset(); root.querySelector('#reference-task').focus(); };
    root.querySelector('#reference-mode').onchange = event => { ref.mode = event.target.value; reset(); root.querySelector('#reference-mode').focus(); };
    root.querySelector('#show-booklet').onclick = () => { bookletVisible = !bookletVisible; render('reference'); root.querySelector('#show-booklet').focus(); };
    root.querySelector('#reference-prev-step')?.addEventListener('click', () => { ref.step--; persist(); render('reference'); root.querySelector('.reference-step').setAttribute('tabindex', '-1'); root.querySelector('.reference-step').focus(); });
    root.querySelector('#reference-next-step')?.addEventListener('click', () => { ref.step = Math.min(task.steps.length - 1, ref.step + 1); persist(); render('reference'); root.querySelector('.reference-step').setAttribute('tabindex', '-1'); root.querySelector('.reference-step').focus(); });
    for (const input of root.querySelectorAll('[data-reference-answer]')) input.addEventListener(input.type === 'number' ? 'input' : 'change', () => {
      const invalid = input.value.length > 120; input.setCustomValidity(invalid ? 'Use at most 120 characters.' : '');
      root.querySelector('#reference-input-status').textContent = invalid ? 'That answer is too long to save.' : '';
      if (!invalid) { ref.answers[input.dataset.referenceAnswer] = input.value; persist(); }
    });
    root.querySelector('#reference-form').onsubmit = event => {
      event.preventDefault(); if (ref.checked) return;
      ref.checked = true;
      ref.history.push({ index: ref.index, at: Date.now(), mode: ref.mode, correct: gradeReference(task, ref.answers).correct }); ref.history = ref.history.slice(-20);
      persist(); render('reference'); root.querySelector('#reference-result').focus();
    };
    root.querySelector('#reference-reflection')?.addEventListener('input', event => { ref.reflection = event.target.value.slice(0, 1500); persist(); });
    root.querySelector('#reference-next-task')?.addEventListener('click', () => { ref.index = (ref.index + 1) % REFERENCE_TASKS.length; reset(); root.querySelector('#tools-title').focus(); });
  }

  syncContext(); persist();
  return { render, syncContext, setFocusView, getDuration: () => state.settings.duration, setDuration: duration => { if ([5, 15, 60].includes(duration)) { state.settings.duration = duration; persist(); } } };
}
