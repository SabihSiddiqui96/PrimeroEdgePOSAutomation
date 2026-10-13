import { expect, Page } from '@playwright/test';
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
  await page.locator(`#${combo}_Arrow`).click();
  await page.locator(`#${combo}_DropDown li`).filter({ hasText: new RegExp(`^${escape(item)}$`, 'i') }).click();
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
  await postback(page, () => page.locator(`#${ID}btnApply`).click());
  await expect(page.locator(`#${SESSIONS_GRID}`)).toBeVisible();
}

/** The grid pages its rows, so sort newest first to keep today's latest session on page one. */
export async function sortNewestFirst(page: Page): Promise<void> {
  const header = page.locator(`#${SESSIONS_GRID} thead`).getByRole('link', { name: 'Opening Date', exact: true });
  let dates: number[] = [];
  for (let attempt = 0; attempt < 4; attempt++) {
    dates = (await sessionRows(page)).map((r) => Date.parse(r.openingDate));
    if (dates.every((d, j) => j === 0 || dates[j - 1] >= d)) return;
    // The response lands before the grid is redrawn, so wait for the old table to be replaced.
    const oldGrid = await page.locator(`#${SESSIONS_GRID}`).elementHandle();
    await postback(page, () => header.click());
    await page.waitForFunction((grid) => !grid?.isConnected, oldGrid);
  }
  throw new Error(`Sessions grid would not sort newest first: ${dates.map((d) => new Date(d).toLocaleTimeString()).join(', ')}`);
}

/** Every session row in the grid, keyed by the grid's own column headers. */
export async function sessionRows(page: Page): Promise<SessionRow[]> {
  const grid = page.locator(`#${SESSIONS_GRID}`);
  // Sorting adds hidden "HeaderText" labels to each header cell.
  const headers = (await grid.locator('thead th').allInnerTexts()).map((h) => h.replace(/HeaderText/g, '').trim());
  const col = (name: string) => {
    const index = headers.indexOf(name);
    if (index < 0) throw new Error(`Sessions grid has no "${name}" column; saw ${headers.join(', ')}`);
    return index;
  };
  const rows = grid.locator('tr.rgRow, tr.rgAltRow');
  const result: SessionRow[] = [];
  for (let i = 0; i < (await rows.count()); i++) {
    const cells = (await rows.nth(i).locator('> td').allInnerTexts()).map((c) => c.replace(/\s+/g, ' ').trim());
    result.push({
      terminal: cells[col('Terminal')],
      cashier: cells[col('Cashier')],
      openingBalance: cells[col('Opening Balance')],
      openingDate: cells[col('Opening Date')],
      closingBalance: cells[col('Closing Balance')],
      status: cells[col('Status')],
      overUnder: cells[col('Over/Under')],
    });
  }
  return result;
}

/** The session opened most recently on this page, by its Opening Date and time. */
export function newestSession(rows: SessionRow[]): SessionRow | undefined {
  return [...rows].sort((a, b) => Date.parse(a.openingDate) - Date.parse(b.openingDate)).pop();
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
