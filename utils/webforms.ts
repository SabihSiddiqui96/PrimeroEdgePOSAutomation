import { expect, Page } from '@playwright/test';

const SITE = 'ctl00_UserContentArea_ucAreaSiteSelector_';

/** The list pages' site picker; the Add/Edit pages use ucRegionSiteSelector_ddlSiteCodes / ddlSites. */
export const LIST_SITE_PICKER = { code: `${SITE}rcbSiteCode`, site: `${SITE}rcbSite_Input` };
export const EDIT_SITE_PICKER = { code: 'ctl00_UserContentArea_ucRegionSiteSelector_ddlSiteCodes', site: 'ctl00_UserContentArea_ucRegionSiteSelector_ddlSites_Input' };

/** Pick one site code; the Site box reloads to that code's site before anything else can run. */
export async function pickSiteCode(page: Page, code: string, picker = LIST_SITE_PICKER): Promise<void> {
  const item = page.locator(`#${picker.code}_DropDown li`).filter({ hasText: new RegExp(`^${code}$`) });
  // The drop-down can still be animating shut from page load; reopen it once if so.
  for (let attempt = 1; ; attempt++) {
    await page.locator(`#${picker.code}_Arrow`).click();
    if ((await item.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false)) || attempt === 2) break;
  }
  const site = page.locator(`#${picker.site}`);
  const before = await site.inputValue();
  const changing = (await page.locator(`#${picker.code}_Input`).inputValue()) !== code;
  await item.click();
  await expect(page.locator(`#${picker.code}_Input`)).toHaveValue(code);
  await expect(site).not.toHaveValue(/ALL/);
  if (changing) await expect(site).not.toHaveValue(before);
  await page.waitForLoadState('networkidle');
}

/** Type a date into a Telerik date box the way a person would. */
export async function typeDate(page: Page, id: string, value: string): Promise<void> {
  const input = page.locator(`#${id}`);
  // Clicking into the box can pop its calendar open over the buttons below it.
  const calendars = page.locator('.RadCalendarPopup').locator('visible=true');
  const shownBefore = await calendars.count();
  await input.click();
  await input.press('Control+A');
  await input.pressSequentially(value);
  await input.press('Tab');
  await expect(input).toHaveValue(value);
  if ((await calendars.count()) > shownBefore) {
    await page.keyboard.press('Escape');
    const closed = await expect(calendars).toHaveCount(shownBefore, { timeout: 3_000 }).then(() => true, () => false);
    if (!closed) await page.locator(`#${id.replace(/_dateInput$/, '')}_popupButton`).click();
  }
  await expect(calendars).toHaveCount(shownBefore);
  await expect(input).toHaveValue(value);
}

/** Run an action that redraws a grid; the POST answers before the redraw, so wait for the old grid to go. */
export async function redraw(page: Page, grid: string, action: () => Promise<void>): Promise<void> {
  const old = (await page.locator(grid).count()) ? await page.locator(grid).elementHandle() : null;
  await action();
  if (old) await page.waitForFunction((g) => !g.isConnected, old);
  await expect(page.locator(grid)).toBeVisible();
}

/** "32 items in 4 pages" when the grid is paged, otherwise the rows on screen. */
export async function gridTotal(page: Page, grid: string): Promise<number> {
  const pager = await page.locator(`${grid} .rgPager`).first().innerText().catch(() => '');
  const items = pager.match(/(\d+) items in/);
  return items ? Number(items[1]) : page.locator(`${grid} > tbody > tr.rgRow, ${grid} > tbody > tr.rgAltRow`).count();
}

/** Grid rows as { header: cell text }. */
export async function gridRows(page: Page, grid: string): Promise<Record<string, string>[]> {
  return page.locator(grid).evaluate((table) => {
    const headers = Array.from(table.querySelectorAll(':scope > thead > tr > th.rgHeader')).map((th) => (th as HTMLElement).innerText.replace(/HeaderText/g, '').trim());
    return Array.from(table.querySelectorAll(':scope > tbody > tr.rgRow, :scope > tbody > tr.rgAltRow')).map((tr) =>
      Object.fromEntries(headers.map((h, i) => [h, ((tr.children[i] as HTMLElement)?.innerText ?? '').replace(/HeaderText/g, '').trim()])),
    );
  });
}

/** Rows from every page of a paged grid, leaving it on the last page. */
export async function allGridRows(page: Page, grid: string): Promise<Record<string, string>[]> {
  const total = await gridTotal(page, grid);
  const rows = await gridRows(page, grid);
  while (rows.length < total) {
    const next = page.locator(`${grid} .rgPageNext`).first();
    await redraw(page, grid, () => next.click());
    const pageRows = await gridRows(page, grid);
    if (!pageRows.length) break;
    rows.push(...pageRows);
  }
  expect(rows.length, `all ${total} rows of ${grid}`).toBe(total);
  return rows;
}

/** "$1,234.50" or "($3.00)" or "-$3.00" to signed cents. */
export function cents(money: string): number {
  const negative = /^\(.*\)$/.test(money.trim()) || money.includes('-');
  const value = Math.round(Number(money.replace(/[^0-9.]/g, '')) * 100);
  return negative ? -value : value;
}

/** Signed cents as the grids print them: "$41.00", "($15.00)". */
export function money(value: number): string {
  const text = `$${(Math.abs(value) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  return value < 0 ? `(${text})` : text;
}
