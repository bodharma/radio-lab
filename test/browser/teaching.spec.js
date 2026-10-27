import { test, expect } from '@playwright/test';

const topic = stem => `/#${encodeURIComponent(`Topics/${stem}`)}`;

test('the transmitter lesson defines each function and explains the selected fault causally', async ({ page }) => {
  await page.goto(topic('Radio_Signals'));
  await expect(page.locator('.guide-terms')).toContainText('Carrier');
  await expect(page.locator('.guide-terms')).toContainText('Oscillator');
  await expect(page.locator('.guide-terms')).toContainText('Modulator');
  await expect(page.locator('.guide-terms')).toContainText('RF amplifier');
  await expect(page.locator('.guide-steps details')).toHaveCount(5);
  await expect(page.locator('#scene .current-wave')).toHaveCount(3);
  await page.getByLabel('Fault to inspect', { exact: true }).selectOption('modulator');
  await expect(page.locator('#state-explanation')).toContainText('carrier is still being generated');
  await expect(page.locator('#state-explanation')).toContainText('not physically removing');
  await expect(page.locator('#scene')).toContainText('Message input missing');
  await expect(page.locator('#now-reading strong')).toHaveText('Carrier without message');
  await page.getByLabel('Fault to inspect', { exact: true }).selectOption('oscillator');
  await expect(page.locator('#state-explanation')).toContainText('no RF carrier');
  await expect(page.locator('#now-reading strong')).toHaveText('No carrier generated');
  await page.getByRole('button', { name: 'Explain the terms and mechanism', exact: true }).click();
  await expect(page.locator('#guide-title')).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/teaching-transmitter.png' });
});

test('expanded guidance remains open when a control changes and original information stays available', async ({ page }) => {
  await page.goto(topic('Formula_Resistance'));
  await page.locator('.guide-steps details').nth(1).locator('summary').click();
  await page.getByLabel('Resistance exact value').fill('12');
  await page.getByLabel('Resistance exact value').press('Tab');
  await expect(page.locator('.guide-steps details').nth(1)).toHaveAttribute('open', '');
  await expect(page.locator('#state-explanation')).toContainText('12/12 = 1 A');
  await expect(page.getByRole('button', { name: 'Next section', exact: true })).toBeVisible();
  await expect(page.locator('.source-note summary')).toHaveText(/^View the complete (original|study) note$/);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
