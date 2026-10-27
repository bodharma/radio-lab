import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createChallenge } from '../../src/challenges.js';
import { activityFor } from '../../src/activities.js';
import { LEARNING_KEY, DAY } from '../../src/learning.js';
import { ASSESSMENT_KEY } from '../../src/assessment.js';

const topic = stem => `/#${encodeURIComponent(`Topics/${stem}`)}`;
const practice = stem => `/#${encodeURIComponent(`practice/Topics/${stem}`)}`;
const course = JSON.parse(await readFile(new URL('../../public/course.json', import.meta.url), 'utf8'));
const authored = course.provenance === 'authored-public';

test('a study session follows course order and resumes its exact step after lesson navigation and reload', async ({ page }) => {
  await page.goto('/#today');
  await page.getByRole('button', { name: 'Start my study session', exact: true }).click();
  await expect(page.locator('#learning-title')).toHaveText('Recall earlier topics');
  await page.getByRole('button', { name: 'I’m ready for the next step', exact: true }).click();
  await expect(page.locator('#learning-title')).toHaveText('Explore the next topic');
  await page.locator('#open-study-topic').click();
  await expect(page.locator('.study-resume')).toContainText('step 2/5');
  await page.reload();
  await page.getByRole('link', { name: 'Return to my study session', exact: true }).click();
  await expect(page.locator('#learning-title')).toHaveText('Explore the next topic');
  await page.locator('#study-next').click();
  await page.reload();
  await expect(page.locator('#learning-title')).toHaveText('Take a break');
  expect(await page.locator('audio,video').count()).toBe(0);
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), LEARNING_KEY);
  expect(saved.session.topicId).toBe(course.modules[0].topics[0]);
});

test('written tutor identifies a carrier-message confusion and preserves an escaped conversation', async ({ page }) => {
  await page.goto(topic('Radio_Signals'));
  await page.getByLabel('Fault to inspect', { exact: true }).selectOption('modulator');
  await page.getByLabel('Your explanation or question', { exact: true }).fill('The message is missing so there is no carrier. <img src=x onerror=alert(1)>');
  await page.getByRole('button', { name: 'Discuss my explanation', exact: true }).click();
  await expect(page.locator('.coach-turn.coach')).toContainText('leaves a carrier');
  await expect(page.locator('.coach-transcript img')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.coach-turn.learner')).toContainText('<img');
  await expect(page.locator('.coach-turn.coach')).toContainText('receiver detects RF');
});

test('independent numerical work hides coaching, locks its first result, schedules recall and changes givens', async ({ page }) => {
  await page.goto(practice('Batteries'));
  await page.getByLabel('Support', { exact: true }).selectOption('2');
  await expect(page.locator('.coach-panel,#task-hint,.task-hints')).toHaveCount(0);
  const task = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).tasks['Topics/Batteries'], LEARNING_KEY);
  const challenge = createChallenge(activityFor({ stem: 'Batteries' }, 2), task.level, task.seed);
  await page.getByLabel(`Your calculated answer (${challenge.unit})`, { exact: true }).fill(String(challenge.answer));
  await page.getByLabel('How certain are you?', { exact: true }).selectOption('sure');
  await page.getByRole('button', { name: 'Check my solution', exact: true }).click();
  await expect(page.locator('#task-feedback')).toContainText('Independent attempt recorded');
  await expect(page.locator('#task-feedback')).toContainText('conditions are met');
  await expect(page.locator('#task-answer')).toBeDisabled();
  await expect(page.locator('.coach-panel')).toBeVisible();
  await page.reload();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), LEARNING_KEY);
  expect(saved.reviews['Topics/Batteries'].attempts).toBe(1);
  expect(saved.reviews['Topics/Batteries'].due - saved.reviews['Topics/Batteries'].at).toBe(DAY);
  const oldPrompt = await page.locator('.task-prompt').textContent();
  await page.getByRole('button', { name: 'Try a fresh version', exact: true }).click();
  expect(await page.locator('.task-prompt').textContent()).not.toBe(oldPrompt);
});

test('action tasks reject the wrong fault, and opening a lesson prevents an independent-recall claim', async ({ page }) => {
  await page.goto(practice('Radio_Signals'));
  await page.getByLabel('Support', { exact: true }).selectOption('2');
  await page.getByLabel('Fault to inspect', { exact: true }).selectOption('modulator');
  await page.getByRole('button', { name: 'Check my solution', exact: true }).click();
  await expect(page.locator('#task-feedback')).toContainText('does not yet meet');
  await page.getByRole('button', { name: 'Try a fresh version', exact: true }).click();
  await page.getByRole('button', { name: 'Open the lesson', exact: true }).click();
  await page.goto(practice('Radio_Signals'));
  await page.getByLabel('Fault to inspect', { exact: true }).selectOption('modulator');
  await page.getByRole('button', { name: 'Check my solution', exact: true }).click();
  await expect(page.locator('#task-feedback')).toContainText('Supported practice');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), LEARNING_KEY);
  expect(saved.reviews['Topics/Radio_Signals'].attempts).toBe(1);
});

test('marked examination evidence reaches the recall schedule once without changing legacy progress', async ({ page }) => {
  await page.goto(topic('Batteries'));
  await page.getByRole('button', { name: 'Start topic check', exact: true }).click();
  await page.locator('input[name="answer"][value="1"]').check();
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await page.reload();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), LEARNING_KEY);
  expect(saved.reviews['Topics/Batteries'].correct).toBe(false);
  expect(saved.reviews['Topics/Batteries'].attempts).toBe(1);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).session.mode, ASSESSMENT_KEY)).toBe('topic');
});

test('specific corrections and pilot exports contain evidence without private learner text', async ({ page }) => {
  await page.goto(topic('Amateur_Radio_Licence'));
  if (authored) await expect(page.locator('.source-correction-detail,.content-correction')).toHaveCount(0);
  else await expect(page.locator('.source-correction-detail').first()).toBeVisible();
  await page.goto('/#pilot');
  await expect(page.locator('.learning-intro')).toContainText('still pending');
  if (authored) await expect(page.locator('.audit-entry')).toHaveCount(0);
  else expect(await page.locator('.audit-entry').count()).toBeGreaterThan(0);
  await page.getByLabel('Correct', { exact: true }).fill('4');
  await page.getByLabel('Out of', { exact: true }).fill('5');
  await page.getByLabel('Private note', { exact: false }).fill('PRIVATE learner observation');
  await page.getByRole('button', { name: 'Save observation on this device', exact: true }).click();
  await expect(page.locator('.assessment-panel').nth(1)).toContainText('4/5');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download scores without private text', exact: true }).click();
  const download = await downloaded;
  const text = await readFile(await download.path(), 'utf8');
  expect(text).toContain('"score": 4');
  expect(text).not.toContain('PRIVATE');
  expect(text).not.toContain('note');
  const scores = JSON.parse(text);
  expect(Object.keys(scores.observations[0]).sort()).toEqual(['date', 'score', 'stage', 'total']);
  expect(scores.observations[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await page.getByText('Preview scores export (UTC dates only)', { exact: true }).click();
  await expect(page.locator('.pilot-preview pre')).toHaveText(text);
  const packDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download instructor review pack', exact: true }).click();
  const pack = JSON.parse(await readFile(await (await packDownload).path(), 'utf8'));
  expect(pack.topics.length).toBe(86);
  expect(pack.topics[0].teaching.steps.length).toBeGreaterThan(2);
  expect(pack.topics[0].questions.length).toBeGreaterThan(1);
  if (authored) expect(pack.corrections).toEqual([]);
  else expect(pack.corrections.length).toBeGreaterThan(0);
  expect(JSON.stringify(pack)).not.toContain('PRIVATE');
});

test('corrupt learning data is preserved and mobile practice fits without horizontal scrolling', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, '{broken-learning'), LEARNING_KEY);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(practice('Batteries'));
  await expect(page.locator('[data-learning-save]').last()).toContainText('preserved');
  await page.getByLabel('Your calculated answer (V)', { exact: true }).fill('4.5');
  await page.getByRole('button', { name: 'Check my solution', exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), LEARNING_KEY)).toBe('{broken-learning');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/learning-mobile.png' });
});

test('all ordered topics open a checked practical task without application errors', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#today');
  for (const module of course.modules) for (const id of module.topics) {
    await page.evaluate(id => { location.hash = encodeURIComponent(`practice/${id}`); }, id);
    await expect(page.locator('.practical-task')).toHaveAttribute('data-task-topic', id);
    await expect(page.locator('#task-diagram svg')).toHaveCount(1);
  }
  expect(errors).toEqual([]);
  await page.goto('/#today');
  await page.screenshot({ path: 'test-results/learning-desktop.png' });
});

test('oversized numeric input cannot corrupt saved learning and showing a hint keeps keyboard focus', async ({ page }) => {
  await page.goto(practice('Batteries'));
  await page.locator('#task-answer').fill('1'.repeat(81));
  await expect(page.locator('#task-input-status')).toContainText('too long to save');
  expect((await page.evaluate(key => JSON.parse(localStorage.getItem(key)).tasks['Topics/Batteries'], LEARNING_KEY)).answer).toBe('');
  await page.reload();
  await expect(page.locator('[data-learning-save]').last()).toContainText('saved on this device');
  await page.getByRole('button', { name: 'Show one hint', exact: true }).click();
  await expect(page.locator('.task-hints')).toBeFocused();
  await page.locator('#task-level').selectOption('0');
  await expect(page.locator('#task-level')).toBeFocused();
});

test('failed saves are visible immediately and blank numeric answers remain editable', async ({ page }) => {
  await page.goto(practice('Batteries'));
  await page.getByRole('button', { name: 'Check my solution', exact: true }).click();
  await expect(page.locator('#task-feedback')).toHaveCount(0);
  await expect(page.locator('#task-answer')).toBeEditable();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw Error('Quota full'); }; });
  await page.locator('#task-answer').fill('4.5');
  await expect(page.locator('[data-learning-save]').last()).toContainText('cannot be saved');
  await expect(page.locator('#task-answer')).toBeFocused();
});

test('due reviews start a fresh independent task and source-correction navigation reaches the exact claim', async ({ page }) => {
  await page.goto(practice('Batteries'));
  await expect(page.locator('.practical-task')).toBeVisible();
  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key));
    const document = { id: 'Topics/Batteries' };
    state.reviews[document.id] = { at: 1, due: 2, successes: 1, attempts: 1, correct: true, confidence: 'sure', hash: state.tasks[document.id].hash };
    localStorage.setItem(key, JSON.stringify(state));
  }, LEARNING_KEY);
  await page.reload();
  await page.goto('/#today');
  await page.locator('.due-list').getByRole('button', { name: 'Batteries', exact: true }).click();
  await expect(page.locator('#task-level')).toHaveValue('2');
  await expect(page.locator('.coach-panel,.task-hints')).toHaveCount(0);
  await page.goto(topic('Amateur_Radio_Licence'));
  if (authored) {
    await expect(page.locator('.guided-explanation')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Read source corrections', exact: true })).toHaveCount(0);
    await expect(page.locator('.source-correction-detail')).toHaveCount(0);
  } else {
    await page.getByRole('button', { name: 'Read source corrections', exact: true }).click();
    await expect(page.locator('.source-correction-detail summary').first()).toBeFocused();
    await expect(page.locator('.source-correction-detail blockquote').first()).not.toBeEmpty();
  }
});

test('every lesson route marks an unfinished independent task as supported', async ({ page }) => {
  await page.goto(practice('Batteries'));
  await page.locator('#task-level').selectOption('2');
  await page.getByRole('button', { name: 'Back to learning', exact: true }).click();
  await expect(page.locator('#lesson-title')).toHaveText('Batteries');
  await page.goto(practice('Batteries'));
  let task = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).tasks['Topics/Batteries'], LEARNING_KEY);
  expect(task.hint).toBe(2);
  await page.locator('#task-level').selectOption('2');
  await page.goto(topic('Batteries'));
  await page.goto(practice('Batteries'));
  task = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).tasks['Topics/Batteries'], LEARNING_KEY);
  const challenge = createChallenge(activityFor({ stem: 'Batteries' }, 2), 2, task.seed);
  await page.locator('#task-answer').fill(String(challenge.answer));
  await page.getByRole('button', { name: 'Check my solution', exact: true }).click();
  await expect(page.locator('#task-feedback')).toContainText('Supported practice');
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), LEARNING_KEY);
  expect(state.reviews['Topics/Batteries']).toBeUndefined();
});
