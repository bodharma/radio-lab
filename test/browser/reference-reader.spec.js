import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { EXAM_SOURCES } from '../../src/exam-spec.js';

test('parsed booklet works without external network and links every section to the local original', async ({ page }) => {
  const external = [];
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue();
    external.push(url.href); return route.abort();
  });
  await page.goto('/#reference-book/2');
  await expect(page.locator('#reference-title')).toHaveText('EX307 in Radio Lab format');
  await expect(page.locator('.reference-data-table tbody tr')).toHaveCount(32);
  await expect(page.getByRole('link', { name: 'Open original PDF at page 2', exact: true })).toHaveAttribute('href', `${EXAM_SOURCES.referenceLocal}#page=2`);
  await page.getByLabel('Search all four pages', { exact: true }).fill('Charing Cross');
  await expect(page.locator('.reference-data-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.reference-data-table tbody tr')).toContainText('431');
  await expect(page.locator('.reference-data-table tbody tr')).toContainText('100km');
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download original PDF', exact: true }).click();
  const pdf = await readFile(await (await downloaded).path());
  const original = await readFile(new URL('../../public/reference/ex307-jan-2026.pdf', import.meta.url));
  expect(createHash('sha256').update(pdf).digest('hex')).toBe(createHash('sha256').update(original).digest('hex'));
  await page.getByLabel('Search all four pages', { exact: true }).fill('Charing Cross');
  await page.goto('/#reference');
  await page.getByLabel('Exercise', { exact: true }).selectOption('3');
  await page.getByRole('link', { name: 'Read this page in Radio Lab format', exact: true }).click();
  await expect(page.locator('[data-reference-page="3"]')).toBeVisible();
  await expect(page.locator('#reference-search')).toHaveValue('');
  await expect(page.locator('.reference-data-table tbody tr')).toHaveCount(23);
  expect(external).toEqual([]);
});

test('all four parsed pages, the source graph and mobile row cards remain available offline', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#reference-book/1');
  await expect(page.locator('#reference-content')).toContainText('working');
  await page.locator('[data-reader-page="3"]').click();
  await expect(page.locator('.reference-data-table')).toHaveCount(2);
  await expect(page.locator('#ref-section-2m-numbered-notes li')).toHaveCount(14);
  await expect(page.locator('#ref-section-2m-licence-notes')).toContainText('Scarborough');
  await page.locator('[data-reader-page="4"]').click();
  await expect(page.locator('#ref-section-frequency-allocation tbody tr')).toHaveCount(13);
  await expect(page.locator('#ref-section-db-conversion tbody tr')).toHaveCount(4);
  const image = page.locator('.reference-source-figure img');
  await expect(image).toHaveAttribute('src', '/reference/ex307-jan-2026-chart.png');
  await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true);
  await page.screenshot({ path: 'test-results/reference-parsed-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-reader-page="2"]').click();
  await expect(page.locator('.reference-mobile-rows dl')).toHaveCount(32);
  await expect(page.locator('.reference-mobile-rows').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/reference-parsed-mobile.png' });
  expect(errors).toEqual([]);
});

test('trainer and examination use same-origin PDF links while independent lookup keeps neutral source labels', async ({ page }) => {
  await page.goto('/#reference');
  await expect(page.getByRole('link', { name: 'Read this page in Radio Lab format', exact: true })).toHaveAttribute('href', '#reference-book/2');
  await expect(page.getByRole('link', { name: 'Open official EX307 at page 2', exact: true })).toHaveAttribute('href', `${EXAM_SOURCES.referenceLocal}#page=2`);
  await page.getByRole('button', { name: 'Show official booklet here', exact: true }).click();
  await expect(page.locator('.reference-pdf')).toHaveAttribute('src', `${EXAM_SOURCES.referenceLocal}#page=2`);
  await page.goto('/#assessment');
  await page.getByRole('button', { name: 'Start untimed rehearsal', exact: true }).click();
  await expect(page.getByRole('link', { name: /^Open permitted EX307 booklet/ })).toHaveAttribute('href', EXAM_SOURCES.referenceLocal);
});

test('a delayed or invalid reference load cannot replace another lesson or inject markup', async ({ page }) => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  await page.route('**/reference/ex307-jan-2026.json', async route => { await pending; await route.fulfill({ status: 200, contentType: 'application/json', body: '{"version":999}' }); });
  await page.goto('/#reference-book');
  await expect(page.locator('#reference-title')).toContainText('Opening');
  await page.goto('/#Topics%2FBatteries');
  await expect(page.locator('#lesson-title')).toHaveText('Batteries');
  release();
  await expect(page.locator('#lesson-title')).toHaveText('Batteries');
  await page.goto('/#reference-book');
  await expect(page.getByRole('status').filter({ hasText: 'unsupported format' })).toBeVisible();
  await expect(page.locator('#reference-retry')).toBeVisible();
});
