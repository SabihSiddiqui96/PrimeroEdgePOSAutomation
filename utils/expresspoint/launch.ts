import { chromium, Browser, Page } from '@playwright/test';
import { spawn, ChildProcess, execSync } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';

/** The packaged ExpressPoint desktop app; only this PC has it installed. */
export const EXPRESSPOINT_EXE =
  process.env.EXPRESSPOINT_EXE?.trim() || 'C:\\Users\\Public\\Documents\\ExpressPoint\\ExpressPoint.exe';
const CDP_PORT = 9222;

export function expressPointInstalled(): boolean {
  return process.platform === 'win32' && fs.existsSync(EXPRESSPOINT_EXE);
}

export interface ExpressPointHandle {
  proc: ChildProcess;
  browser: Browser;
  window: Page;
}

function killExpressPoint(): void {
  for (const image of ['electron.exe', 'ExpressPoint.exe']) {
    try {
      execSync(`taskkill /F /IM ${image} /T`, { stdio: 'ignore' });
    } catch {
      // not running
    }
  }
}

export async function launchExpressPoint(): Promise<ExpressPointHandle> {
  killExpressPoint();
  await sleep(1500);

  // ELECTRON_RUN_AS_NODE from npm makes the app start as plain Node with no window.
  const { ELECTRON_RUN_AS_NODE: _drop, ...env } = process.env;

  // The app shells out to a cash-drawer binary; any harmless exe stands in for it.
  const stubDir = path.resolve('.cashdrawer-stub');
  fs.mkdirSync(stubDir, { recursive: true });
  const stub = path.join(stubDir, 'CashDrawer.exe');
  if (!fs.existsSync(stub)) {
    fs.copyFileSync(path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'whoami.exe'), stub);
  }

  const proc = spawn(EXPRESSPOINT_EXE, [`--remote-debugging-port=${CDP_PORT}`], {
    stdio: 'pipe',
    env: { ...env, NODE_ENV: 'production', CashDrawer: stubDir },
  });

  await waitForCdp(30_000);
  await sleep(2000);
  process.env.PW_CDP_SKIP_DOWNLOAD_BEHAVIOR = '1';
  const browser = await connectWithRetry(5, 1500);
  const context = browser.contexts()[0];

  // A hidden storage helper window opens first; wait for the real renderer.
  const isAppWindow = (p: Page) =>
    p.url().includes('/src/renderer/') && !p.url().includes('electron-browser-storage');
  const deadline = Date.now() + 30_000;
  let window: Page | undefined;
  while (!window && Date.now() < deadline) {
    window = context.pages().find(isAppWindow);
    if (!window) await sleep(500);
  }
  if (!window) {
    throw new Error(`ExpressPoint window never appeared. Pages: ${context.pages().map((p) => p.url()).join(', ')}`);
  }
  await window.waitForLoadState('domcontentloaded');
  return { proc, browser, window };
}

export async function closeExpressPoint(handle: ExpressPointHandle | undefined): Promise<void> {
  if (!handle) return;
  await handle.browser.close().catch(() => undefined);
  handle.proc.kill('SIGKILL');
  killExpressPoint();
}

function waitForCdp(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () =>
      http
        .get(`http://127.0.0.1:${CDP_PORT}/json/version`, (res) => {
          res.resume();
          if (res.statusCode === 200) resolve();
          else retry();
        })
        .on('error', retry);
    const retry = () =>
      Date.now() >= deadline
        ? reject(new Error(`ExpressPoint debug port ${CDP_PORT} not up after ${timeoutMs}ms`))
        : setTimeout(attempt, 500);
    attempt();
  });
}

async function connectWithRetry(retries: number, delayMs: number): Promise<Browser> {
  let lastError: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
    } catch (e) {
      lastError = e;
      await sleep(delayMs);
    }
  }
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
