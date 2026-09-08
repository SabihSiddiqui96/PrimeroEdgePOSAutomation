import { expect, Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { decryptPassword } from './crypto';
import { getRequiredEnvVar, positiveIntFromEnv } from './env';
import { getDashboardPath, getLoginPath, getPosHomePath } from './baseUrl';

/** Top-level sections of the POS module, as they read on POS Home. */
export const POS_SECTIONS = [
  'Administration',
  'Patrons',
  'Bills',
  'Reimbursements',
  'Daily Reports',
  'Patron Reports',
  'Business Reports',
  'Management',
  'Menu Items',
  'Configuration',
  'Vending',
  'Orders',
  'Food & Face Detection',
] as const;

export type PosSection = (typeof POS_SECTIONS)[number];

export async function loginToPrimeroEdge(page: Page): Promise<void> {
  const username = getRequiredEnvVar('PE_USERNAME');
  const password = decryptPassword(getRequiredEnvVar('ENCRYPTED_PASSWORD'));

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(username, password);

  const loginPath = getLoginPath();
  await page.waitForURL((url) => !url.href.includes(loginPath), {
    timeout: positiveIntFromEnv('LOGIN_SUBMIT_TIMEOUT_MS', 30000),
  });
}

/**
 * Log in and open Point of Service, returning the page sitting on POS Home.
 *
 * POS is a module inside PrimeroEdge Classic rather than a separate app, so the
 * tile navigates in the same tab and no window handling is needed.
 */
export async function openPointOfService(page: Page): Promise<Page> {
  await signIn(page);
  await goToPosHome(page);
  return page;
}

/**
 * Put the page on an authenticated session.
 *
 * Specs start from the session global setup cached, so the dashboard normally
 * opens straight away and no form is involved. Classic bounces to the login
 * page once that session expires, which is the only case that still needs one.
 */
export async function signIn(page: Page): Promise<void> {
  await page.goto(getDashboardPath(), { waitUntil: 'domcontentloaded' });
  if (isOnLoginPage(page)) {
    await loginToPrimeroEdge(page);
  }
}

function isOnLoginPage(page: Page): boolean {
  return page.url().toLowerCase().includes(getLoginPath().toLowerCase());
}

/**
 * Navigate from the dashboard to POS Home.
 *
 * The dashboard renders the tile twice — once in the collapsed left-nav module
 * list and once as the visible workspace tile — so the visible one is selected
 * explicitly. If the tile is absent (module toggled off for the account) the
 * module URL is still reachable, so fall back to it and say so, rather than
 * spending the click timeout on an element that will never appear.
 */
export async function goToPosHome(page: Page): Promise<void> {
  const posPath = getPosHomePath();

  if (!page.url().includes(getDashboardPath())) {
    await page.goto(getDashboardPath(), { waitUntil: 'domcontentloaded' });
  }

  const tile = page.locator(`a[href*="${posPath}" i]:visible`).first();
  if ((await tile.count()) === 0) {
    console.log(`[pos] no Point of Service tile on the dashboard; navigating to ${posPath}`);
    await page.goto(posPath, { waitUntil: 'domcontentloaded' });
  } else {
    await tile.click();
  }

  await expect(page).toHaveURL(new RegExp(posPath.replace(/\//g, '\\/'), 'i'), {
    timeout: positiveIntFromEnv('POS_LOAD_TIMEOUT_MS', 45000),
  });
  await page.waitForLoadState('domcontentloaded');
}

/** One of the POS top-level sections, matched on its exact visible text. */
export function posSection(page: Page, name: PosSection) {
  return page.getByText(name, { exact: true }).first();
}

export async function openPosSection(page: Page, name: PosSection): Promise<void> {
  const section = posSection(page, name);
  await section.scrollIntoViewIfNeeded().catch(() => undefined);
  await expect(section).toBeVisible({
    timeout: positiveIntFromEnv('POS_SECTION_TIMEOUT_MS', 20000),
  });
  await section.click();
  await page.waitForLoadState('domcontentloaded');
}

/** The district selector on POS Home, which doubles as a "page is ready" signal. */
export function districtSelector(page: Page) {
  return page.getByRole('button', { name: /SCHOOLS|DISTRICT|ISD/i }).first();
}

/**
 * Log in and open a POS page directly by its path.
 *
 * The nav accordion has to be expanded before a section's links are clickable,
 * so specs that only care about one screen go straight to its URL instead.
 */
export async function openPosPage(page: Page, path: string): Promise<Page> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });

  // One navigation is enough with a live session. If it has expired Classic
  // sends us to the login form instead, so sign in and ask for the page again.
  if (isOnLoginPage(page)) {
    await loginToPrimeroEdge(page);
    await page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  await page.waitForLoadState('domcontentloaded');
  return page;
}
