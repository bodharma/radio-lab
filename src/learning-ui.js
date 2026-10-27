import { activityFor, initialValues, validControlValue, escapeHtml as esc } from './activities.js';
import { createChallenge, evaluateChallenge, challengeDiagram } from './challenges.js';
import { loadLearning, LEARNING_KEY, studyPhases, recordReview, absorbExamEvidence, dueTopics, makeStudySession } from './learning.js';
import { coachQuestion, respondToExplanation } from './coach.js';
import { sourceAudit } from './content-notes.js';
import { EXAM_SOURCES } from './exam-spec.js';
import { guideFor } from './teaching.js';
import { questions } from './question-bank.js';

const link = (url, text) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`;
const date = at => new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const labels = ['Worked example', 'Guided practice', 'Independent practice'];

export function createLearningUI({ root, course, legacyRecords, openTopic, startTopicCheck, getDuration = () => 60, setDuration = () => {} }) {
  let storage;
  try { storage = localStorage; } catch { storage = { getItem() { throw Error(); } }; }
  const saved = loadLearning(storage, course), state = saved.state;
  const documents = new Map(course.documents.map(document => [document.id, document]));
  const ordered = course.modules.flatMap(module => module.topics);
  const authored = course.provenance === 'authored-public';
  const corrections = authored ? [] : sourceAudit;
  const moduleById = new Map(course.modules.flatMap(module => module.topics.map(id => [id, module.number])));
  let message = '';
  const activity = id => activityFor(documents.get(id), moduleById.get(id));
  const route = () => { try { return decodeURIComponent(location.hash.slice(1)); } catch { return ''; } };

  function persist() {
    if (saved.writable) {
      try { storage.setItem(LEARNING_KEY, JSON.stringify(state)); }
      catch { saved.writable = false; saved.warning = 'Learning progress cannot be saved in this browser. This session still works; export your evidence before closing it.'; }
    }
    for (const status of root.querySelectorAll('[data-learning-save]')) status.textContent = saved.warning || 'Learning progress saved on this device';
  }

  function enter(hash) { if (route() === hash) render(hash); else location.hash = encodeURIComponent(hash); }
  function openPractice(id, independent = false) {
    if (!ordered.includes(id)) return;
    if (independent && (taskFor(id).checked || taskFor(id).level !== 2)) resetTask(id, 2);
    enter(`practice/${id}`);
  }
  function chatFor(id) { return state.coach[id] ||= { draft: '', turns: [] }; }
  function exposeLesson(id) {
    const task = state.tasks[id];
    if (task && task.level === 2 && !task.checked && task.hint < 2) { task.hint = 2; persist(); }
  }

  function coachCard(document, values) {
    const a = activity(document.id), chat = chatFor(document.id);
    return `<section class="coach-panel" aria-labelledby="coach-title" data-coach-topic="${esc(document.id)}"><div class="panel-heading"><h2 id="coach-title">Talk through the experiment</h2><button class="text-button" data-practice-topic="${esc(document.id)}">Try a new practical task</button></div><p>${esc(coachQuestion(a))}</p><p class="source-caption">Written coaching uses prepared explanations and checks for common wording. It can miss or misread your meaning; practical answers are checked separately. Nothing is sent to a server.</p><div class="coach-transcript">${chat.turns.map(turn => `<div class="coach-turn ${turn.role}"><strong>${turn.role === 'learner' ? 'You' : 'Tutor'}</strong><p>${esc(turn.text)}</p></div>`).join('')}</div><form id="coach-form"><label for="coach-answer">Your explanation or question</label><textarea id="coach-answer" maxlength="1500" rows="3" placeholder="I think… because… The part I cannot explain is…">${esc(chat.draft)}</textarea><button class="primary-button" type="submit">Discuss my explanation</button></form><p id="coach-response" role="status" tabindex="-1"></p><small data-learning-save>${esc(saved.warning || 'Your conversation stays on this device')}</small></section>`;
  }

  function bindCoach(document, values) {
    const chat = chatFor(document.id);
    root.querySelector('#coach-answer')?.addEventListener('input', event => { chat.draft = event.target.value; persist(); });
    root.querySelector('#coach-form')?.addEventListener('submit', event => {
      event.preventDefault();
      const input = root.querySelector('#coach-answer');
      if (!input.value.trim()) { root.querySelector('#coach-response').textContent = 'Write a thought or question first.'; input.focus(); return; }
      const answer = respondToExplanation(activity(document.id), values, input.value, Math.floor(chat.turns.length / 2));
      chat.turns.push({ role: 'learner', text: input.value.slice(0, 1500) }, { role: 'coach', text: `${answer.text}\n\n${answer.followUp}` });
      chat.turns = chat.turns.slice(-6); chat.draft = ''; persist();
      const old = root.querySelector('.coach-panel');
      old.outerHTML = coachCard(document, values); bindCoach(document, values);
      const turns = root.querySelectorAll('.coach-turn'); turns[turns.length - 1]?.scrollIntoView({ block: 'nearest' });
      root.querySelector('#coach-answer').focus({ preventScroll: true });
    });
    for (const button of root.querySelectorAll('[data-practice-topic]')) button.onclick = () => openPractice(button.dataset.practiceTopic, button.dataset.practiceMode === 'recall');
  }

  function sessionBanner() {
    const session = state.session;
    if (!session || session.finished) return '';
    return `<div class="study-resume"><span>Today · step ${session.phase + 1}/${studyPhases(session.duration).length}: ${esc(studyPhases(session.duration)[session.phase].name)}</span><a href="#today">Return to my study session</a></div>`;
  }

  function today() {
    const due = dueTopics(state, course, legacyRecords());
    const session = state.session;
    const duration = session && !session.finished ? session.duration || 60 : getDuration();
    const phases = studyPhases(duration);
    const reviewList = due.slice(0, 5).map(id => `<li><button class="text-button" data-practice-topic="${esc(id)}" data-practice-mode="recall">${esc(documents.get(id).title)}</button><small>${state.reviews[id]?.correct === false ? 'Revisit a missed idea' : 'Recall without the explanation'}</small></li>`).join('');
    if (!session || session.finished) return `<h1 id="learning-title" tabindex="-1">My study session</h1><p class="learning-intro">One next action at a time. Your selected time is a suggested budget; you control when to pause and continue.</p>${session?.finished ? '<p class="notice">Session completed. This records your practice, not exam readiness.</p>' : ''}<section class="assessment-panel"><h2>Choose a manageable session</h2><label for="session-duration">Study time</label><select id="session-duration">${[5,15,60].map(value => `<option value="${value}" ${duration === value ? 'selected' : ''}>${value} minutes</option>`).join('')}</select>${duration === 5 ? '<p>A short recall-and-practice pass. It does not mark a whole topic learned.</p>' : ''}<ol class="study-plan">${phases.map(phase => `<li><strong>${esc(phase.name)}</strong><span>${phase.minutes} minutes</span></li>`).join('')}</ol><button id="start-study" class="primary-button">Start my study session</button><p class="source-caption">Topics follow the original course order. Due reviews come first. The break and all steps advance only when you choose.</p></section><section class="assessment-panel"><h2>Ready for another look</h2>${due.length ? `<p>${due.length} topic${due.length === 1 ? '' : 's'} due for recall.</p><ul class="due-list">${reviewList}</ul>` : '<p>No reviews are due yet. A marked question or an independent practical task starts a review schedule.</p>'}</section>${reviewOverview()}`;
    const document = documents.get(session.topicId), phase = phases[session.phase];
    const recallId = session.reviewIds[session.reviewIndex];
    const body = [
      recallId ? `<p>Recall ${session.reviewIndex + 1} of ${session.reviewIds.length}: <strong>${esc(documents.get(recallId).title)}</strong>.</p><button data-practice-topic="${esc(recallId)}" data-practice-mode="recall" class="primary-button">Recall this topic</button><button id="review-next" class="subtle-button">${session.reviewIndex + 1 < session.reviewIds.length ? 'Next review topic' : 'Continue to the new topic'}</button><p class="source-caption">Use independent mode without hints. If you need a reminder, use it; your record will show supported practice.</p>` : '<p>No earlier topics are waiting. Use this time to try the next topic’s questions before reading, and discover what is already familiar.</p><button id="study-diagnostic" class="primary-button">Try the starting knowledge check</button>',
      `<p>Next in course order: <strong>${esc(document.title)}</strong>.</p><p>Predict what one control will do, test it, then discuss the cause in writing. Open the detailed explanation whenever you need it.</p><button id="open-study-topic" class="primary-button">Open ${esc(document.title)}</button>`,
      '<p>Pause here. Move away from the screen or rest your eyes if useful. Your place is saved.</p><p>You decide when the break ends. There is no alarm or automatic jump.</p>',
      `<p>Apply <strong>${esc(document.title)}</strong> with changed conditions.</p><button data-practice-topic="${esc(document.id)}" class="primary-button">Solve a new practical task</button><p>Start with guidance if needed; then try a fresh independent version.</p>`,
      `<p>Check ${esc(document.title)} in the examination format, then explain one result in your own words.</p><button id="study-topic-check" class="primary-button">Start this topic’s knowledge check</button><p class="source-caption">Complete the check, then return here. The mock examination remains a separate, deliberate choice.</p>`,
    ][phase.kind];
    return `<h1 id="learning-title" tabindex="-1">${esc(phase.name)}</h1><p class="learning-intro">Step ${session.phase + 1} of ${phases.length} · suggested ${phase.minutes} minutes. You can stop and return at any point.</p><ol class="study-plan compact">${phases.map((item, index) => `<li ${index === session.phase ? 'aria-current="step"' : ''}><span>${index + 1}. ${esc(item.name)}</span><small>${session.completed.includes(index) ? 'Completed' : `${item.minutes} min`}</small></li>`).join('')}</ol><section class="assessment-panel study-action">${body}<div class="study-step-actions">${session.phase > 0 ? '<button id="study-back" class="subtle-button">Previous step</button>' : ''}<button id="study-next" class="primary-button">${session.phase === phases.length - 1 ? 'Finish this study session' : 'I’m ready for the next step'}</button></div></section>${reviewOverview()}`;
  }

  function reviewOverview() {
    const entries = ordered.filter(id => state.reviews[id]);
    if (!entries.length) return '';
    return `<details class="assessment-panel"><summary>My recall evidence (${entries.length} topics)</summary><p>These are practice observations. Repeating immediately does not advance spaced-recall success. Guesses return tomorrow; missed ideas return after 10 minutes. Intervals are a starting schedule, not a validated personal model.</p><table class="assessment-table"><thead><tr><th>Topic</th><th>Latest evidence</th><th>Next review</th></tr></thead><tbody>${entries.map(id => { const review = state.reviews[id]; return `<tr><td>${esc(documents.get(id).title)}</td><td>${review.correct ? review.confidence === 'guess' ? 'Correct, guessed' : 'Correct' : 'Needs another attempt'} · ${review.successes} spaced success${review.successes === 1 ? '' : 'es'}</td><td>${date(review.due)}</td></tr>`; }).join('')}</tbody></table></details>`;
  }

  function taskFor(id) {
    const document = documents.get(id);
    let task = state.tasks[id];
    if (!task || task.hash !== document.hash) {
      const a = activity(id), challenge = createChallenge(a, 1, 0);
      task = state.tasks[id] = { hash: document.hash, seed: 0, level: 1, values: { ...challenge.initial }, answer: '', hint: 0, checked: false, correct: false, confidence: 'unsure' };
    }
    return task;
  }

  function resetTask(id, level) {
    const task = taskFor(id);
    task.seed = (task.seed + 1) % 1000001; task.level = level; task.answer = ''; task.hint = 0; task.checked = false; task.correct = false; task.confidence = 'unsure';
    task.values = { ...createChallenge(activity(id), level, task.seed).initial };
    persist();
  }

  function taskControls(challenge, task) {
    if (challenge.answer !== null) return `<label for="task-answer">Your calculated answer (${esc(challenge.unit)})</label><input id="task-answer" type="number" step="any" value="${esc(task.answer)}" ${task.checked ? 'disabled' : ''} inputmode="decimal" required/><p id="task-input-status" role="status"></p><p class="source-caption">Enter a number in the stated unit. Keep the given conditions fixed.</p>`;
    return challenge.controls.map(control => {
      const value = task.values[control.key];
      if (control.type === 'select') return `<label for="task-${control.key}">${esc(control.label)}</label><select id="task-${control.key}" data-task-control="${esc(control.key)}" ${task.checked ? 'disabled' : ''}>${control.options.map(([key, label]) => `<option value="${esc(key)}" ${key === value ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select>`;
      return `<label for="task-${control.key}">${esc(control.label)} ${esc(control.unit || '')}</label><input id="task-${control.key}" data-task-control="${esc(control.key)}" type="${control.type === 'text' ? 'text' : 'number'}" value="${esc(value)}" ${control.type === 'text' ? `maxlength="${control.maxLength}"` : `min="${control.min}" max="${control.max}" step="${control.step}"`} ${task.checked ? 'disabled' : ''}/>`;
    }).join('');
  }

  function practice(id) {
    if (!ordered.includes(id)) id = state.session?.topicId || ordered[0];
    const document = documents.get(id), task = taskFor(id), challenge = createChallenge(activity(id), task.level, task.seed);
    if (challenge.answer !== null) task.values = { ...challenge.initial };
    else for (const control of challenge.controls) task.values[control.key] = validControlValue(control, task.values[control.key]);
    const feedback = task.checked ? evaluateChallenge(challenge, task.values, task.answer) : null;
    return `${sessionBanner()}<h1 id="learning-title" tabindex="-1">${esc(document.title)}: apply it</h1><p class="learning-intro">Change the situation, apply the principle, then check the result.</p><div class="practice-toolbar"><label for="task-level">Support</label><select id="task-level">${labels.map((label, level) => `<option value="${level}" ${level === task.level ? 'selected' : ''}>${label}</option>`).join('')}</select><button class="text-button" id="task-lesson">Open the lesson</button></div>${task.level === 2 && !task.checked ? '<p class="source-caption">The tutor becomes available after checking. Opening the lesson records this attempt as supported practice.</p>' : ''}<section class="assessment-panel practical-task" data-task-topic="${esc(id)}"><h2>${esc(challenge.title)}</h2><p class="task-prompt">${esc(challenge.prompt)}</p><div id="task-diagram">${challengeDiagram(challenge, task.values)}</div><form id="task-form"><div class="task-controls">${taskControls(challenge, task)}</div><label for="task-confidence">How certain are you?</label><select id="task-confidence" ${task.checked ? 'disabled' : ''}><option value="sure" ${task.confidence === 'sure' ? 'selected' : ''}>I can explain why</option><option value="unsure" ${task.confidence === 'unsure' ? 'selected' : ''}>Partly sure</option><option value="guess" ${task.confidence === 'guess' ? 'selected' : ''}>I’m guessing</option></select><div class="assessment-start"><button class="primary-button" type="submit" ${task.checked ? 'disabled' : ''}>Check my solution</button>${task.level !== 2 && task.hint < 2 && !task.checked ? '<button type="button" id="task-hint" class="subtle-button">Show one hint</button>' : ''}</div></form>${task.hint ? `<div class="task-hints" tabindex="-1">${challenge.hints.slice(0, task.hint).map(hint => `<p>${esc(hint)}</p>`).join('')}</div>` : ''}${task.level === 0 ? `<details class="guide-example" open><summary>Worked solution</summary><p>${esc(challenge.solution)}</p></details>` : ''}${feedback ? `<div id="task-feedback" class="answer-feedback ${feedback.correct ? 'correct' : 'incorrect'}" role="status" tabindex="-1"><h3>${feedback.correct ? 'The task conditions are met' : 'Try the principle again'}</h3><p>${esc(feedback.feedback)}</p>${feedback.feedback === challenge.solution ? '' : `<p>${esc(challenge.solution)}</p>`}<p>${task.level === 2 && !task.hint ? 'Independent attempt recorded for review.' : 'Supported practice recorded here; it does not count as independent recall.'}</p><button id="task-new" class="primary-button">Try a fresh version</button></div>` : ''}<details class="model-note"><summary>What this task assumes</summary><p>${esc(challenge.model)}</p></details></section>${task.level === 2 && !task.checked ? '' : coachCard(document, task.values)}<p class="source-caption">${link(EXAM_SOURCES.syllabus, 'RSGB Foundation syllabus')} · Practice observations are not a prediction of your real examination result.</p>`;
  }

  function pilot() {
    return `<h1 id="learning-title" tabindex="-1">Review before sharing</h1><p class="learning-intro">The source cross-check is available below. Human instructor review and a learner pilot are still pending.</p><section class="assessment-panel"><h2>Instructor review pack</h2><p>Review definitions, equations, visual behaviour, all control states and keyed answers against the current syllabus. Pay particular attention to licence conditions and safety. ${authored ? 'This public edition uses original Radio Lab study material.' : 'The original notes are preserved.'}</p><p>${link(EXAM_SOURCES.syllabus, 'Current syllabus')} · ${link(EXAM_SOURCES.reference, 'EX307')} · ${link('https://rsgb.org/main/clubs-training/training-resources/mock-exams/', 'Official practice papers')}</p><p>Record review outcomes, unresolved issues and the reviewer’s relevant qualifications. A recorded review is self-reported until independently verified.</p><button id="export-review-pack" class="primary-button">Download instructor review pack</button><p class="source-caption">The pack contains solution keys. Downloading it makes any unfinished independent tasks supported practice.</p></section><section class="assessment-panel"><h2>Learner pilot</h2><ol><li>Before teaching: attempt unseen questions and a practical task.</li><li>Study one topic and solve a different task immediately afterwards.</li><li>Return after 2–7 days for an unseen transfer task and delayed recall.</li><li>Use a previously unseen official paper for a separate exam-format check.</li><li>Record unclear instructions, needed help and fatigue; participation is voluntary.</li></ol><p>This is an exploratory pilot. A small group and improved repeat scores do not establish effectiveness.</p><form id="pilot-form"><label for="pilot-stage">Observation</label><select id="pilot-stage"><option value="pre">Before learning</option><option value="post">Immediately after learning</option><option value="delayed">Delayed recall</option><option value="official">Unseen official paper</option><option value="feedback">Learner feedback</option><option value="teacher">Instructor review</option></select><div class="pilot-score"><label>Correct <input id="pilot-score" type="number" min="0" max="1000" step="1"/></label><label>Out of <input id="pilot-total" type="number" min="1" max="1000" step="1"/></label></div><label for="pilot-note">Private note (optional; avoid names and contact details)</label><textarea id="pilot-note" maxlength="1500" rows="3"></textarea><button class="primary-button" type="submit">Save observation on this device</button><p id="pilot-error" role="status"></p></form>${state.pilot.length ? `<h3>Recorded observations</h3><ul>${state.pilot.toReversed().map(entry => `<li>${date(entry.at)} · ${esc(entry.stage)}${entry.score !== null ? ` · ${entry.score}/${entry.total}` : ''}${entry.note ? ` — ${esc(entry.note)}` : ''}</li>`).join('')}</ul>` : ''}<details class="pilot-preview"><summary>Preview scores export (UTC dates only)</summary><pre>${esc(JSON.stringify(pilotScores(), null, 2))}</pre></details><button id="export-pilot" class="subtle-button">Download scores without private text</button><p class="source-caption">Only UTC date, stage, score and total are included for each observation. No exact time, conversation, reflection, private note or identity is included. Nothing is uploaded automatically.</p></section><section class="assessment-panel"><h2>Specific source corrections (${corrections.length})</h2>${corrections.map(entry => `<details class="audit-entry"><summary>${esc(entry.topic.replaceAll('_', ' '))}: ${esc(entry.severity)}</summary><blockquote>${esc(entry.claim)}</blockquote><p>${esc(entry.correction)}</p><p>${link(entry.source.url, entry.source.title)} · checked ${esc(entry.checked)}</p><button class="text-button" data-audit-topic="${esc(entry.topic)}">Open source context</button></details>`).join('')}</section>`;
  }

  function pilotScores() {
    return { version: 1, exportedDate: new Date().toISOString().slice(0, 10), status: 'Self-reported exploratory observations; not validated efficacy evidence', observations: state.pilot.map(({ at, stage, score, total }) => ({ date: new Date(at).toISOString().slice(0, 10), stage, score, total })) };
  }

  function download(name, content, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([content], { type })), anchor = document.createElement('a');
    anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function render(hash = route()) {
    let id = hash.startsWith('practice/') ? hash.slice(9) : null;
    if (hash.startsWith('practice/') && !ordered.includes(id)) id = state.session?.topicId || ordered[0];
    root.innerHTML = `<main class="assessment-workspace learning-workspace"><nav class="assessment-top" aria-label="Learning tools"><a href="#today">My study session</a><a href="#assessment">Knowledge checks & mock exam</a><a href="#pilot">Review before sharing</a><button id="learning-back" class="subtle-button">Back to learning</button></nav>${message ? `<p class="notice" role="status">${esc(message)}</p>` : ''}${hash === 'pilot' ? pilot() : hash.startsWith('practice/') ? practice(id) : today()}<footer class="learning-save"><span data-learning-save role="status">${esc(saved.warning || 'Learning progress saved on this device')}</span></footer></main>`;
    bind(id);
    persist();
  }

  function bind(id) {
    root.querySelector('#learning-back').onclick = () => openTopic(id || state.session?.topicId || ordered[0]);
    root.querySelector('#session-duration')?.addEventListener('change', event => { setDuration(Number(event.target.value)); render('today'); root.querySelector('#session-duration').focus(); });
    root.querySelector('#start-study')?.addEventListener('click', () => { makeStudySession(state, course, legacyRecords(), Date.now(), getDuration()); persist(); render('today'); root.querySelector('#learning-title').focus(); });
    root.querySelector('#study-next')?.addEventListener('click', () => {
      const session = state.session;
      if (!session.completed.includes(session.phase)) session.completed.push(session.phase);
      if (session.phase === studyPhases(session.duration).length - 1) session.finished = true; else session.phase++;
      persist(); render('today'); root.querySelector('#learning-title').focus();
    });
    root.querySelector('#study-back')?.addEventListener('click', () => { state.session.phase--; persist(); render('today'); root.querySelector('#learning-title').focus(); });
    root.querySelector('#review-next')?.addEventListener('click', () => { const session = state.session; session.reviewIndex++; if (session.reviewIndex >= session.reviewIds.length) { session.phase = 1; if (!session.completed.includes(0)) session.completed.push(0); } persist(); render('today'); root.querySelector('#learning-title').focus(); });
    root.querySelector('#open-study-topic')?.addEventListener('click', () => openTopic(state.session.topicId));
    root.querySelector('#study-topic-check')?.addEventListener('click', () => startTopicCheck(documents.get(state.session.topicId).stem));
    root.querySelector('#study-diagnostic')?.addEventListener('click', () => startTopicCheck(documents.get(state.session.topicId).stem));
    for (const button of root.querySelectorAll('[data-practice-topic]')) button.onclick = () => openPractice(button.dataset.practiceTopic, button.dataset.practiceMode === 'recall');
    for (const button of root.querySelectorAll('[data-audit-topic]')) button.onclick = () => { const doc = course.documents.find(document => document.stem === button.dataset.auditTopic); if (doc) openTopic(doc.id); };
    root.querySelector('#pilot-form')?.addEventListener('submit', event => {
      event.preventDefault();
      const scoreText = root.querySelector('#pilot-score').value, totalText = root.querySelector('#pilot-total').value;
      if ((scoreText === '') !== (totalText === '') || (scoreText !== '' && Number(scoreText) > Number(totalText))) { root.querySelector('#pilot-error').textContent = 'Enter both score and total, with score no greater than total, or leave both empty.'; return; }
      state.pilot.push({ at: Date.now(), stage: root.querySelector('#pilot-stage').value, score: scoreText === '' ? null : Number(scoreText), total: totalText === '' ? null : Number(totalText), note: root.querySelector('#pilot-note').value.slice(0, 1500) });
      state.pilot = state.pilot.slice(-20); persist(); render('pilot');
    });
    root.querySelector('#export-pilot')?.addEventListener('click', () => download('radio-lab-pilot-scores.json', JSON.stringify(pilotScores(), null, 2)));
    root.querySelector('#export-review-pack')?.addEventListener('click', () => {
      for (const topicId of ordered) exposeLesson(topicId);
      download('radio-lab-instructor-review.json', JSON.stringify({ status: 'Human review pending; includes practice answer keys for review', syllabus: EXAM_SOURCES.syllabus, reference: EXAM_SOURCES.reference, corrections, topics: ordered.map(topicId => { const document = documents.get(topicId), a = activity(topicId), challenge = createChallenge(a, 2, 0); return { title: document.title, topic: document.stem, model: a.model, controls: a.controls, teaching: guideFor(a), questions: questions.filter(question => question.topic === document.stem), transferTask: { prompt: challenge.prompt, givens: challenge.givens, initial: challenge.initial, target: challenge.target, answer: challenge.answer, unit: challenge.unit, solution: challenge.solution, model: challenge.model }, review: { terms: 'pending', mechanism: 'pending', workedExample: 'pending', visualStates: 'pending', questions: 'pending' } }; }) }, null, 2));
    });
    if (!id || !ordered.includes(id)) return;
    const document = documents.get(id), task = taskFor(id), challenge = createChallenge(activity(id), task.level, task.seed);
    const newTask = level => {
      resetTask(id, level); render(`practice/${id}`); root.querySelector('#learning-title').focus();
    };
    root.querySelector('#task-level').onchange = event => { newTask(Number(event.target.value)); root.querySelector('#task-level').focus(); };
    root.querySelector('#task-new')?.addEventListener('click', () => newTask(task.level));
    root.querySelector('#task-lesson').onclick = () => { if (!task.checked && task.level === 2) { task.hint = 2; persist(); } openTopic(id); };
    root.querySelector('#task-answer')?.addEventListener('input', event => {
      const input = event.target, invalid = input.value.length > 80;
      input.setCustomValidity(invalid ? 'Use at most 80 characters for the number.' : '');
      root.querySelector('#task-input-status').textContent = invalid ? 'That number is too long to save. Shorten it to 80 characters or fewer.' : '';
      if (!invalid) { task.answer = input.value; persist(); }
    });
    root.querySelector('#task-confidence').onchange = event => { task.confidence = event.target.value; persist(); };
    for (const input of root.querySelectorAll('[data-task-control]')) input.onchange = () => {
      if (!input.checkValidity() || input.value === '') { input.reportValidity(); return; }
      const control = challenge.controls.find(control => control.key === input.dataset.taskControl);
      task.values[control.key] = validControlValue(control, input.value); persist();
      root.querySelector('#task-diagram').innerHTML = challengeDiagram(challenge, task.values);
    };
    root.querySelector('#task-hint')?.addEventListener('click', () => { task.hint = Math.min(2, task.hint + 1); persist(); render(`practice/${id}`); root.querySelector('.task-hints').focus(); });
    root.querySelector('#task-form').onsubmit = event => {
      event.preventDefault(); if (task.checked) return;
      const feedback = evaluateChallenge(challenge, task.values, task.answer);
      task.checked = true; task.correct = feedback.correct;
      if (task.level === 2 && !task.hint) recordReview(state, document, feedback.correct, task.confidence);
      persist(); render(`practice/${id}`); root.querySelector('#task-feedback').focus();
    };
    bindCoach(document, task.values);
  }

  return { render, openPractice, coachCard, bindCoach, sessionBanner, exposeLesson, recordExam: stats => { if (absorbExamEvidence(state, stats, course)) persist(); } };
}
