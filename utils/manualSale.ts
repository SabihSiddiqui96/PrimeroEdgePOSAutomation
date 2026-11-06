import { expect, Page } from '@playwright/test';
import { openPosPage } from './pos';
import { gridRows, pickSiteCode, postbackIdle, redraw, typeDate } from './webforms';

const ID = 'ctl00_UserContentArea_';
export const RECORD_SALES_PATH = '/POS/ManualSaleBulkEntry.aspx';
export const SUMMARY_GRID = `#${ID}gridSummarySale_ctl00`;
export const DETAILED_GRID = `#${ID}gridDetailedSale_ctl00`;
export const OTHER_SALES_GRID = `#${ID}gridDetSummarySale_ctl00`;
export const QUICK = `#${ID}ucQuickEntry_`;

export const ENTRY_METHODS = ['Summary', 'Quick', 'Meals Only', 'Detailed'] as const;
export type EntryMethod = (typeof ENTRY_METHODS)[number];

export interface SummaryLine {
  personType: string;
  count: string;
  price: string;
  tax: string;
  total: string;
}

/** One person-type row of a summary grid: Person Type, Meal Count, Meal Price, [A La Carte,] Tax, Total Amount. */
export async function summaryLines(page: Page, grid = SUMMARY_GRID): Promise<SummaryLine[]> {
  await expect(page.locator(grid)).toBeVisible();
  return page.locator(`${grid} > tbody > tr.rgRow, ${grid} > tbody > tr.rgAltRow`).evaluateAll((rows) =>
    rows.map((tr) => {
      const text = (tr as HTMLElement).innerText.split(/[\t\n]/).map((t) => t.trim()).filter((t) => t && !/^Form field/.test(t));
      return {
        personType: text[0] ?? '',
        count: (tr.querySelector('input[id$="txtMealCount"]') as HTMLInputElement | null)?.value ?? '',
        price: text.find((t) => t.startsWith('$')) ?? '',
        tax: text[text.length - 2] ?? '',
        total: text[text.length - 1] ?? '',
      };
    }),
  );
}

export async function setMealCount(page: Page, personType: string, count: number, grid = SUMMARY_GRID): Promise<void> {
  const index = (await summaryLines(page, grid)).findIndex((l) => l.personType === personType);
  expect(index, `${personType} row`).toBeGreaterThanOrEqual(0);
  const box = page.locator(`${grid} input[id$="txtMealCount"]`).nth(index);
  await box.click();
  await box.press('Control+A');
  await box.pressSequentially(String(count));
  await box.press('Tab');
  await expect(box).toHaveValue(String(count));
  await postbackIdle(page);
}

export interface SaleSetup {
  siteCode: string;
  date: string;
  mealType: string;
  menuItem: string;
}

/** Record Sales: site, session date, meal type, menu item and entry method, then Apply to reach Step 1. */
export async function startSale(page: Page, sale: SaleSetup, entry: EntryMethod = 'Summary'): Promise<void> {
  await openPosPage(page, RECORD_SALES_PATH);
  await pickSiteCode(page, sale.siteCode);
  await typeDate(page, `${ID}calSessionDate_dateInput`, sale.date);
  // The date posts back too; a meal type picked during that is lost.
  await page.waitForLoadState('networkidle');
  const items = page.locator(`#${ID}ddlMenuItem_Input`);
  for (let attempt = 1; ; attempt++) {
    await page.locator(`#${ID}ddlMealType`).selectOption({ label: sale.mealType });
    // The meal type reloads the menu items.
    if ((await expect(items).toHaveValue('-- SELECT --', { timeout: 10_000 }).then(() => true, () => false)) || attempt === 2) break;
    await page.locator(`#${ID}ddlMealType`).selectOption({ index: 0 });
    await page.waitForLoadState('networkidle');
  }
  await expect(items).toHaveValue('-- SELECT --');
  await page.locator(`#${ID}ddlMenuItem_Arrow`).click();
  await page.locator(`#${ID}ddlMenuItem_DropDown li`).filter({ hasText: new RegExp(`^${sale.menuItem}$`) }).click();
  await expect(items).toHaveValue(sale.menuItem);
  await pickEntryMethod(page, entry);
  await page.locator(`#${ID}btnApply`).click();
  await expect(page.locator('#ctl00_page_content')).toContainText(`Step 1 - Enter ${sale.mealType}`);
  await postbackIdle(page);
}

export async function pickEntryMethod(page: Page, entry: EntryMethod): Promise<void> {
  const radio = page.locator(`#${ID}rbEntryType_${ENTRY_METHODS.indexOf(entry)}`);
  await radio.check();
  await expect(radio).toBeChecked();
  await page.waitForLoadState('networkidle');
  await postbackIdle(page);
}

/** Count one-dollar bills on a close-session step; returns the cash total shown. */
export async function countOnes(page: Page, ones: number): Promise<string> {
  const box = page.locator('[id$="UCDenomination_gridBills_ctl00_ctl04_txtCount"]').first();
  await expect(box).toBeVisible();
  await box.click();
  await box.press('Control+A');
  await box.pressSequentially(String(ones));
  await box.press('Tab');
  const cash = page.locator('[id$="UCDenomination_txtAdditionalTotalCash"]').first();
  await expect(cash).toHaveValue(`$${ones.toFixed(2)}`);
  // The count posts back as it changes; saving mid-postback is silently dropped.
  await page.waitForLoadState('networkidle');
  await postbackIdle(page);
  return cash.inputValue();
}

/** Step 2: count one-dollar bills and save; returns the cash total shown. */
export async function closeSummarySale(page: Page, ones: number): Promise<string> {
  await page.locator(`#${ID}btnNextSSStep1`).click();
  const shown = await countOnes(page, ones);
  await page.locator(`#${ID}btnSaveSSStep2`).click();
  // The confirmation text sits hidden in the page until a save succeeds.
  await expect(page.getByText('Summary Sale Entry Completed Successfully!')).toBeVisible();
  return shown;
}

/** Quick and Meals Only: type a patron id into the empty row; returns that row's cells. */
export async function addPatron(page: Page, patronId: string): Promise<{ name: string; balance: string }> {
  const box = page.locator(`[id^="${ID}ucQuickEntry_ucLookUp_txtStudentID"]`).last();
  const before = (await quickRows(page)).length;
  await box.click();
  await box.pressSequentially(patronId);
  await box.press('Tab');
  await expect.poll(async () => (await quickRows(page)).length, { message: `patron ${patronId} added` }).toBe(before + 1);
  await postbackIdle(page);
  const rows = await quickRows(page);
  expect(rows, `patron ${patronId} still listed`).toHaveLength(before + 1);
  return rows[before];
}

/** Detailed: ids of patrons on the first page who have not had this meal yet. */
export async function unfedPatrons(page: Page): Promise<string[]> {
  return page.locator(`${DETAILED_GRID} > tbody > tr`).evaluateAll((rows) =>
    rows
      .filter((tr) => {
        const box = tr.querySelector('input[id$="chkHadMeal"]') as HTMLInputElement | null;
        return !!box && !box.disabled && !box.checked;
      })
      .map((tr) => (tr as HTMLElement).innerText.split('	')[0].trim()),
  );
}

/** Patrons entered so far on the Quick or Meals Only grid: name and current balance. */
export async function quickRows(page: Page): Promise<{ name: string; balance: string }[]> {
  const text = await page.locator('#ctl00_page_content').innerText();
  return [...text.matchAll(/^\t([^\t\n]*?)\t[^\t\n]*\t[^\t\n]*\t(-?\$[\d,]+\.\d{2})/gm)].map((m) => ({ name: m[1].trim(), balance: m[2] }));
}

export const EDIT_SALES_PATH = '/POS/EditManualSale.aspx';
export const EDIT_SALES_GRID = `#${ID}gridManualSale_ctl00`;

/** Edit Sales, narrowed to one site and a date range. */
export async function showEditSales(page: Page, siteCode: string, from: string, to = from): Promise<Record<string, string>[]> {
  await openPosPage(page, EDIT_SALES_PATH);
  await pickSiteCode(page, siteCode);
  await typeDate(page, `${ID}calFromDate_dateInput`, from);
  await typeDate(page, `${ID}calToDate_dateInput`, to);
  await redraw(page, EDIT_SALES_GRID, () => page.locator(`#${ID}btnApply`).click());
  return gridRows(page, EDIT_SALES_GRID);
}
