import { test, expect } from '@playwright/test';
import { questions } from '../../src/question-bank.js';
import { ASSESSMENT_KEY } from '../../src/assessment.js';

const topicUrl = stem => `/#${encodeURIComponent(`Topics/${stem}`)}`;

test('a topic check marks answers, explains mistakes and preserves the first response', async ({ page }) => {
  await page.goto(topicUrl('Batteries'));
  await page.getByRole('button', { name: 'Start topic check', exact: true }).click();
  await expect(page.locator('#assessment-title')).toHaveText('Batteries');
  await expect(page.locator('.answer-feedback')).toHaveCount(0);
  await page.locator('input[name="answer"][value="1"]').check();
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.locator('#answer-feedback')).toContainText('Revisit this idea');
  await expect(page.locator('#answer-feedback')).toContainText('Correct answer:');
  await expect(page.locator('input[name="answer"]').first()).toBeDisabled();
  await page.reload();
  await expect(page.locator('#answer-feedback')).toBeVisible();
  await expect(page.locator('input[name="answer"][value="1"]')).toBeChecked();
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), ASSESSMENT_KEY);
  expect(state.stats[state.session.paper[0].id].attempts).toBe(1);
  await page.getByRole('button', { name: 'Finish and review paper', exact: true }).click();
  await page.getByRole('button', { name: 'Submit and mark', exact: true }).click();
  await expect(page.locator('#assessment-title')).toHaveText('0 / 2 correct');
  await page.getByRole('button', { name: 'Back to learning', exact: true }).click();
  await expect(page.locator('.knowledge-card')).toContainText('0 correct from 1 checked');
});

test('a full mock keeps answers hidden, supports flags and marks the 19/26 boundary', async ({ page }) => {
  await page.goto('/#assessment');
  await page.getByRole('button', { name: 'Start untimed rehearsal', exact: true }).click();
  await expect(page.locator('.question-numbers button')).toHaveCount(26);
  await expect(page.locator('#check-answer, .answer-feedback')).toHaveCount(0);
  await page.getByRole('button', { name: 'Flag for review', exact: true }).click();
  for (let i = 0; i < 19; i++) {
    await page.locator('input[name="answer"][value="0"]').check();
    if (i < 18) await page.getByRole('button', { name: 'Next question', exact: true }).click();
  }
  await expect(page.locator('.answer-feedback')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('input[name="answer"][value="0"]')).toBeChecked();
  await expect(page.locator('.question-numbers .flagged')).toHaveCount(1);
  await page.getByRole('button', { name: 'Finish and review paper', exact: true }).click();
  await expect(page.locator('.submit-confirmation')).toContainText('7 unanswered');
  await page.getByRole('button', { name: 'Submit and mark', exact: true }).click();
  await expect(page.locator('#assessment-title')).toHaveText('19 / 26 correct');
  await expect(page.locator('.assessment-intro')).toContainText('Practice pass benchmark reached');
  await expect(page.locator('.result-question')).toHaveCount(26);
  await page.locator('.result-question').first().locator('summary').click();
  await expect(page.locator('.result-question').first()).toContainText('Correct answer:');
});

test('a timed deadline survives reload and expired papers submit without restarting the clock', async ({ page }) => {
  await page.goto('/#assessment');
  await page.getByRole('button', { name: 'Start 60-minute mock', exact: true }).click();
  const deadline = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).session.deadline, ASSESSMENT_KEY);
  await page.reload();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).session.deadline, ASSESSMENT_KEY)).toBe(deadline);
  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key));
    state.session.startedAt = Date.now() - 3600001;
    state.session.deadline = state.session.startedAt + 3600000;
    localStorage.setItem(key, JSON.stringify(state));
  }, ASSESSMENT_KEY);
  await page.reload();
  await expect(page.locator('#assessment-title')).toHaveText('0 / 26 correct');
  await expect(page.locator('.assessment-intro')).toContainText('Time ended');
  await expect(page.locator('.assessment-intro')).toContainText('26 unanswered');
});

test('starting a different check cannot silently replace an unfinished paper', async ({ page }) => {
  await page.goto('/#assessment');
  await page.getByRole('button', { name: 'Start untimed rehearsal', exact: true }).click();
  const firstId = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).session.id, ASSESSMENT_KEY);
  await page.getByRole('button', { name: 'Back to learning', exact: true }).click();
  await page.getByRole('button', { name: 'Start topic check', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('unfinished paper');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).session.id, ASSESSMENT_KEY)).toBe(firstId);
});

test('assessment storage corruption is preserved and module practice is available on mobile', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, '{broken'), ASSESSMENT_KEY);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#assessment');
  await expect(page.getByRole('status')).toContainText('will not overwrite');
  await page.locator('[data-check-module="2"]').click();
  await expect(page.locator('#assessment-title')).toContainText('Technical Basics');
  await page.locator('input[name="answer"]').first().focus();
  await page.keyboard.press('Space');
  await expect(page.locator('input[name="answer"]').first()).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(key => localStorage.getItem(key), ASSESSMENT_KEY)).toBe('{broken');
  await page.screenshot({ path: 'test-results/assessment-mobile.png' });
});

test('mock topic allocation uses the verified Foundation blueprint', async ({ page }) => {
  await page.goto('/#assessment');
  await page.getByRole('button', { name: 'Start 60-minute mock', exact: true }).click();
  const paper = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).session.paper, ASSESSMENT_KEY);
  const bank = new Map(questions.map(question => [question.id, question]));
  const counts = {};
  for (const item of paper) { const section = bank.get(item.id).section; counts[section] = (counts[section] || 0) + 1; }
  expect(counts).toEqual({ 1: 6, 2: 3, 3: 3, 4: 3, 5: 2, 6: 3, 7: 3, 8: 3 });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'test-results/assessment-desktop.png' });
});

test('an answer save failure is reported immediately without taking focus from the choice', async ({ page }) => {
  await page.goto('/#assessment');
  await page.getByRole('button', { name: 'Start untimed rehearsal', exact: true }).click();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Quota reached'); }; });
  const choice = page.locator('input[name="answer"]').first();
  await choice.check();
  await expect(page.locator('#assessment-save-status')).toContainText('cannot be saved');
  await expect(choice).toBeFocused();
});

test('finishing or flagging exactly at the deadline produces results without a focus error', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const selector of ['#finish-paper', '#flag-question']) {
    await page.goto('/#assessment');
    const nextPractice = page.getByRole('button', { name: 'Choose next practice', exact: true });
    if (await nextPractice.count()) await nextPractice.click();
    await page.getByRole('button', { name: 'Start 60-minute mock', exact: true }).click();
    await page.evaluate(({ key, selector }) => {
      const deadline = JSON.parse(localStorage.getItem(key)).session.deadline;
      Date.now = () => deadline;
      document.querySelector(selector).click();
    }, { key: ASSESSMENT_KEY, selector });
    await expect(page.locator('#assessment-title')).toHaveText('0 / 26 correct');
  }
  expect(errors).toEqual([]);
});
