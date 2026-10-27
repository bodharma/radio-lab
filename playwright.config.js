import { defineConfig } from '@playwright/test';

const externalURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './test/browser',
  fullyParallel: true,
  workers: 3,
  timeout: 60000,
  use: { baseURL: externalURL || 'http://127.0.0.1:5180', browserName: 'chromium', channel: 'chrome', headless: true, screenshot: 'only-on-failure' },
  webServer: externalURL ? undefined : { command: 'npm run dev', url: 'http://127.0.0.1:5180', reuseExistingServer: !process.env.CI, timeout: 30000 },
});
