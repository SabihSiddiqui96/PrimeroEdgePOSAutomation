import { test, expect, Page } from '@playwright/test';
import { dialogFrame, expectNoDialog } from '../../../utils/dialog';
import { closeSummarySale, EDIT_SALES_GRID, EDIT_SALES_PATH, setMealCount, showEditSales, startSale, summaryLines } from '../../../utils/manualSale';
import { openPosPage } from '../../../utils/pos';
import { expectButtons, expectCaptions, expectGridColumns, expectGridResolved, expectPageTitle } from '../../../utils/screen';
import { LOCAL_ONLY, LOCAL_ONLY_REASON, nextTestName, TEST_SITE_CODE, TEST_SITE_NAME, usDate } from '../../../utils/testData';
import { cents, expectPaging, expectSorts, gridRows, pickSiteCode, postbackIdle, redraw, typeDate } from '../../../utils/webforms';

// POS > Administration > Edit Sales (/POS/EditManualSale.aspx)
const ID = 'ctl00_UserContentArea_';
const MEAL_TYPE = 'Lunch';
const MENU_ITEM = 'Lunch Meal';
const TODAY = usDate(new Date());
const YEAR_START = usDate(new Date(new Date().getFullYear(), 0, 1));
// Record Sales puts its sales on the first day of the year; Edit Sales works with those.
const SALE_DATE = YEAR_START;

test.describe('POS - Administration - Edit Sales', () => {
  test('Edit Sales: filters, sort, paging, print, and editing a summary sale', async ({ page }) => {
    test.setTimeout(12 * 60_000);
    await openPosPage(page, EDIT_SALES_PATH);
    await expect(page).toHaveTitle(/Edit Sales/i);
    await expectPageTitle(page, 'Edit Sales');

    await test.step('every site and today by default', async () => {
      await expectCaptions(page, ['Site Code', 'Site', 'From', 'To']);
      await expect(page.locator(`#${ID}ucAreaSiteSelector_rcbSiteCode_Input`)).toHaveValue('-- ALL --');
      await expect(page.locator(`#${ID}ucAreaSiteSelector_rcbSite_Input`)).toHaveValue('-- ALL --');
      await expect(page.locator(`#${ID}calFromDate_dateInput`)).toHaveValue(TODAY);
      await expect(page.locator(`#${ID}calToDate_dateInput`)).toHaveValue(TODAY);
      await expect(page.locator('#ctl00_page_content')).toContainText('The date range selections cannot exceed one year, please adjust the From Date as needed.');
      await expectButtons(page, [
        [`${ID}btnApply`, 'Apply'],
        [`${ID}ReportCaller1_rptRetriever`, 'Print List'],
      ]);
      await expectGridColumns(page, `${ID}gridManualSale_ctl00`, ['Date', 'Site', 'Terminal', 'User', 'Meal Type', 'Menu Item', 'Entry Type', 'Edit']);
      await expectGridResolved(page, `${ID}gridManualSale_ctl00`);
      for (const row of await gridRows(page, EDIT_SALES_GRID)) expect(Date.parse(row['Date'])).toBe(Date.parse(TODAY));
    });

    await test.step('a site and the year so far: only that site, only those dates, newest first', async () => {
      const rows = await showEditSales(page, TEST_SITE_CODE, YEAR_START, TODAY);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row['Site']).toBe(TEST_SITE_NAME);
        expect(Date.parse(row['Date'])).toBeGreaterThanOrEqual(Date.parse(YEAR_START));
        expect(Date.parse(row['Date'])).toBeLessThanOrEqual(Date.parse(TODAY));
        expect(row['Terminal']).toMatch(new RegExp(`[-_]${TEST_SITE_CODE}$`));
        expect(row['Entry Type']).toMatch(/^(Summary|Detail)$/);
        expect(row['User']).not.toBe('');
      }
      const dates = rows.map((r) => Date.parse(r['Date']));
      expect(dates, 'newest first').toEqual([...dates].sort((a, b) => b - a));
    });

    await test.step('paging and sorting every column', async () => {
      await expectPaging(page, EDIT_SALES_GRID);
      await expectSorts(page, EDIT_SALES_GRID, 'Date', 'date');
      for (const column of ['Terminal', 'User', 'Meal Type', 'Menu Item', 'Entry Type']) await expectSorts(page, EDIT_SALES_GRID, column);
    });

    await test.step('Print List opens the list as a report', async () => {
      const first = (await gridRows(page, EDIT_SALES_GRID))[0];
      const popup = page.context().waitForEvent('page');
      await page.locator(`#${ID}ReportCaller1_rptRetriever`).click();
      const report = await popup;
      const text = async () => (await report.locator('body').innerText()).replace(/\s+/g, ' ');
      await expect.poll(text, { message: 'sales list report', timeout: 60_000 }).toContain(first['Terminal']);
      expect(await text()).toContain(TEST_SITE_NAME);
      await report.close();
    });

    const summary = await test.step('the summary sales on the sale date', async () => {
      let rows = await showEditSales(page, TEST_SITE_CODE, SALE_DATE);
      if (!rows.some(isSummary)) {
        await startSale(page, { siteCode: TEST_SITE_CODE, date: SALE_DATE, mealType: MEAL_TYPE, menuItem: MENU_ITEM });
        await setMealCount(page, 'Paid', 1);
        const paid = (await summaryLines(page)).find((l) => l.personType === 'Paid')!;
        await closeSummarySale(page, cents(paid.total) / 100);
        rows = await showEditSales(page, TEST_SITE_CODE, SALE_DATE);
      }
      for (const row of rows) expect(Date.parse(row['Date'])).toBe(Date.parse(SALE_DATE));
      return rows.find(isSummary)!;
    });

    const editUrl = await test.step('Edit opens the sale with its site, terminal, date, meal and counts', async () => {
      await page.locator(`${EDIT_SALES_GRID} > tbody > tr`).filter({ hasText: summary['Terminal'] }).filter({ hasText: 'Summary' }).first().locator('input[id$="imgViewEditSale"]').click();
      await expect(page).toHaveURL(/ManualSaleSummaryEntryEdit\.aspx/);
      await expect(page).toHaveTitle(/Edit Sales Summary/);
      const content = page.locator('#ctl00_page_content');
      await expect(content).toContainText(TEST_SITE_NAME);
      await expect(content).toContainText(summary['Terminal']);
      await expect(page.locator(`#${ID}calSessionDate_dateInput`)).toHaveValue(SALE_DATE);
      await expect(page.locator(`#${ID}ddlMealType option:checked`)).toHaveText(MEAL_TYPE);
      await expect(page.locator(`#${ID}ddlMenuItem_Input`)).toHaveValue(MENU_ITEM);
      await expect(content).toContainText(`${MEAL_TYPE} - Meal Item`);
      await expect(content).toContainText(/Opening Balance\s*\$0\.00/);
      await expect(content).toContainText(/Closing Balance\s*\$[\d,]+\.\d{2}/);
      const lines = await summaryLines(page);
      expect(lines.map((l) => l.personType)).toEqual(expect.arrayContaining(['Free', 'Reduced', 'Paid']));
      expect(lines.filter((l) => Number(l.count) > 0).length, 'person types with meals').toBeGreaterThan(0);
      for (const line of lines) {
        expect(cents(line.total), `${line.personType}: count x price + tax`).toBe(Number(line.count) * cents(line.price) + cents(line.tax));
      }
      await expect(page.locator(`#${ID}txtCommentHistory`), 'history is read only').not.toBeEditable();
      await expect(page.locator(`#${ID}txtComments`)).toBeEditable();
      await expectButtons(page, [
        [`${ID}btnClose`, 'Close'],
        [`${ID}btnSave`, 'Save'],
      ]);
      return page.url();
    });

    await test.step('Closing balance details match the closing balance', async () => {
      const closing = await closingBalance(page);
      await page.locator(`#${ID}btnClosingBalance`).click();
      const frame = await dialogFrame(page, /ClosePOS\.aspx|POS\.aspx/i);
      await expect(frame.locator('[id$="txtTotalClosing"], [id$="txtCash"]').first()).toHaveValue(closing);
      await frame.locator(`#${ID}btnCancel`).click();
      await expectNoDialog(page);
    });

    const edited = await test.step('changing a count recalculates tax and total at the same rate', async () => {
      const before = (await summaryLines(page)).find((l) => Number(l.count) > 0)!;
      const rate = cents(before.tax) / (Number(before.count) * cents(before.price));
      const count = Number(before.count) + 1;
      await setMealCount(page, before.personType, count);
      await expect
        .poll(async () => (await summaryLines(page)).find((l) => l.personType === before.personType)!.total, { message: 'total recalculated' })
        .not.toBe(before.total);
      const after = (await summaryLines(page)).find((l) => l.personType === before.personType)!;
      const subtotal = count * cents(after.price);
      expect(cents(after.tax), 'same tax rate').toBe(Math.round(subtotal * rate));
      expect(cents(after.total)).toBe(subtotal + cents(after.tax));
      return { personType: before.personType, count };
    });

    const comment = await test.step('Save keeps the new count and adds the comment to the history', async () => {
      if (LOCAL_ONLY) {
        test.info().annotations.push({ type: 'skipped step', description: LOCAL_ONLY_REASON });
        return null;
      }
      const history = await page.locator(`#${ID}txtCommentHistory`).inputValue();
      const comment = nextTestName(history.match(/SabihTesting\d+/g) ?? []);
      await page.locator(`#${ID}txtComments`).fill(comment);
      await page.locator(`#${ID}btnSave`).click();
      await postbackIdle(page);
      await page.goto(editUrl);
      const line = (await summaryLines(page)).find((l) => l.personType === edited.personType)!;
      expect(line.count, 'saved count').toBe(String(edited.count));
      await expect(page.locator(`#${ID}txtCommentHistory`)).toHaveValue(new RegExp(comment));
      await expect(page.locator(`#${ID}txtComments`)).toHaveValue('');
      return comment;
    });

    await test.step('Close goes back to the list without saving', async () => {
      await setMealCount(page, edited.personType, edited.count + 1);
      await page.locator(`#${ID}btnClose`).click();
      await expect(page).toHaveURL(/EditManualSale\.aspx/);
      await page.goto(editUrl);
      const saved = comment ? edited.count : edited.count - 1;
      expect((await summaryLines(page)).find((l) => l.personType === edited.personType)!.count, 'unsaved count dropped').toBe(String(saved));
      if (comment) await expect(page.locator(`#${ID}txtCommentHistory`)).toHaveValue(new RegExp(comment));
    });

    await test.step('Back to Edit Sales returns to the list', async () => {
      await page.locator(`#${ID}hplBackEditSales`).click();
      await expect(page).toHaveURL(/EditManualSale\.aspx/);
      await expectPageTitle(page, 'Edit Sales');
    });

    await test.step('Edit on a Detail sale opens its session in Reconciliation', async () => {
      const rows = await showEditSales(page, TEST_SITE_CODE, YEAR_START, TODAY);
      const detail = rows.find((r) => r['Entry Type'] === 'Detail');
      if (!detail) {
        test.info().annotations.push({ type: 'not covered', description: 'no Detail sale on the first page this year' });
        return;
      }
      await page.locator(`${EDIT_SALES_GRID} > tbody > tr`).filter({ hasText: detail['Terminal'] }).filter({ hasText: 'Detail' }).first().locator('input[id$="imgViewEditSale"]').click();
      await expect(page).toHaveURL(/ReconciliationInfo\.aspx.*IsFromEditManualSale=true/);
      await expect(page.locator(`#${ID}lblTerminal`)).toHaveText(detail['Terminal']);
      await expect(page.locator(`#${ID}lblOpeningDateTime`)).toHaveText(new RegExp(`^${usDate(new Date(detail['Date']))} `));
    });
  });

  test.fixme('Edit Sales: a range over a year is refused, not a server error', async ({ page }) => {
    await openPosPage(page, EDIT_SALES_PATH);
    await pickSiteCode(page, TEST_SITE_CODE);
    const lastYear = new Date().getFullYear() - 1;
    await typeDate(page, `${ID}calFromDate_dateInput`, `1/1/${lastYear}`);
    await typeDate(page, `${ID}calToDate_dateInput`, TODAY);
    await redraw(page, EDIT_SALES_GRID, () => page.locator(`#${ID}btnApply`).click());
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
    const from = Date.parse(await page.locator(`#${ID}calFromDate_dateInput`).inputValue());
    expect(Date.parse(TODAY) - from, 'clamped to a year').toBeLessThanOrEqual(366 * 24 * 3600 * 1000);
  });
});

function isSummary(row: Record<string, string>): boolean {
  return row['Entry Type'] === 'Summary' && row['Menu Item'] === MENU_ITEM;
}

async function closingBalance(page: Page): Promise<string> {
  return (await page.locator('#ctl00_page_content').innerText()).match(/Closing Balance\s*(\$[\d,]+\.\d{2})/)![1];
}
