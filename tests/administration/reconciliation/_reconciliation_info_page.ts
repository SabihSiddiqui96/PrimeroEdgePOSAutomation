import { expect, Frame, Locator, Page } from '@playwright/test';
import { readGrid } from './_reconciliation_page';

const ID = 'ctl00_UserContentArea_';

export type InfoTab = 'Summary' | 'Transactions' | 'Bulk Adjustments' | 'History';

const TAB_VIEW: Record<InfoTab, string> = {
  Summary: `${ID}rpvSessionDetails`,
  Transactions: `${ID}rpvTransactions`,
  'Bulk Adjustments': `${ID}rpvBulkAdjustments`,
  History: `${ID}rpvSessionHistory`,
};

export function label(page: Page | Frame, id: string): Locator {
  return page.locator(`#${ID}${id}`);
}

export function button(page: Page | Frame, id: string): Locator {
  return page.locator(`#${ID}${id}`);
}

/** The session details across the top of the page. */
export async function header(page: Page) {
  const text = async (id: string) => (await label(page, id).innerText()).trim();
  return {
    cashier: await text('lblCashier'),
    terminal: await text('lblTerminal'),
    openingDate: await text('lblOpeningDateTime'),
    openingBalance: await text('lblOpeningBalance'),
    closingDate: await text('lblClosingDateTime'),
    closingBalance: await text('lblClosingBalance'),
  };
}

/** Summary tab: Cashier / System / Over-Under for cash, checks and cards, plus totals. */
export async function summary(page: Page) {
  const text = async (id: string) => (await label(page, id).innerText()).trim();
  const line = async (kind: string) => ({
    cashier: await text(`lblCashier${kind}`),
    system: await text(`lblSystem${kind}`),
    overUnder: await text(`lblOverUnder${kind}`),
  });
  return {
    cash: await line('Cash'),
    checks: await line('Checks'),
    cards: await line('Cards'),
    adjusted: await text('lblAdjustedAmount'),
    total: await line('Total'),
    message: (await text('lblMessageBox')).replace(/\s+/g, ' '),
  };
}

export async function openTab(page: Page, tab: InfoTab): Promise<Locator> {
  await page.locator(`#${ID}rtsSessionDetails .rtsLink, .rtsLink`).filter({ hasText: new RegExp(`^\\s*${tab}\\s*$`) }).first().click();
  const view = page.locator(`#${TAB_VIEW[tab]}`);
  await expect(view, `${tab} tab`).toBeVisible();
  return view;
}

export async function transactions(page: Page): Promise<Record<string, string>[]> {
  const view = await openTab(page, 'Transactions');
  return readGrid(view.locator(`#${ID}gridTransactions_ctl00`));
}

/** Status changes, newest first. */
export async function history(page: Page): Promise<Record<string, string>[]> {
  const view = await openTab(page, 'History');
  await expect(view.locator('table[id$="_ctl00"]').first()).toBeVisible();
  return readGrid(view.locator('table[id$="_ctl00"]').first());
}

/** A RadWindow's page, once the dialog has loaded it. */
export async function dialogFrame(page: Page, url: RegExp): Promise<Frame> {
  let frame: Frame | undefined;
  await expect
    .poll(
      () => {
        frame = page.frames().find((f) => url.test(f.url()));
        return !!frame;
      },
      { message: `dialog ${url}`, timeout: 60_000 },
    )
    .toBe(true);
  await frame!.waitForLoadState('domcontentloaded');
  return frame!;
}

export async function expectNoOpenDialog(page: Page): Promise<void> {
  await expect
    .poll(() => page.locator('.RadWindow').evaluateAll((windows) => windows.some((w) => (w as HTMLElement).offsetWidth > 0)), {
      message: 'dialog closed',
    })
    .toBe(false);
}

/** Close the open dialog with its title-bar Close button. */
export async function closeDialog(page: Page): Promise<void> {
  await page.locator('.RadWindow a[title="Close"], .RadWindow .rwCloseButton').locator('visible=true').first().click();
  await expectNoOpenDialog(page);
}

/** Opening or closing cash count: the count and total on one denomination row. */
export async function denomination(frame: Frame, name: string) {
  const row = frame.locator('tr', { has: frame.locator('input[id$="txtCount"]') }).filter({ hasText: new RegExp(`^\\s*${name}\\b`) });
  await expect(row, `${name} row`).toHaveCount(1);
  return {
    count: await row.locator('input[id$="txtCount"]').inputValue(),
    total: (await row.locator('span[id$="lblTotal"]').innerText()).trim(),
  };
}

/** Every denomination row whose count is not zero. */
export async function countedDenominations(frame: Frame): Promise<string[]> {
  const rows = frame.locator('tr', { has: frame.locator('input[id$="txtCount"]') });
  const counted: string[] = [];
  for (let i = 0; i < (await rows.count()); i++) {
    if ((await rows.nth(i).locator('input[id$="txtCount"]').inputValue()) !== '0') {
      counted.push((await rows.nth(i).innerText()).trim().split(/\s/)[0]);
    }
  }
  return counted;
}
