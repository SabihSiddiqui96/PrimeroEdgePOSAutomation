import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

function resolveEnvFile(): string {
  const fromEnv = process.env.ENV_FILE?.trim();
  if (fromEnv) return fromEnv;
  try {
    const settings = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '.vscode/settings.json'), 'utf8'),
    );
    return settings?.['playwright.env']?.ENV_FILE?.trim() || '.env';
  } catch {
    return '.env';
  }
}

dotenv.config({ path: resolveEnvFile() });

import { defineConfig, devices } from '@playwright/test';
import { getBaseUrl } from './utils/baseUrl';
import { getAuthStoragePath } from './utils/authStorage';
import { positiveIntFromEnv } from './utils/env';
import { browserChannel, IGNORE_HTTPS_ERRORS } from './utils/browserEnv';

export default defineConfig({
  testDir: './tests',
  // Skeletons for sections nobody has written yet are named *.todo.spec.ts and
  // never run. They exist to keep the backlog visible in the tree, and they are
  // not results: 39 of them reporting as "skipped" put the 54 real tests behind
  // a 58% pass rate that meant nothing. Rename a file to plain .spec.ts when the
  // section is actually written, and it joins the run and the totals.
  testIgnore: '**/*.todo.spec.ts',
  globalSetup: './global-setup.ts',
  timeout: positiveIntFromEnv('TEST_TIMEOUT_MS', process.env.CI ? 180000 : 90000),
  expect: {
    timeout: positiveIntFromEnv('EXPECT_TIMEOUT_MS', process.env.CI ? 30000 : 15000),
  },
  // POS writes to shared district data, so parallel workers would overwrite
  // each other's setup. Run serially until a suite proves it can isolate itself.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: getBaseUrl(),
    // The session global setup signs in for. Without this every spec would
    // repeat a slow WebForms login for no benefit.
    storageState: getAuthStoragePath(),
    headless: !!process.env.CI,
    ignoreHTTPSErrors: IGNORE_HTTPS_ERRORS,
    actionTimeout: positiveIntFromEnv('ACTION_TIMEOUT_MS', process.env.CI ? 45000 : 15000),
    navigationTimeout: positiveIntFromEnv('NAVIGATION_TIMEOUT_MS', process.env.CI ? 60000 : 45000),
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: browserChannel(),
      },
    },
  ],
});
