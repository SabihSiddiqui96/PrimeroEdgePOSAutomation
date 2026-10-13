import { expect, Locator, Page } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';

export const PATH = '/POS/Reconciliation.aspx';
const ID = 'ctl00_UserContentArea_';
export const SESSIONS_GRID = `${ID}gridSessions_ctl00`;

export interface SessionRow {
  terminal: string;
  cashier: string;
  openingBalance: string;
  openingDate: string;
  closingBalance: string;
  status: string;
  overUnder: string;
}

export function today(): string {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export async function openReconciliation(page: Page): Promise<void> {
  await openPosPage(page, PATH);
  await expect(page).toHaveTitle(/Reconciliation/i);
}

/** Pick from a Telerik combo box by the item's exact text. */
async function pickCombo(page: Page, combo: string, item: string): Promise<void> {
  const option = page.locator(`#${combo}_DropDown li`).filter({ hasText: new RegExp(`^${escape(item)}$`, 'i') });
  // The drop-down can still be animating shut from page load; reopen it once if so.
  for (let attempt = 1; ; attempt++) {
    await page.locator(`#${combo}_Arrow`).click();
    const opened = await option.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false);
    if (opened || attempt === 2) break;
  }
  await option.click();
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await expect(page.locator(`#${combo}_Input`)).toHaveValue(new RegExp(`^${escape(item)}$`, 'i'));
}

/** Choosing a site code narrows the Site list to that code's sites. */
export async function selectSiteCode(page: Page, code: string): Promise<void> {
  await pickCombo(page, `${ID}ucAreaSiteSelector_rcbSiteCode`, code);
}

export async function selectSite(page: Page, site: string): Promise<void> {
  await pickCombo(page, `${ID}ucAreaSiteSelector_rcbSite`, site);
}

export async function siteValue(page: Page): Promise<string> {
  return page.locator(`#${ID}ucAreaSiteSelector_rcbSite_Input`).inputValue();
}

export async function setDateRange(page: Page, from: string, to: string): Promise<void> {
  for (const [id, value] of [
    ['calFromDate_dateInput', from],
    ['calToDate_dateInput', to],
  ]) {
    const input = page.locator(`#${ID}${id}`);
    await input.click();
    await input.press('Control+A');
    await input.pressSequentially(value);
    await input.press('Tab');
    await expect(input).toHaveValue(value);
  }
}

/** Wait for the page's own async postback, started by `action`, to finish. */
async function postback(page: Page, action: () => Promise<void>): Promise<void> {
  const response = page.waitForResponse((r) => r.request().method() === 'POST' && /Reconciliation\.aspx/i.test(r.url()));
  await action();
  await response;
  await expect(page.getByRole('status', { name: 'page is loading' })).toBeHidden();
}

export async function apply(page: Page): Promise<void> {
  await redraw(page, () => page.locator(`#${ID}btnApply`).click());
}

/** Run a grid action and wait until the old grid is replaced; the POST answers before the redraw. */
async function redraw(page: Page, action: () => Promise<void>): Promise<void> {
  const oldGrid = await page.locator(`#${SESSIONS_GRID}`).elementHandle();
  await postback(page, action);
  await page.waitForFunction((grid) => !grid?.isConnected, oldGrid);
  await expect(page.locator(`#${SESSIONS_GRID}`)).toBeVisible();
}

/** The grid pages its rows, so sort newest first to keep today's latest session on page one. */
export async function sortNewestFirst(page: Page): Promise<void> {
  const header = page.locator(`#${SESSIONS_GRID} thead`).getByRole('link', { name: 'Opening Date', exact: true });
  let dates: number[] = [];
  for (let attempt = 0; attempt < 4; attempt++) {
    dates = (await sessionRows(page)).map((r) => Date.parse(r.openingDate));
    if (dates.every((d, j) => j === 0 || dates[j - 1] >= d)) return;
    await redraw(page, () => header.click());
  }
  throw new Error(`Sessions grid would not sort newest first: ${dates.map((d) => new Date(d).toLocaleTimeString()).join(', ')}`);
}

/** Rows of a Telerik grid as { header: cell text }. */
export async function readGrid(table: Locator): Promise<Record<string, string>[]> {
  // Sorting adds hidden "HeaderText" labels to each header cell.
  const headers = (await table.locator('> thead th').allInnerTexts()).map((h) => h.replace(/HeaderText/g, '').trim());
  const rows = table.locator('> tbody > tr.rgRow, > tbody > tr.rgAltRow');
  const result: Record<string, string>[] = [];
  for (let i = 0; i < (await rows.count()); i++) {
    const cells = (await rows.nth(i).locator('> td').allInnerTexts()).map((c) => c.replace(/\s+/g, ' ').trim());
    result.push(Object.fromEntries(headers.map((h, j) => [h, cells[j] ?? ''])));
  }
  return result;
}

/** Every session row in the grid. */
export async function sessionRows(page: Page): Promise<SessionRow[]> {
  return (await readGrid(page.locator(`#${SESSIONS_GRID}`))).map((r) => {
    for (const column of ['Terminal', 'Cashier', 'Opening Balance', 'Opening Date', 'Closing Balance', 'Status', 'Over/Under']) {
      if (!(column in r)) throw new Error(`Sessions grid has no "${column}" column; saw ${Object.keys(r).join(', ')}`);
    }
    return {
      terminal: r['Terminal'],
      cashier: r['Cashier'],
      openingBalance: r['Opening Balance'],
      openingDate: r['Opening Date'],
      closingBalance: r['Closing Balance'],
      status: r['Status'],
      overUnder: r['Over/Under'],
    };
  });
}

/** Session Status filter boxes: Initialized, Opened and Closed are ticked by default. */
export async function showStatus(page: Page, status: 'Reconciled' | 'Deposited', shown = true): Promise<void> {
  const index = { Reconciled: 3, Deposited: 4 }[status];
  await page.locator(`#${ID}chkSessionStatus_${index}`).setChecked(shown);
}

/** Filter to one site and today, newest session first. */
export async function filterToday(page: Page, siteCode: string, siteName: string, statuses: ('Reconciled' | 'Deposited')[] = []): Promise<void> {
  await openReconciliation(page);
  await selectSiteCode(page, siteCode);
  await selectSite(page, siteName);
  await setDateRange(page, today(), today());
  for (const status of statuses) await showStatus(page, status);
  await apply(page);
  await sortNewestFirst(page);
}

/** Open Reconciliation Info for the session that opened at `openingDate`. */
export async function openReconcile(page: Page, openingDate: string): Promise<void> {
  const index = (await sessionRows(page)).findIndex((r) => r.openingDate === openingDate);
  expect(index, `session opened ${openingDate} in the grid`).toBeGreaterThanOrEqual(0);
  await page.locator(`#${SESSIONS_GRID} > tbody > tr`).filter({ hasText: openingDate }).locator('a[title^="Reconcile"]').click();
  await expect(page).toHaveTitle(/Reconciliation Info/i);
}

/** The session opened most recently on this page, by its Opening Date and time. */
export function newestSession(rows: SessionRow[]): SessionRow | undefined {
  return [...rows].sort((a, b) => Date.parse(a.openingDate) - Date.parse(b.openingDate)).pop();
}

/** Signed cents as the grids print them: "$41.00", "($15.00)". */
export function money(value: number): string {
  const text = `$${(Math.abs(value) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  return value < 0 ? `(${text})` : text;
}

/** "$1,234.50" or "($3.00)" to a signed number of cents. */
export function cents(money: string): number {
  const negative = /^\(.*\)$/.test(money.trim()) || money.includes('-');
  const value = Math.round(Number(money.replace(/[^0-9.]/g, '')) * 100);
  return negative ? -value : value;
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
