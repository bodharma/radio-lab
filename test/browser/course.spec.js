import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { scenarios } from '../../src/scenarios.js';
import { createHash } from 'node:crypto';

const course = JSON.parse(await readFile(new URL('../../public/course.json', import.meta.url), 'utf8'));
const authored = course.provenance === 'authored-public';
const topicUrl = id => `/#${encodeURIComponent(id)}`;

test('author credit and bundled dependency notices remain accessible across routes and focus mode', async ({ page }) => {
  await page.goto('/#today');
  const credits = page.getByRole('contentinfo', { name: 'Project credits' });
  await expect(credits.getByRole('link', { name: 'bodharma', exact: true })).toHaveAttribute('href', 'https://github.com/bodharma');
  await expect(credits.getByRole('link', { name: 'Original source', exact: true })).toHaveAttribute('href', 'https://github.com/bodharma/radio-lab');
  const license = credits.getByRole('link', { name: 'PolyForm Noncommercial 1.0.0', exact: true });
  const licenseHref = await license.getAttribute('href');
  expect(new URL(licenseHref, page.url()).origin).toBe(new URL(page.url()).origin);
  const licenceResponse = await page.request.get(licenseHref);
  expect(licenceResponse.status()).toBe(200);
  expect(createHash('sha256').update(await licenceResponse.body()).digest('hex')).toBe('ffcca38841adb694b6f380647e15f17c446a4d1656fed51a1e2041d064c94cc8');
  await credits.locator('summary').click();
  await expect(credits.locator('#project-notice')).toContainText('Required Notice: Original author: bodharma');
  const notices = credits.getByRole('link', { name: 'Third-party notices', exact: true });
  const href = await notices.getAttribute('href');
  expect(new URL(href, page.url()).origin).toBe(new URL(page.url()).origin);
  const response = await page.request.get(href);
  expect(response.status()).toBe(200);
  const text = await response.text();
  expect(text).toContain('DOMPurify 3.4.17');
  expect(text).toContain('Marked 18.1.1');
  expect(text).toContain('Regenerator runtime');
  await page.goto(topicUrl('Topics/Batteries'));
  await page.getByRole('button', { name: 'Focus mode: off', exact: true }).click();
  await expect(credits).toBeVisible();
  await page.goto('/#assessment');
  await expect(credits).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('starts in original course order and reports complete source coverage', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#lesson-title')).toHaveText(course.documents.find(d => d.id === course.modules[0].topics[0]).title);
  await page.getByRole('button', { name: 'View content coverage' }).click();
  await expect(page.getByRole('dialog')).toContainText(`${course.coverage.courseTopics} ordered course topics`);
  await expect(page.getByRole('dialog')).toContainText(`${course.coverage.documents} ${authored ? 'authored study notes' : 'complete Markdown notes'}`);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
  await page.locator('#next-topic').click();
  await expect(page.locator('#lesson-title')).toHaveText('Frequency and Wavelength');
  await expect(page.locator('audio, video, iframe')).toHaveCount(0);
});

test('reference browsing can return to the course navigation', async ({ page }) => {
  await page.goto(topicUrl('Glossary'));
  await expect(page.getByRole('button', { name: 'References', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Course order', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Course order', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.module')).toHaveCount(9);
});

test('a circuit action changes the diagram and readings, and survives reload', async ({ page }) => {
  await page.goto(topicUrl('Topics/Formula_Resistance'));
  await expect(page.locator('#now-reading strong')).toHaveText('2 A');
  const before = await page.locator('#scene').innerHTML();
  await page.getByLabel('Resistance exact value').fill('12');
  await page.getByLabel('Resistance exact value').press('Tab');
  await expect(page.locator('#now-reading strong')).toHaveText('1 A');
  expect(await page.locator('#scene').innerHTML()).not.toBe(before);
  await expect(page.locator('#before-reading strong')).toHaveText('2 A');
  await page.reload();
  await expect(page.getByLabel('Resistance exact value')).toHaveValue('12');
  await expect(page.locator('#now-reading strong')).toHaveText('1 A');
  await page.getByRole('button', { name: 'Keep these settings as “before”' }).click();
  await expect(page.locator('#before-reading strong')).toHaveText('1 A');
});

test('topic review accounts for every information section and the learner’s action', async ({ page }) => {
  await page.goto(topicUrl('Topics/Formula_Resistance'));
  await expect(page.locator('#mark-reviewed')).toBeDisabled();
  await page.getByLabel('Resistance exact value').fill('12');
  await page.getByLabel('Resistance exact value').press('Tab');
  for (let i = 0; i < 100 && await page.locator('#next-section').isEnabled(); i++) await page.locator('#next-section').click();
  await page.getByLabel('Your written explanation or question').fill('Doubling resistance halved the current at the same voltage.');
  await expect(page.locator('#mark-reviewed')).toBeEnabled();
  await page.locator('#mark-reviewed').click();
  await expect(page.locator('#mark-reviewed')).toHaveText('Reviewed ✓');
  await page.reload();
  await expect(page.locator('#mark-reviewed')).toHaveText('Reviewed ✓');
});

test('wave and modulation workbenches show the relevant cause and effect', async ({ page }) => {
  await page.goto(topicUrl('Topics/Wavelength'));
  await page.getByLabel('Frequency exact value').fill('6');
  await page.getByLabel('Frequency exact value').press('Tab');
  await expect(page.locator('#now-reading strong')).toHaveText('50 m');
  await page.goto(topicUrl('Topics/FM_vs._AM'));
  await page.getByLabel('Modulation', { exact: true }).selectOption('fm');
  await expect(page.locator('#now-reading strong')).toHaveText('Wave spacing');
  await page.getByLabel('Message strength exact value').fill('0');
  await page.getByLabel('Message strength exact value').press('Tab');
  await expect(page.locator('#now-reading strong')).toHaveText('Unmodulated carrier');
});

test('corrupted progress stays intact rather than being overwritten', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('radio-lab-progress-v1', '{broken'));
  await page.goto('/');
  await expect(page.getByRole('status').filter({ hasText: 'will not overwrite' })).toBeVisible();
  await page.getByLabel('Distance between stations exact value').fill('4');
  await page.getByLabel('Distance between stations exact value').press('Tab');
  expect(await page.evaluate(() => localStorage.getItem('radio-lab-progress-v1'))).toBe('{broken');
});

test('imported Markdown cannot run scripts or inject interactive forms', async ({ page }) => {
  const injected = structuredClone(course);
  const target = injected.documents.find(d => d.id === injected.modules[0].topics[0]);
  target.body = target.chunks[0] = '<script>window.bad = 1</script><img src="x" onerror="window.bad=2"><a href="javascript:window.bad=3">bad</a><form><input autofocus></form>Original information';
  await page.route('**/course.json', route => route.fulfill({ json: injected }));
  await page.goto('/');
  await expect(page.locator('.lesson-copy').first()).toContainText('Original information');
  expect(await page.evaluate(() => window.bad)).toBeUndefined();
  await expect(page.locator('.lesson-copy form, .lesson-copy input, .lesson-copy a[href^="javascript:"]')).toHaveCount(0);
});

test('mobile layout fits and a slider can be operated from the keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(topicUrl('Topics/Formula_Resistance'));
  await page.getByLabel('Resistance', { exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByLabel('Resistance exact value')).toHaveValue('7');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});

test('every ordered topic and supplemental note renders without application errors', async ({ page }) => {
  test.setTimeout(180000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#lesson-title')).toBeVisible();
  for (const document of course.documents) {
    await page.evaluate(id => { location.hash = encodeURIComponent(id); }, document.id);
    await expect(page.locator('#lesson-title')).toHaveText(document.title);
    await expect(page.locator('.lesson-copy').first()).toBeVisible();
    if (authored) {
      await expect(page.locator('.source-correction-detail,.content-correction')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Read source corrections', exact: true })).toHaveCount(0);
    }
    expect(await page.locator('#scene').count() ? await page.locator('#scene').innerHTML() : '').not.toContain('NaN');
    if (scenarios[document.stem]) {
      await expect(page.locator('.guided-explanation')).toBeVisible();
      await expect(page.locator('.guide-terms dt').first()).toBeVisible();
      await expect(page.locator('.daily-setting')).toContainText(scenarios[document.stem].setting);
      await expect(page.locator('.focus-label')).toContainText(scenarios[document.stem].focus);
      await expect(page.locator('.daily-result')).toContainText(scenarios[document.stem].result);
      await expect(page.locator('#reflection-title')).toHaveText(scenarios[document.stem].transfer);
      const focused = page.locator('#scene .topic-focus');
      expect(await focused.count()).toBeGreaterThan(0);
      for (const part of await focused.all()) await expect(part).toHaveAttribute('data-focus', scenarios[document.stem].focusTarget);
    }
  }
  expect(errors).toEqual([]);
});
