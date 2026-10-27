import { test, expect } from '@playwright/test';

const topic = stem => `/#${encodeURIComponent(`Topics/${stem}`)}`;

test('battery cells are highlighted and voltage remains when the load is disconnected', async ({ page }) => {
  await page.goto(topic('Batteries'));
  await expect(page.locator('.daily-setting')).toContainText('1.5 V cells');
  await expect(page.locator('.focus-label')).toContainText('cells, their terminals');
  await expect(page.locator('[data-focus="battery"] .cell-body')).toHaveCount(2);
  await expect(page.locator('#now-reading strong')).toHaveText('3 V');
  await page.getByLabel('Number of cells in series exact value').fill('3');
  await page.getByLabel('Number of cells in series exact value').press('Tab');
  await expect(page.locator('#now-reading strong')).toHaveText('4.5 V');
  await expect(page.locator('[data-focus="battery"] .cell-body')).toHaveCount(3);
  await expect(page.locator('#scene')).toContainText('0.75 A');
  await page.getByLabel('Example load', { exact: true }).selectOption('off');
  await expect(page.locator('#scene')).toContainText('0 A');
  await expect(page.locator('#now-reading strong')).toHaveText('4.5 V');
  await page.getByLabel('Your written explanation or question').fill('Three series cells give 4.5 V.');
  await page.reload();
  await expect(page.getByLabel('Number of cells in series exact value')).toHaveValue('3');
  await expect(page.getByLabel('Example load', { exact: true })).toHaveValue('off');
  await expect(page.getByLabel('Your written explanation or question')).toHaveValue('Three series cells give 4.5 V.');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/battery-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => document.querySelector('.workbench').scrollIntoView());
  await page.screenshot({ path: 'test-results/battery-mobile.png' });
});

test('everyday frequency examples connect the waves with real antenna dimensions', async ({ page }) => {
  await page.goto(topic('Frequency_and_Wavelength'));
  await page.getByRole('button', { name: 'FM receiver · 100 MHz', exact: true }).click();
  await expect(page.locator('#now-reading strong')).toHaveText('3 m');
  await expect(page.locator('[data-focus="antenna-size"]')).toContainText('0.75 m');
  await expect(page.locator('#scene')).toContainText('Phone length: 15 cm');
  await page.getByRole('button', { name: 'Wi-Fi · 2,400 MHz', exact: true }).click();
  await expect(page.locator('#now-reading strong')).toHaveText('0.125 m');
  await expect(page.locator('#before-reading strong')).toHaveText('3 m');
  await expect(page.locator('[data-focus="antenna-size"]')).toContainText('0.0313 m');
  await expect(page.locator('#scene')).toContainText('0.5 metres across');
  await expect(page.locator('.daily-result')).toContainText('fits into a device or garden');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/waves-desktop.png' });
});

test('an open lamp affects shared and separate paths differently', async ({ page }) => {
  await page.goto(topic('Series_and_Parallel_Circuits'));
  await page.getByLabel('First lamp', { exact: true }).selectOption('open');
  await expect(page.locator('#now-reading strong')).toHaveText('0 A');
  await expect(page.locator('#scene .lamp-on')).toHaveCount(0);
  expect(await page.locator('#scene .switch-gap').evaluate(el => getComputedStyle(el).stroke)).toBe('rgb(255, 255, 255)');
  await page.getByLabel('Wiring layout', { exact: true }).selectOption('parallel');
  await expect(page.locator('#now-reading strong')).toHaveText('1 A');
  await expect(page.locator('#scene .lamp-on')).toHaveCount(1);
  await expect(page.locator('#reflection-title')).toContainText('parallel circuit');
});

test('tuning selects different fictional programmes using text only', async ({ page }) => {
  await page.goto(topic('Receiver_Basics'));
  await expect(page.locator('#now-reading strong')).toHaveText('Example news');
  await page.getByRole('button', { name: 'Tune example music · 104 MHz', exact: true }).click();
  await expect(page.locator('#now-reading strong')).toHaveText('Example music');
  await page.getByLabel('Receiver tuning exact value').fill('102');
  await page.getByLabel('Receiver tuning exact value').press('Tab');
  await expect(page.locator('#now-reading strong')).toHaveText('Neither example selected');
  await expect(page.locator('audio, video')).toHaveCount(0);
});

test('phonetic text is normalised and updates each visible spelling word', async ({ page }) => {
  await page.goto(topic('Phonetic_Alphabet'));
  await page.getByLabel('Word or call sign', { exact: true }).fill('ab1/');
  await expect(page.getByLabel('Word or call sign', { exact: true })).toHaveValue('AB1/');
  await expect(page.locator('[data-focus="spelling"]')).toContainText('Alfa');
  await expect(page.locator('[data-focus="spelling"]')).toContainText('Bravo');
  await expect(page.locator('[data-focus="spelling"]')).toContainText('One');
  await expect(page.locator('[data-focus="spelling"]')).toContainText('Slash');
});

test('quarter-wave and five-eighths-wave topics use their own element lengths', async ({ page }) => {
  await page.goto(topic('Antenna_type_14_Wave_Ground_Plane'));
  await expect(page.locator('#now-reading strong')).toHaveText('5 m');
  await expect(page.locator('#now-reading .reading-label')).toHaveText('Ideal quarter-wave element');
  await page.goto(topic('Antenna_type_58_Wave_Ground_Plane'));
  await expect(page.locator('#now-reading strong')).toHaveText('12.5 m');
  await expect(page.locator('#now-reading .reading-label')).toHaveText('Ideal five-eighths-wave element');
});

test('power, polarisation and repeater controls show their specific consequences', async ({ page }) => {
  await page.goto(topic('Formula_Power'));
  await page.getByRole('button', { name: '5 V × 3 A', exact: true }).click();
  await expect(page.locator('#now-reading strong')).toHaveText('15 W');
  await expect(page.locator('#scene')).toContainText('15 joules transferred every second');
  await page.goto(topic('Polarisation'));
  await page.getByLabel('Angle between antennas exact value').fill('90');
  await page.getByLabel('Angle between antennas exact value').press('Tab');
  await expect(page.locator('#now-reading strong')).toHaveText('0 %');
  await page.goto(topic('Using_Repeaters'));
  await page.getByLabel('Repeater path', { exact: true }).selectOption('on');
  await expect(page.locator('#now-reading strong')).toHaveText('Via hilltop repeater');
  await expect(page.locator('#scene .radio-path')).toHaveCount(1);
});

test('related topics move the actual visual highlight to the concept being studied', async ({ page }) => {
  await page.goto(topic('Resistance'));
  await expect(page.locator('#scene .topic-focus')).toHaveAttribute('data-focus', 'resistor');
  expect(await page.locator('#scene .topic-focus path').evaluate(el => getComputedStyle(el).stroke)).toBe('rgb(166, 106, 10)');
  await page.goto(topic('Formula_Resistance'));
  await expect(page.locator('#scene .topic-focus')).toHaveAttribute('data-focus', 'formula');
  await expect(page.locator('#scene .topic-focus')).toContainText('12 V ÷ 6 Ω');
  expect(await page.locator('#scene .topic-focus .meter').evaluate(el => getComputedStyle(el).fill)).toBe('rgb(255, 245, 223)');
  await page.goto(topic('The_Ionosphere'));
  await expect(page.locator('#scene .topic-focus')).toHaveAttribute('data-focus', 'ionosphere');
  await page.goto(topic('VHF_and_UHF'));
  await expect(page.locator('#scene .topic-focus')).toHaveAttribute('data-focus', 'terrain');
  await expect(page.locator('#scene .topic-focus .hill')).toHaveCount(1);
  await page.goto(topic('Circuits'));
  await page.getByLabel('Connection', { exact: true }).selectOption('off');
  expect(await page.locator('#scene .topic-focus .switch-gap').evaluate(el => getComputedStyle(el).stroke)).toBe('rgb(255, 255, 255)');
  await page.goto(topic('Getting_Your_Foundation_Licence'));
  expect(await page.locator('#scene .topic-focus .active-stage').evaluate(el => getComputedStyle(el).stroke)).toBe('rgb(166, 106, 10)');
});

test('AM/FM, EMC modes and schedule topics open the correct models', async ({ page }) => {
  await page.goto(topic('Amplitude_Modulation_and_Frequency_Modulation'));
  await expect(page.getByLabel('Modulation', { exact: true })).toBeVisible();
  await expect(page.locator('#scene .topic-focus')).toHaveAttribute('data-focus', 'carrier-output');
  await expect(page.locator('#scene')).not.toContainText('quarter-wave');
  await page.goto(topic('Modes_and_EMC'));
  await expect(page.locator('#scene')).toContainText('Susceptible device');
  await expect(page.locator('#now-reading strong')).toHaveText('Recovered from amplitude changes');
  await page.getByLabel('Modulation', { exact: true }).selectOption('fm');
  await expect(page.locator('#scene')).toContainText('other mechanisms remain');
  await expect(page.locator('#now-reading strong')).toHaveText('No varying envelope to recover');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/emc-topic-focus.png' });
  await page.goto(topic('Frequency_Schedule_Parameters_Table'));
  await page.getByLabel('Schedule item to inspect', { exact: true }).selectOption('notes');
  await expect(page.locator('#scene .topic-focus')).toContainText('Footnotes');
  await expect(page.locator('#now-reading strong')).toHaveText('Footnotes and restrictions');
  await expect(page.locator('#scene')).toContainText('Checklist only');
});

test('topic highlighting preserves the visible current step in operating procedures', async ({ page }) => {
  await page.goto(topic('Operating_Overseas'));
  const boxes = page.locator('#scene .topic-focus rect');
  const before = await boxes.evaluateAll(items => items.map(el => getComputedStyle(el).fill));
  await page.getByLabel('Travel preparation step exact value').fill('1');
  await page.getByLabel('Travel preparation step exact value').press('Tab');
  const after = await boxes.evaluateAll(items => items.map(el => getComputedStyle(el).fill));
  expect(after).not.toEqual(before);
  expect(after[1]).toBe('rgb(224, 242, 237)');
  expect(after[0]).not.toBe(after[1]);
  await page.goto(topic('Making_a_Contact'));
  await page.getByLabel('Stage of the contact exact value').fill('1');
  await page.getByLabel('Stage of the contact exact value').press('Tab');
  const active = await page.locator('#scene .active-stage').evaluate(el => getComputedStyle(el).fill);
  const previous = await page.locator('#scene .past-stage').evaluate(el => getComputedStyle(el).fill);
  expect(active).not.toBe(previous);
});
