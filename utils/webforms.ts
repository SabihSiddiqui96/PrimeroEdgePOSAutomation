import { expect, Frame, Page } from '@playwright/test';

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

type Manager = { getInstance(): { get_isInAsyncPostBack(): boolean; add_endRequest(handler: () => void): void } };
type PostbackWindow = { Sys?: { WebForms?: { PageRequestManager?: Manager } }; postbacksDone?: number; gridWas?: string };

/** Run an action that redraws a grid; a mark, not a handle, survives a full reload. */
export async function redraw(page: Page | Frame, grid: string, action: () => Promise<void>): Promise<void> {
  await postbacksSettled(page);
  const marked = await page.evaluate((sel) => {
    const w = window as unknown as PostbackWindow;
    const manager = w.Sys?.WebForms?.PageRequestManager?.getInstance();
    if (manager && w.postbacksDone === undefined) {
      w.postbacksDone = 0;
      manager.add_endRequest(() => (w.postbacksDone = (w.postbacksDone ?? 0) + 1));
    }
    const g = document.querySelector(sel) as HTMLElement | null;
    if (!g) return null;
    g.dataset.redrawn = 'old';
    w.gridWas = g.innerHTML;
    return w.postbacksDone ?? 0;
  }, grid);
  await action();
  // Replaced, updated in place, or just posted back; QA can take over 15s.
  if (marked !== null) {
    await page.waitForFunction(
      ({ sel, before }) => {
        const w = window as unknown as PostbackWindow;
        const g = document.querySelector(sel) as HTMLElement | null;
        return !!g && (g.dataset.redrawn !== 'old' || g.innerHTML !== w.gridWas || (w.postbacksDone ?? 0) > before);
      },
      { sel: grid, before: marked },
      { timeout: 60_000, polling: 200 },
    );
  }
  await expect(page.locator(grid)).toBeVisible();
  await postbacksSettled(page);
}

/** Wait until postbacks stop; a click sent during one is dropped. */
async function postbacksSettled(page: Page | Frame): Promise<void> {
  // A full postback reloads the page mid-check; count that as still busy and look again.
  const busy = () =>
    page
      .evaluate(() => {
        const w = window as unknown as PostbackWindow;
        return { done: w.postbacksDone ?? 0, active: !!w.Sys?.WebForms?.PageRequestManager?.getInstance().get_isInAsyncPostBack() };
      })
      .catch(() => ({ done: -1, active: true }));
  for (let settled = false; !settled; ) {
    await postbackIdle(page);
    const before = await busy();
    await page.waitForTimeout(800);
    const after = await busy();
    settled = after.done === before.done && !after.active;
  }
}

/** Wait out an async postback in flight; a click sent during one is dropped. */
export async function postbackIdle(page: Page | Frame): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await page.waitForLoadState('load');
      await page.waitForFunction(() => !(window as unknown as PostbackWindow).Sys?.WebForms?.PageRequestManager?.getInstance().get_isInAsyncPostBack(), undefined, { timeout: 60_000, polling: 200 });
      return;
    } catch (e) {
      if (attempt === 3 || !/context was destroyed|navigation/i.test(String(e))) throw e;
    }
  }
}

/** "32 items in 4 pages" when the grid is paged, otherwise the rows on screen. */
export async function gridTotal(page: Page | Frame, grid: string): Promise<number> {
  const pager = await page.locator(`${grid} .rgPager`).first().innerText().catch(() => '');
  const items = pager.match(/(\d+) items in/);
  return items ? Number(items[1]) : page.locator(`${grid} > tbody > tr.rgRow, ${grid} > tbody > tr.rgAltRow`).count();
}

/** Grid rows as { header: cell text }. */
export async function gridRows(page: Page | Frame, grid: string): Promise<Record<string, string>[]> {
  return page.locator(grid).evaluate((table) => {
    // A sorted header also carries its sort button's "Form field N" or "Label N" caption.
    const headers = Array.from(table.querySelectorAll(':scope > thead > tr > th.rgHeader')).map((th) =>
      (th as HTMLElement).innerText.replace(/HeaderText|(Form field|Label) \d+/g, '').trim(),
    );
    return Array.from(table.querySelectorAll(':scope > tbody > tr.rgRow, :scope > tbody > tr.rgAltRow')).map((tr) =>
      Object.fromEntries(headers.map((h, i) => [h, ((tr.children[i] as HTMLElement)?.innerText ?? '').replace(/HeaderText/g, '').trim()])),
    );
  });
}

/** Rows from every page of a paged grid, leaving it on the last page. */
export async function allGridRows(page: Page, grid: string): Promise<Record<string, string>[]> {
  const total = await gridTotal(page, grid);
  // Apply keeps the page the grid was on, so start again from page one.
  const current = page.locator(`${grid} .rgPager .rgCurrentPage`).first();
  if ((await current.count()) && (await current.innerText()).trim() !== '1') {
    await redraw(page, grid, () => page.locator(`${grid} .rgPageFirst`).first().click());
  }
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

type SortKind = 'text' | 'number' | 'money' | 'date' | 'grade';

const GRADE_ORDER = ['', 'PK', 'KG', ...Array.from({ length: 14 }, (_, i) => String(i + 1))];

function sortKey(kind: SortKind, value: string): string | number {
  if (kind === 'money') return cents(value || '$0');
  if (kind === 'number') return Number(value.replace(/[^0-9.-]/g, '')) || 0;
  if (kind === 'date') return Date.parse(value) || 0;
  if (kind === 'grade') return GRADE_ORDER.indexOf(value.toUpperCase());
  // SQL Server's word sort skips hyphens and apostrophes.
  return value.toLowerCase().replace(/[-']/g, '');
}

function inOrder(keys: (string | number)[], descending: boolean): boolean {
  return keys.every((k, i) => {
    if (i === 0) return true;
    const prev = keys[i - 1];
    const cmp = typeof k === 'number' ? (k as number) - (prev as number) : String(k).localeCompare(String(prev));
    return descending ? cmp <= 0 : cmp >= 0;
  });
}

/** Clicking a header sorts that column ascending, then descending. */
export async function expectSorts(page: Page, grid: string, column: string, kind: SortKind = 'text'): Promise<void> {
  const header = page.locator(`${grid} > thead`).getByRole('link', { name: column, exact: true });
  const columnKeys = async () => (await gridRows(page, grid)).map((r) => sortKey(kind, r[column]));
  for (const descending of [false, true]) {
    await redraw(page, grid, () => header.click());
    const keys = await columnKeys();
    expect(keys.length, `${column}: rows to sort`).toBeGreaterThan(1);
    expect(inOrder(keys, descending), `${column} ${descending ? 'descending' : 'ascending'}: ${keys.join(', ')}`).toBe(true);
  }
}

/** The pager: next, last, first, and a bigger page size, against "N items in M pages". */
export async function expectPaging(page: Page, grid: string): Promise<void> {
  const pager = page.locator(`${grid} .rgPager`).first();
  const info = async () => {
    const [, items, pages] = (await pager.innerText()).match(/(\d+) items in (\d+) pages/) ?? [];
    return { items: Number(items), pages: Number(pages) };
  };
  const rowCount = () => page.locator(`${grid} > tbody > tr.rgRow, ${grid} > tbody > tr.rgAltRow`).count();
  const current = () => pager.locator('.rgCurrentPage').innerText();
  if ((await current()).trim() !== '1') await redraw(page, grid, () => pager.locator('.rgPageFirst').click());
  const { items, pages } = await info();
  expect(pages, `${grid}: more than one page`).toBeGreaterThan(1);
  const size = await rowCount();
  expect(pages).toBe(Math.ceil(items / size));
  const first = JSON.stringify(await gridRows(page, grid));

  await redraw(page, grid, () => pager.locator('.rgPageNext').click());
  expect(await current()).toBe('2');
  expect(JSON.stringify(await gridRows(page, grid)), 'page 2 shows other rows').not.toBe(first);
  if (pages > 2) await redraw(page, grid, () => pager.locator('.rgPageLast').click());
  expect(await current()).toBe(String(pages));
  expect(await rowCount(), 'rows on the last page').toBe(items - (pages - 1) * size);
  await redraw(page, grid, () => pager.locator('.rgPageFirst').click());
  expect(await current()).toBe('1');
  expect(JSON.stringify(await gridRows(page, grid))).toBe(first);

  await pager.locator('[id$="PageSizeComboBox_Arrow"]').click();
  const bigger = page.locator('.rcbSlide li').locator('visible=true').filter({ hasText: /^\d+$/ }).filter({ hasNotText: String(size) }).last();
  const biggerSize = Number(await bigger.innerText());
  await redraw(page, grid, () => bigger.click());
  expect(await rowCount(), `page size ${biggerSize}`).toBe(Math.min(items, biggerSize));
  expect(await gridTotal(page, grid), 'same total at any page size').toBe(items);
}
