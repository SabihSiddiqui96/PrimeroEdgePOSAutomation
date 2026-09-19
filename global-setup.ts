import { chromium, FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { getBaseUrl } from './utils/baseUrl';
import { getAuthMetaPath, getAuthStoragePath } from './utils/authStorage';
import { loginToPrimeroEdge } from './utils/pos';

dotenv.config({ path: process.env.ENV_FILE?.trim() || '.env' });

/**
 * Signs in once and caches the session, so each spec starts authenticated rather
 * than repeating a slow WebForms login. Re-authenticates when the cache is
 * missing, or when PE_USERNAME has changed since it was written. FORCE_AUTH=1
 * refreshes it on demand.
 */
export default async function globalSetup(_config: FullConfig): Promise<void> {
  const username = process.env.PE_USERNAME?.trim();
  if (!username) {
    throw new Error('globalSetup: set PE_USERNAME in .env before running tests.');
  }

  const stateFile = getAuthStoragePath();
  const metaFile = getAuthMetaPath();
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });

  const cachedUser = fs.existsSync(metaFile) ? fs.readFileSync(metaFile, 'utf8').trim() : null;
  const needAuth =
    process.env.FORCE_AUTH === '1' || !fs.existsSync(stateFile) || cachedUser !== username;

  if (!needAuth) return;

  // Same browser the tests themselves use. Under CI that is the Chrome
  // channel, which is the only one the agent installs - launching bare
  // chromium here asked for a download that is not there, and the whole run
  // died in global setup before a single test started.
  const browser = await chromium.launch({ channel: process.env.CI ? 'chrome' : undefined });
  // ignoreHTTPSErrors has to be repeated here. playwright.config.ts sets it
  // under `use`, which only reaches contexts the test runner builds - this one
  // is ours, so it started strict and the login precheck failed on a hosted
  // agent with "unable to verify the first certificate". QA serves only its
  // leaf certificate; see the note on the reachability gate in the pipeline.
  const context = await browser.newContext({
    baseURL: getBaseUrl(),
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  try {
    await loginToPrimeroEdge(page);
    await context.storageState({ path: stateFile });
    fs.writeFileSync(metaFile, username, 'utf8');
  } finally {
    await context.close();
    await browser.close();
  }
}
