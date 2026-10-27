import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { BACKUP_KEYS } from '../../src/backup.js';
import { STORAGE_KEY } from '../../src/progress.js';
import { LEARNING_KEY } from '../../src/learning.js';
import { TOOLS_KEY } from '../../src/study-tools.js';

const topic = stem => `/#${encodeURIComponent(`Topics/${stem}`)}`;
const downloadedText = async download => readFile(await download.path(), 'utf8');
const course = JSON.parse(await readFile(new URL('../../public/course.json', import.meta.url), 'utf8'));
const authored = course.provenance === 'authored-public';

test('focus mode shows one lesson panel, keeps corrections reachable and resumes the lesson from tools', async ({ page }) => {
  await page.goto(topic('Amateur_Radio_Licence'));
  await page.getByRole('button', { name: 'Focus mode: off', exact: true }).click();
  await expect(page.locator('.course-rail')).toBeHidden();
  await expect(page.locator('.workbench')).toBeVisible();
  for (const selector of ['.topic-information', '.coach-panel', '.knowledge-card']) await expect(page.locator(selector)).toBeHidden();
  if (authored) {
    await expect(page.getByRole('button', { name: 'Read source corrections', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Explanation', exact: true }).click();
    await expect(page.locator('.topic-information')).toBeVisible();
    await expect(page.locator('.lesson-copy').first()).toBeVisible();
    await expect(page.locator('.source-correction-detail')).toHaveCount(0);
  } else {
    await page.getByRole('button', { name: 'Read source corrections', exact: true }).click();
    await expect(page.locator('.topic-information')).toBeVisible();
    await expect(page.locator('.source-correction-detail summary').first()).toBeFocused();
  }
  await page.getByRole('button', { name: 'Discussion', exact: true }).click();
  await expect(page.locator('.coach-panel')).toBeVisible();
  await expect(page.locator('.workbench')).toBeHidden();
  await page.reload();
  await expect(page.locator('.coach-panel')).toBeVisible();
  await page.goto('/#tools');
  await page.getByRole('button', { name: 'Back to learning', exact: true }).click();
  await expect(page.locator('#lesson-title')).toHaveText('Amateur Radio Licence');
});

test('short sessions have the right steps, survive reload and leave the original course order available', async ({ page }) => {
  await page.goto('/#today');
  await page.getByLabel('Study time', { exact: true }).selectOption('5');
  await expect(page.locator('.study-plan li')).toHaveCount(3);
  await page.getByRole('button', { name: 'Start my study session', exact: true }).click();
  await expect(page.locator('.learning-intro')).toContainText('Step 1 of 3');
  await page.locator('#study-next').click();
  await expect(page.locator('#learning-title')).toHaveText('Solve a new situation');
  await page.reload();
  await expect(page.locator('.learning-intro')).toContainText('Step 2 of 3');
  await page.locator('#study-next').click();
  await expect(page.locator('#learning-title')).toHaveText('Check and explain');
  await page.locator('#study-next').click();
  await page.getByLabel('Study time', { exact: true }).selectOption('15');
  await expect(page.locator('.study-plan li')).toHaveCount(5);
  await page.getByRole('button', { name: 'Start my study session', exact: true }).click();
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), LEARNING_KEY);
  expect(state.session.duration).toBe(15);
  expect(state.session.topicId).toBe(course.modules[0].topics[0]);
});

test('reports capture the resolved bare-url topic and exact visible diagram controls without sending private text', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#lesson-title')).toBeVisible();
  const title = await page.locator('#lesson-title').textContent();
  await page.getByRole('button', { name: 'This is unclear', exact: true }).click();
  await page.getByLabel('Where did you get stuck?', { exact: true }).selectOption('diagram');
  await page.getByLabel('Add a private note', { exact: false }).fill('PRIVATE explanation <img src=x onerror=alert(1)>');
  await page.getByRole('button', { name: 'Save this learning obstacle', exact: true }).click();
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), TOOLS_KEY);
  expect(state.feedback[0].topicId).toBe(course.modules[0].topics[0]);
  expect(state.feedback[0].controls.length).toBeGreaterThan(0);
  await page.goto('/#tools');
  await expect(page.locator('.obstacle-list')).toContainText(title);
  await expect(page.locator('.obstacle-list img')).toHaveCount(0);
  const exported = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download feedback for review', exact: true }).click();
  const text = await downloadedText(await exported);
  expect(text).not.toContain('PRIVATE');
  expect(JSON.parse(text).entries[0].reason).toBe('diagram');
});

test('EX307 guided steps move the highlighted column and independent mode hides source-row answers until checking', async ({ page }) => {
  await page.goto('/#reference');
  await expect(page.locator('.reference-highlight h3')).toHaveText('Frequency / interval');
  await page.getByRole('button', { name: 'Next lookup step', exact: true }).click();
  await expect(page.locator('.reference-highlight h3')).toHaveText('Power / relevant column');
  await page.getByLabel('Lookup support', { exact: true }).selectOption('independent');
  await expect(page.locator('.reference-map,.reference-step')).toHaveCount(0);
  await expect(page.locator('.source-caption').last().locator('a')).toHaveText('Official EX307 reference booklet, page 2');
  await expect(page.getByRole('link', { name: 'Open official EX307 at page 2', exact: true })).toHaveAttribute('href', /#page=2$/);
  await page.getByLabel('Which frequency row contains 7.050 MHz?', { exact: true }).selectOption('7000-7100');
  await page.getByRole('button', { name: 'Check booklet answers', exact: true }).click();
  await expect(page.locator('#reference-result')).toContainText('booklet answers match');
  await expect(page.locator('.reference-map')).toBeVisible();
  await page.reload();
  await expect(page.locator('#reference-result')).toBeVisible();
  await expect(page.locator('#ref-row')).toBeDisabled();
});

test('booklet numeric input, private reflection and course progress appear in an explicitly private backup', async ({ page }) => {
  await page.goto(topic('Batteries'));
  await page.getByLabel('Your written explanation or question', { exact: true }).fill('PRIVATE reflection');
  await page.goto('/#reference');
  await page.getByLabel('Exercise', { exact: true }).selectOption('1');
  await page.getByLabel('What power number is printed in watts? (W)', { exact: true }).fill('1e0');
  await page.getByLabel('Which radiation reference qualifies that power entry?', { exact: true }).selectOption('erp');
  await page.getByRole('button', { name: 'Check booklet answers', exact: true }).click();
  await page.getByLabel('Why does this answer follow?', { exact: false }).fill('PRIVATE reference reflection');
  await page.goto('/#tools');
  let downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download progress backup', exact: true }).click();
  const normal = await downloadedText(await downloaded);
  expect(normal).not.toContain('PRIVATE');
  expect(JSON.parse(normal).records[TOOLS_KEY].reference.answers.power).toBe('1e0');
  await page.getByLabel('Include private conversations', { exact: false }).check();
  downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download progress backup', exact: true }).click();
  const full = await downloadedText(await downloaded);
  expect(full).toContain('PRIVATE reflection');
  expect(full).toContain('PRIVATE reference reflection');
  expect(full).not.toContain('sourceCharacters');
});

test('backup restore previews without writes, requires confirmation and restores saved state after a private recovery download', async ({ page }) => {
  await page.goto(topic('Batteries'));
  await page.getByLabel('Number of cells in series exact value', { exact: true }).fill('3');
  await page.getByLabel('Number of cells in series exact value', { exact: true }).press('Tab');
  await page.getByLabel('Your written explanation or question', { exact: true }).fill('Saved PRIVATE reflection');
  await page.goto('/#tools');
  await page.getByLabel('Include private conversations', { exact: false }).check();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download progress backup', exact: true }).click();
  const full = await downloadedText(await downloaded);
  await page.getByRole('button', { name: 'Back to learning', exact: true }).click();
  await page.getByLabel('Number of cells in series exact value', { exact: true }).fill('4');
  await page.getByLabel('Number of cells in series exact value', { exact: true }).press('Tab');
  await page.goto('/#tools');
  const before = await page.evaluate(keys => keys.map(key => localStorage.getItem(key)), BACKUP_KEYS);
  await page.locator('#restore-file').setInputFiles({ name: 'progress.json', mimeType: 'application/json', buffer: Buffer.from(full) });
  await expect(page.locator('.restore-preview')).toBeVisible();
  expect(await page.evaluate(keys => keys.map(key => localStorage.getItem(key)), BACKUP_KEYS)).toEqual(before);
  await expect(page.getByRole('button', { name: 'Replace saved progress', exact: true })).toBeDisabled();
  await page.getByLabel('I reviewed this file', { exact: false }).check();
  const rescue = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Replace saved progress', exact: true }).click();
  expect(JSON.parse(await downloadedText(await rescue)).format).toBe('radio-lab-raw-recovery');
  await expect(page.locator('#learning-title')).toHaveText('My study session');
  const restored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
  expect(restored.records['Topics/Batteries'].values.cells).toBe(3);
  expect(restored.records['Topics/Batteries'].reflection).toBe('Saved PRIVATE reflection');
});

test('invalid imports preserve all records and asynchronous file reads cannot overwrite a page after navigation', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#tools');
  await expect(page.locator('#restore-file')).toBeVisible();
  const before = await page.evaluate(keys => keys.map(key => localStorage.getItem(key)), BACKUP_KEYS);
  await page.locator('#restore-file').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
  await expect(page.locator('#restore-status')).toContainText('not valid JSON');
  expect(await page.evaluate(keys => keys.map(key => localStorage.getItem(key)), BACKUP_KEYS)).toEqual(before);
  await page.evaluate(() => { File.prototype.text = () => new Promise(resolve => { window.finishFileRead = resolve; }); });
  await page.locator('#restore-file').setInputFiles({ name: 'waiting.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await page.goto('/#reference');
  await expect(page.locator('#reference-task')).toBeVisible();
  await page.evaluate(() => window.finishFileRead('{}'));
  await expect(page.locator('#tools-title')).toHaveText('Read the EX307 booklet');
  expect(errors).toEqual([]);
});

test('mobile focus/reference screens fit and a corrupt tools record remains untouched', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, '{broken-tools'), TOOLS_KEY);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#reference');
  await expect(page.locator('#study-tools-status')).toContainText('preserved');
  await page.getByRole('button', { name: 'Next lookup step', exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), TOOLS_KEY)).toBe('{broken-tools');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/reference-mobile.png' });
});
