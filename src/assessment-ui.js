import { questions } from './question-bank.js';
import { EXAM, EXAM_SOURCES } from './exam-spec.js';
import { ASSESSMENT_KEY, createSession, loadAssessment, questionById, answerQuestion, checkAnswer, finishSession, expireSession, scoreSession, topicStatus } from './assessment.js';
import { questionDiagram } from './question-diagrams.js';
import { escapeHtml as esc } from './activities.js';

const link = (url, label) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
const timeText = deadline => { const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; };

export function createAssessmentUI({ root, course, backToLearning, openTopic, onEvidence }) {
  let storage;
  try { storage = localStorage; } catch { storage = { getItem() { throw new Error('Storage unavailable'); } }; }
  const saved = loadAssessment(storage), state = saved.state;
  const topicDocuments = new Map(course.documents.map(document => [document.stem, document]));
  let overview = false, confirming = false, message = '';

  function persist() {
    onEvidence?.(state.stats);
    if (!saved.writable) return;
    try { storage.setItem(ASSESSMENT_KEY, JSON.stringify(state)); }
    catch {
      saved.writable = false; saved.warning = 'Assessment results cannot be saved in this browser. This session still works.';
      const status = root.querySelector('#assessment-save-status'); if (status) status.textContent = saved.warning;
    }
  }

  onEvidence?.(state.stats);

  function enter() {
    if (location.hash === '#assessment') render(); else location.hash = 'assessment';
  }

  function start(selection) {
    if (state.session && state.session.submittedAt === null) {
      overview = false; message = 'Your unfinished paper is saved. Finish or submit it before starting another.'; enter(); return;
    }
    try { state.session = createSession(selection); overview = false; confirming = false; message = ''; persist(); enter(); }
    catch (error) { message = error.message; overview = true; enter(); }
  }

  function startTopic(topic) { start({ mode: 'topic', topics: [topic], label: topicDocuments.get(topic)?.title || topic }); }

  function topicCard(topic) {
    const status = topicStatus(state, topic);
    return `<section class="knowledge-card" aria-labelledby="knowledge-title"><div><span class="small-label">Check what you can apply</span><h2 id="knowledge-title">Test this topic</h2><p>${status.answered ? `${status.correct} correct from ${status.answered} checked; ${status.total} questions in this topic.${status.weak ? ' Revisit the missed ideas.' : ''}` : `${status.total} marked questions, including applying the idea. Feedback follows your answer.`}</p></div><button class="primary-button" data-check-topic="${esc(topic)}">Start topic check</button></section>`;
  }

  function hub() {
    const weak = Object.keys(state.stats).filter(id => !state.stats[id].correct);
    const checkedTopics = [...new Set(questions.map(question => question.topic))].filter(topic => { const result = topicStatus(state, topic); return result.answered === result.total; }).length;
    return `<div class="assessment-intro"><p>Knowledge checks and exam rehearsal</p><h1 id="assessment-title" tabindex="-1">Find out what you can apply</h1><p>Exploring a lesson and answering independently are different records. ${checkedTopics}/86 topics have all practice questions checked.</p></div>
      ${state.session?.submittedAt === null ? `<section class="assessment-panel resume-paper"><h2>A paper is in progress</h2><p>${esc(state.session.label)} · ${state.session.paper.filter(item => item.answer !== null).length}/${state.session.paper.length} answered${state.session.deadline ? ` · <span id="exam-time">${timeText(state.session.deadline)}</span> remaining. The timer continues.` : ''}</p><button id="resume-paper" class="primary-button">Resume saved paper</button></section>` : ''}
      <div class="assessment-grid"><section class="assessment-panel"><span class="small-label">Foundation exam format</span><h2>Full mock examination</h2><p><strong>${EXAM.questions} questions · ${EXAM.minutes} minutes · pass benchmark ${EXAM.pass}/${EXAM.questions}</strong></p><p>English, four options and one correct answer. The paper follows the RSGB section allocation. Change answers, flag questions and return to them. Solutions appear after submission.</p><div class="assessment-start"><button id="start-timed" class="primary-button">Start 60-minute mock</button><button id="start-untimed" class="subtle-button">Start untimed rehearsal</button></div><p class="source-caption">The timed paper starts only when you choose it. Its deadline survives leaving or reloading the page.</p></section>
      <section class="assessment-panel"><span class="small-label">Target the gaps</span><h2>Practise missed questions</h2><p>${weak.length} question${weak.length === 1 ? '' : 's'} currently need another attempt. Answers and explanations appear after you check each response.</p><button id="start-weak" class="primary-button" ${weak.length ? '' : 'disabled'}>Practise missed questions</button><p class="source-caption">Your first checked answer is preserved for that attempt. A new attempt records new evidence.</p></section></div>
      <section class="assessment-panel"><h2>Module practice</h2><p>Check a whole module without a timer. Progress is saved so you can continue later.</p><div class="module-checks">${course.modules.map(module => { const stems = module.topics.map(id => course.documents.find(document => document.id === id).stem); const count = questions.filter(question => stems.includes(question.topic)).length; return `<button data-check-module="${module.number}" class="subtle-button"><strong>${module.number}. ${esc(module.title)}</strong><span>${count} questions</span></button>`; }).join('')}</div></section>
      <section class="assessment-panel official-resources"><h2>Use the real reference material</h2><p><a href="#reference-book">Read EX307 in Radio Lab format</a></p><p>${link(EXAM_SOURCES.referenceLocal, 'EX307 exam reference booklet')} · ${link(EXAM_SOURCES.syllabus, 'RSGB syllabus v1.6b, March 2026')}</p><p>Official RSGB practice papers: ${EXAM_SOURCES.papers.map((url, i) => link(url, `Paper ${i + 1}`)).join(' · ')}</p><p class="source-caption">The ${questions.length} in-app questions are original independent practice material. Official papers are supplied by RSGB at the linked pages. This app is not endorsed by RSGB. Format checked ${EXAM.checked}.</p></section>
      ${state.history.length ? `<section class="assessment-panel"><h2>Recent attempts</h2><table class="assessment-table"><thead><tr><th>Attempt</th><th>Result</th><th>When</th></tr></thead><tbody>${state.history.map(item => `<tr><td>${esc(item.label)}</td><td>${item.correct}/${item.total}</td><td>${esc(new Date(item.at).toLocaleDateString('en-GB'))}</td></tr>`).join('')}</tbody></table><p class="source-caption">Repeat-bank familiarity can raise scores. These results do not guarantee a real-exam pass.</p></section>` : ''}`;
  }

  function feedback(item, question) {
    return `<div class="answer-feedback ${item.answer === question.correct ? 'correct' : 'incorrect'}" id="answer-feedback" tabindex="-1"><h2>${item.answer === question.correct ? 'Correct' : 'Revisit this idea'}</h2><p><strong>Correct answer:</strong> ${esc(question.options[question.correct])}</p><p>${esc(question.explanation)}</p><p class="source-caption">Syllabus ${esc(question.code)} · ${link(EXAM_SOURCES.syllabus, 'Source specification')}</p><button class="text-button" data-revisit="${esc(question.topic)}">Revisit the lesson</button></div>`;
  }

  function paper() {
    const session = state.session, item = session.paper[session.index], question = questionById.get(item.id);
    const answered = session.paper.filter(item => item.answer !== null).length;
    return `<header class="paper-heading"><div><span class="small-label">${session.mode === 'mock' ? 'Foundation mock examination' : 'Marked practice'}</span><h1 id="assessment-title" tabindex="-1">${esc(session.label)}</h1></div><div class="paper-clock">${session.deadline ? `<span>Time remaining</span><strong id="exam-time">${timeText(session.deadline)}</strong>` : '<span>No time limit</span>'}</div></header>
      <div class="paper-toolbar"><span>${answered}/${session.paper.length} answered · ${session.paper.filter(item => item.flag).length} flagged</span>${link(EXAM_SOURCES.referenceLocal, 'Open permitted EX307 booklet')}<button id="paper-overview" class="text-button">Assessment overview</button></div>
      <div class="paper-layout"><section class="assessment-panel question-panel"><p class="small-label">Question ${session.index + 1} of ${session.paper.length}${question.reference ? ' · use EX307' : ''}</p>
      <fieldset class="answer-options" ${item.checked ? 'disabled' : ''}><legend>${esc(question.prompt)}</legend>${questionDiagram(question.diagram)}${item.order.map((option, i) => `<label class="answer-option"><input type="radio" name="answer" value="${option}" ${item.answer === option ? 'checked' : ''}/><span class="option-letter">${String.fromCharCode(65 + i)}</span><span>${esc(question.options[option])}</span></label>`).join('')}</fieldset>
      ${item.checked ? feedback(item, question) : session.mode === 'mock' ? '<p class="source-caption">Your answer is saved. Marking and explanations follow submission.</p>' : `<button id="check-answer" class="primary-button" ${item.answer === null ? 'disabled' : ''}>Check answer</button>`}
      <div class="paper-navigation"><button id="previous-question" class="subtle-button" ${session.index === 0 ? 'disabled' : ''}>Previous question</button><button id="flag-question" class="subtle-button" aria-pressed="${item.flag}">${item.flag ? 'Flagged for review' : 'Flag for review'}</button><button id="next-question" class="primary-button" ${session.index === session.paper.length - 1 ? 'disabled' : ''}>Next question</button></div></section>
      <aside class="assessment-panel question-map" aria-label="Question overview"><h2>Your paper</h2><p class="source-caption">Filled: answered · ◇: flagged</p><div class="question-numbers">${session.paper.map((entry, index) => `<button data-question="${index}" class="${entry.answer !== null ? 'answered' : ''} ${entry.flag ? 'flagged' : ''}" ${index === session.index ? 'aria-current="step"' : ''} aria-label="Question ${index + 1}${entry.answer !== null ? ', answered' : ', unanswered'}${entry.flag ? ', flagged' : ''}">${index + 1}${entry.flag ? '<span aria-hidden="true">◇</span>' : ''}</button>`).join('')}</div><button id="finish-paper" class="primary-button">Finish and review paper</button><p class="source-caption">No marks are deducted for a wrong answer. An unanswered question scores zero.</p></aside></div>
      ${confirming ? `<section class="assessment-panel submit-confirmation" role="region" aria-labelledby="submit-title"><h2 id="submit-title" tabindex="-1">Submit this paper?</h2><p>${session.paper.length - answered} unanswered · ${session.paper.filter(item => item.flag).length} flagged. You can return and change unchecked answers before submitting.</p><div class="assessment-start"><button id="return-paper" class="subtle-button">Return to paper</button><button id="submit-paper" class="primary-button">Submit and mark</button></div></section>` : ''}`;
  }

  function results() {
    const session = state.session, result = scoreSession(session);
    const missed = session.paper.filter(item => item.answer !== questionById.get(item.id).correct);
    return `<header class="assessment-intro"><span class="small-label">${session.reason === 'time' ? 'Time ended — paper submitted' : 'Paper submitted'}</span><h1 id="assessment-title" tabindex="-1">${result.correct} / ${result.total} correct</h1><p>${session.mode === 'mock' ? result.passed ? 'Practice pass benchmark reached.' : `Below the ${EXAM.pass}/${EXAM.questions} practice pass benchmark.` : 'Review the explanation and then try a fresh situation.'} ${result.unanswered} unanswered.</p><p class="source-caption">A practice result is evidence from these questions, not a validated prediction of your real-exam result.</p></header>
      <div class="assessment-start"><button id="results-overview" class="primary-button">Choose next practice</button><button id="retry-missed" class="subtle-button" ${missed.length ? '' : 'disabled'}>Practise these missed questions</button></div>
      <section class="assessment-panel"><h2>Results by exam section</h2><table class="assessment-table"><thead><tr><th>Section</th><th>Correct</th></tr></thead><tbody>${result.sections.map(section => `<tr><td>${esc(section.name)}</td><td>${section.correct}/${section.total}</td></tr>`).join('')}</tbody></table></section>
      <section class="assessment-panel"><h2>Answer review</h2><p>Missed questions appear first. Open a question to see your answer, the key and the explanation.</p>${[...missed, ...session.paper.filter(item => item.answer === questionById.get(item.id).correct)].map(item => { const question = questionById.get(item.id); return `<details class="result-question"><summary>${item.answer === question.correct ? '✓' : '↻'} ${esc(question.prompt)}</summary>${questionDiagram(question.diagram)}<p><strong>Your answer:</strong> ${item.answer === null ? 'Unanswered' : esc(question.options[item.answer])}</p>${feedback(item, question).replace('id="answer-feedback"', '')}</details>`; }).join('')}</section>`;
  }

  function render() {
    if (expireSession(state)) { confirming = false; overview = false; persist(); }
    const showHub = overview || !state.session;
    root.innerHTML = `<main class="assessment-workspace"><nav class="assessment-top"><button id="back-learning" class="subtle-button">Back to learning</button><span>Radio Lab · Foundation</span></nav>${message ? `<p class="notice" role="status">${esc(message)}</p>` : ''}${saved.warning ? `<p class="notice" role="status">${esc(saved.warning)}</p>` : ''}${showHub ? hub() : state.session.submittedAt !== null ? results() : paper()}<p class="assessment-save" id="assessment-save-status">${saved.writable ? 'Answers and results saved only in this browser.' : esc(saved.warning)}</p></main>`;
    root.querySelector('#back-learning').onclick = backToLearning;
    root.querySelector('#resume-paper')?.addEventListener('click', () => { overview = false; render(); });
    root.querySelector('#start-timed')?.addEventListener('click', () => start({ mode: 'mock', timed: true, label: 'Foundation · timed mock' }));
    root.querySelector('#start-untimed')?.addEventListener('click', () => start({ mode: 'mock', label: 'Foundation · untimed rehearsal' }));
    root.querySelector('#start-weak')?.addEventListener('click', () => start({ mode: 'weak', ids: Object.keys(state.stats).filter(id => !state.stats[id].correct), label: 'Missed-question practice' }));
    for (const button of root.querySelectorAll('[data-check-module]')) button.onclick = () => { const module = course.modules.find(module => module.number === Number(button.dataset.checkModule)); start({ mode: 'module', topics: module.topics.map(id => course.documents.find(document => document.id === id).stem), label: `Module ${module.number}: ${module.title}` }); };
    for (const button of root.querySelectorAll('[data-revisit]')) button.onclick = () => openTopic(topicDocuments.get(button.dataset.revisit).id);
    const session = state.session;
    for (const input of root.querySelectorAll('input[name="answer"]')) input.onchange = () => {
      answerQuestion(state, session.index, Number(input.value)); persist();
      if (session.submittedAt !== null) { render(); return; }
      const check = root.querySelector('#check-answer'); if (check) check.disabled = false;
      const number = root.querySelector(`[data-question="${session.index}"]`); number?.classList.add('answered');
      if (number) number.setAttribute('aria-label', `Question ${session.index + 1}, answered${session.paper[session.index].flag ? ', flagged' : ''}`);
      root.querySelector('.paper-toolbar > span').textContent = `${session.paper.filter(item => item.answer !== null).length}/${session.paper.length} answered · ${session.paper.filter(item => item.flag).length} flagged`;
    };
    root.querySelector('#check-answer')?.addEventListener('click', () => { checkAnswer(state, session.index); persist(); render(); root.querySelector('#answer-feedback')?.focus(); });
    const move = index => { session.index = index; confirming = false; persist(); render(); root.querySelector('#assessment-title').focus({ preventScroll: true }); };
    root.querySelector('#previous-question')?.addEventListener('click', () => move(session.index - 1));
    root.querySelector('#next-question')?.addEventListener('click', () => move(session.index + 1));
    for (const button of root.querySelectorAll('[data-question]')) button.onclick = () => move(Number(button.dataset.question));
    root.querySelector('#flag-question')?.addEventListener('click', () => { session.paper[session.index].flag = !session.paper[session.index].flag; persist(); render(); root.querySelector('#flag-question')?.focus(); });
    root.querySelector('#finish-paper')?.addEventListener('click', () => { confirming = true; render(); root.querySelector('#submit-title')?.focus(); });
    root.querySelector('#return-paper')?.addEventListener('click', () => { confirming = false; render(); });
    root.querySelector('#submit-paper')?.addEventListener('click', () => { finishSession(state); confirming = false; persist(); render(); root.querySelector('#assessment-title').focus(); });
    for (const id of ['paper-overview', 'results-overview']) root.querySelector(`#${id}`)?.addEventListener('click', () => { overview = true; confirming = false; message = ''; render(); });
    root.querySelector('#retry-missed')?.addEventListener('click', () => start({ mode: 'weak', ids: session.paper.filter(item => item.answer !== questionById.get(item.id).correct).map(item => item.id), label: 'Review this paper’s missed questions' }));
  }

  setInterval(() => {
    if (!state.session || state.session.submittedAt !== null || state.session.deadline === null) return;
    const ended = expireSession(state);
    if (ended) persist();
    if (location.hash !== '#assessment') return;
    if (ended) { overview = false; confirming = false; render(); return; }
    const clock = root.querySelector('#exam-time'); if (clock) clock.textContent = timeText(state.session.deadline);
  }, 1000);

  return { render, startTopic, topicCard };
}
