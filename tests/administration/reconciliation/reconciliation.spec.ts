import { test, expect, Page } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectGridColumns,
  expectGridResolved,
  expectHasOptions,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';
import { TEST_SITE_CODE, usDate } from '../../../utils/testData';
import { header, history, openTab } from './_reconciliation_info_page';
import { allGridRows, expectPaging, expectSorts, gridRows, gridTotal, pickSiteCode, redraw, typeDate } from '../../../utils/webforms';

// POS > Administration > Reconciliation (/POS/Reconciliation.aspx)
const PATH = '/POS/Reconciliation.aspx';
const ID = 'ctl00_UserContentArea_';
const GRID = `#${ID}gridSessions_ctl00`;
const STATUSES = ['Initialized', 'Opened', 'Closed', 'Reconciled', 'Deposited'];

test.describe('POS - Administration - Reconciliation', () => {
  test('Reconciliation: filters, statuses, columns, empty sessions, sort, paging and deposit slip', async ({ page }) => {
    test.setTimeout(10 * 60_000);
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/Reconciliation/i);
    await expectPageTitle(page, 'Reconciliation');

    await test.step('search filters', async () => {
      await expectCaptions(page, ['Site Code', 'Site', 'From', 'To', 'Entry Type', 'Terminal Name', 'Cashier', 'Meal Type']);
      await expectVisible(page, [`${ID}txtTerminalname`, `${ID}txtCashier`]);
      await expectFilled(page, [
        `${ID}ucAreaSiteSelector_rcbSiteCode_Input`,
        `${ID}ucAreaSiteSelector_rcbSite_Input`,
        `${ID}calFromDate_dateInput`,
        `${ID}calToDate_dateInput`,
      ]);
      await expectHasOptions(page, `${ID}ddlEntrymethod`);
      await expectHasOptions(page, `${ID}ddlMealType`);
      await expect(page.locator(`#${ID}calToDate_dateInput`), 'To defaults to today').toHaveValue(usDate(new Date()));
      expect(Date.parse(await page.locator(`#${ID}calFromDate_dateInput`).inputValue())).toBeLessThanOrEqual(Date.now());
      await expect(page.locator('#ctl00_page_content')).toContainText('The date range selections cannot exceed one year');
    });

    await test.step('session status: Initialized, Opened and Closed ticked by default', async () => {
      await expectCaptions(page, ['Session Status', ...STATUSES]);
      for (const [i, status] of STATUSES.entries()) {
        const box = page.locator(`#${ID}chkSessionStatus_${i}`);
        if (i < 3) await expect(box, status).toBeChecked();
        else await expect(box, status).not.toBeChecked();
      }
    });

    await test.step('report options and actions', async () => {
      await expectCaptions(page, ['Check for Duplicate Meals', 'Check for Empty Sessions', 'Show Credit Card Column']);
      await expect(page.locator(`#${ID}chkShowCreditCard`)).toBeChecked();
      await expect(page.locator(`#${ID}chkDuplicateMeals`)).not.toBeChecked();
      await expect(page.locator(`#${ID}chkEmptySessions`)).not.toBeChecked();
      await expectButtons(page, [
        [`${ID}btnApply`, 'Apply'],
        [`${ID}btnDeleteSelected`, 'Delete Selected'],
        [`${ID}btnAutoReconcile`, 'Auto Reconcile'],
        [`${ID}btnDepositSlip`, 'Deposit Slip ...'],
      ]);
      await expect(page.locator(`#${ID}btnDeleteSelected`), 'nothing to delete before a search').toBeDisabled();
      await expectGridColumns(page, `${ID}gridSessions_ctl00`, ['EntryType', 'Terminal', 'Cashier', 'Meal Type', 'Opening Balance', 'Opening Date', 'Closing Balance', 'Credit Card', 'Closing Date', 'Status', 'Over/Under', 'A/R']);
      await expectGridResolved(page, `${ID}gridSessions_ctl00`);
    });

    const every = await test.step('every status at the test site over 30 days', async () => {
      await pickSiteCode(page, TEST_SITE_CODE);
      const from = new Date();
      from.setDate(from.getDate() - 30);
      await typeDate(page, `${ID}calFromDate_dateInput`, usDate(from));
      for (const i of [3, 4]) await page.locator(`#${ID}chkSessionStatus_${i}`).check();
      await apply(page);
      const rows = await allGridRows(page, GRID);
      expect(rows.length, 'sessions at the test site').toBeGreaterThan(0);
      for (const r of rows) {
        expect(STATUSES, `${r['Opening Date']} status`).toContain(r['Status']);
        expect(Date.parse(r['Opening Date']), `${r['Opening Date']} in range`).toBeGreaterThanOrEqual(Date.parse(usDate(from)));
      }
      await expect(page.locator(`#${ID}btnAutoReconcile`), 'Auto Reconcile once sessions are listed').toBeEnabled();
      return rows;
    });

    await test.step('each status on its own lists only that status, and they add up', async () => {
      let sum = 0;
      for (const [i, status] of STATUSES.entries()) {
        for (const j of STATUSES.keys()) await page.locator(`#${ID}chkSessionStatus_${j}`).setChecked(i === j);
        await apply(page);
        const rows = await allGridRows(page, GRID);
        for (const r of rows) expect(r['Status'], status).toBe(status);
        expect(rows.length, status).toBe(every.filter((r) => r['Status'] === status).length);
        sum += rows.length;
      }
      expect(sum, 'statuses add up to the whole list').toBe(every.length);
      for (const j of STATUSES.keys()) await page.locator(`#${ID}chkSessionStatus_${j}`).check();
    });

    await test.step('Entry Type, Meal Type, Terminal and Cashier each narrow the list', async () => {
      const entry = every[0]['EntryType'];
      await page.locator(`#${ID}ddlEntrymethod`).selectOption({ label: entry });
      await apply(page);
      const byEntry = await allGridRows(page, GRID);
      for (const r of byEntry) expect(r['EntryType'], 'entry type').toBe(entry);
      expect(byEntry.length).toBe(every.filter((r) => r['EntryType'] === entry).length);
      await page.locator(`#${ID}ddlEntrymethod`).selectOption({ index: 0 });

      const meal = every.find((r) => r['Meal Type'])?.['Meal Type'];
      expect(meal, 'a session with a meal type').toBeDefined();
      await page.locator(`#${ID}ddlMealType`).selectOption({ label: meal! });
      await apply(page);
      const byMeal = await allGridRows(page, GRID);
      // QA's Breakfast also lists CACFP Breakfast; the fixme test below wants it exact.
      for (const r of byMeal) expect(r['Meal Type'], 'meal type').toContain(meal);
      expect(byMeal.length).toBe(every.filter((r) => r['Meal Type'].includes(meal!)).length);
      await page.locator(`#${ID}ddlMealType`).selectOption({ index: 0 });

      const terminal = every[0]['Terminal'];
      await page.locator(`#${ID}txtTerminalname`).fill(terminal);
      await apply(page);
      const byTerminal = await allGridRows(page, GRID);
      for (const r of byTerminal) expect(r['Terminal'], 'terminal').toBe(terminal);
      expect(byTerminal.length).toBe(every.filter((r) => r['Terminal'] === terminal).length);
      await page.locator(`#${ID}txtTerminalname`).fill('');

      const cashier = every.find((r) => r['Cashier'])!['Cashier'];
      const firstName = cashier.split(' ')[0];
      await page.locator(`#${ID}txtCashier`).fill(firstName);
      await apply(page);
      const byCashier = await allGridRows(page, GRID);
      expect(byCashier.map((r) => r['Cashier'])).toContain(cashier);
      for (const r of byCashier) expect(r['Cashier'].toLowerCase(), 'cashier').toContain(firstName.toLowerCase());
      await page.locator(`#${ID}txtCashier`).fill('');
      await apply(page);
      expect(await gridTotal(page, GRID)).toBe(every.length);
    });

    await test.step('Show Credit Card Column adds and removes the column', async () => {
      await page.locator(`#${ID}chkShowCreditCard`).uncheck();
      await apply(page);
      expect(Object.keys((await gridRows(page, GRID))[0])).not.toContain('Credit Card');
      await page.locator(`#${ID}chkShowCreditCard`).check();
      await apply(page);
      expect(Object.keys((await gridRows(page, GRID))[0])).toContain('Credit Card');
    });

    await test.step('Check for Empty Sessions lists only sessions with nothing in them', async () => {
      await page.locator(`#${ID}chkEmptySessions`).check();
      await apply(page);
      // This mode reloads the page; read page one and the pager count only.
      const empty = await gridRows(page, GRID);
      expect(Object.keys(empty[0] ?? { Delete: '' }), 'a Delete column instead of A/R').toContain('Delete');
      const listed = new Set(every.map((r) => `${r['Terminal']} ${r['Opening Date']}`));
      for (const r of empty) expect(listed.has(`${r['Terminal']} ${r['Opening Date']}`), `${r['Terminal']} ${r['Opening Date']} is a listed session`).toBe(true);
      expect(await gridTotal(page, GRID)).toBeLessThanOrEqual(every.length);
      await expect(page.locator(`#${ID}btnAutoReconcile`), 'no Auto Reconcile on empty sessions').toBeHidden();
      // Delete Selected removes at once, with no confirmation, so it is not pressed here.
      await page.locator(`#${ID}chkEmptySessions`).uncheck();
      await apply(page);
      expect(await gridTotal(page, GRID)).toBe(every.length);
    });

    await test.step('Check for Duplicate Meals keeps the same sessions', async () => {
      await page.locator(`#${ID}chkDuplicateMeals`).check();
      await apply(page);
      expect(await gridTotal(page, GRID)).toBe(every.length);
      await page.locator(`#${ID}chkDuplicateMeals`).uncheck();
    });

    await test.step('Pages, page size, and sorting by each column', async () => {
      await apply(page);
      if (every.length > (await gridRows(page, GRID)).length) await expectPaging(page, GRID);
      await expectSorts(page, GRID, 'Opening Date', 'date');
      await expectSorts(page, GRID, 'Closing Balance', 'money');
      await expectSorts(page, GRID, 'Opening Balance', 'money');
      await expectSorts(page, GRID, 'Over/Under', 'money');
      await expectSorts(page, GRID, 'Status');
      await expectSorts(page, GRID, 'Terminal');
      await expectSorts(page, GRID, 'Cashier');
    });

    await test.step('Deposit Slip opens Add Deposit Slip; Back returns with the site kept', async () => {
      await page.locator(`#${ID}btnDepositSlip`).click();
      await expect(page).toHaveURL(/DepositSlipInfo\.aspx\?isFromReconcile=true/);
      await expect(page).toHaveTitle(/Add Deposit Slip/);
      await page.locator(`#${ID}hplBackSlips`).click();
      await expect(page).toHaveURL(/Reconciliation\.aspx/);
      await expect(page.locator(`#${ID}ucAreaSiteSelector_rcbSiteCode_Input`)).toHaveValue(TEST_SITE_CODE);
    });

    await test.step('a From over a year back pulls To in to one year', async () => {
      const from = new Date();
      from.setFullYear(from.getFullYear() - 2);
      await typeDate(page, `${ID}calFromDate_dateInput`, usDate(from));
      const to = new Date(from);
      to.setFullYear(to.getFullYear() + 1);
      await expect(page.locator(`#${ID}calToDate_dateInput`)).toHaveValue(usDate(to));
    });
  });

  test('Reconciliation Info: details, move controls, tabs, report export, cancel and back', async ({ page }) => {
    test.setTimeout(8 * 60_000);
    await openPosPage(page, PATH);

    const row = await test.step('open a closed session at the test site', async () => {
      await pickSiteCode(page, TEST_SITE_CODE);
      const from = new Date();
      from.setDate(from.getDate() - 364);
      await typeDate(page, `${ID}calFromDate_dateInput`, usDate(from));
      for (const i of [0, 1]) await page.locator(`#${ID}chkSessionStatus_${i}`).uncheck();
      await apply(page);
      const [first] = await gridRows(page, GRID);
      expect(first, 'a closed session in the last year').toBeDefined();
      expect(first['Status']).toBe('Closed');
      await page.locator(`${GRID} > tbody > tr`).first().locator('a[title^="Reconcile"]').click();
      await expect(page).toHaveTitle(/Reconciliation Info/i);
      return first;
    });

    await test.step('the header matches the session in the list', async () => {
      expect(await header(page)).toMatchObject({
        cashier: row['Cashier'],
        terminal: row['Terminal'],
        openingDate: row['Opening Date'],
        openingBalance: row['Opening Balance'],
        closingDate: row['Closing Date'],
        closingBalance: row['Closing Balance'],
      });
    });

    await test.step('Move Terminal and Move Date do nothing until something is picked', async () => {
      for (const id of ['btnMoveSession', 'btnMoveDate']) {
        await page.locator(`#${ID}${id}`).click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator(`#${ID}lblTerminal`), `${id} with nothing picked`).toHaveText(row['Terminal']);
        await expect(page.locator(`#${ID}lblOpeningDateTime`)).toHaveText(row['Opening Date']);
      }
    });

    await test.step('picking a site loads that site’s terminals', async () => {
      const site = page.locator(`#${ID}ddlSite`);
      const terminal = page.locator(`#${ID}ddlTerminal`);
      await expect(terminal.locator('option')).toHaveText(['-- Select --']);
      await site.selectOption({ index: 1 });
      await expect.poll(async () => (await terminal.locator('option').count()), { message: 'terminals for the site' }).toBeGreaterThan(1);
      await site.selectOption({ index: 0 });
      await page.waitForLoadState('networkidle');
    });

    await test.step('every tab opens', async () => {
      for (const tab of ['Transactions', 'History', 'Summary'] as const) await openTab(page, tab);
      expect((await history(page)).map((r) => r['Status'])).toContain('Closed');
    });

    await test.step('Session Report exports in every format', async () => {
      const formats: [string, RegExp][] = [['Word', /\.docx?$/i], ['Excel', /\.xlsx?$/i], ['PDF', /\.pdf$/i], ['CSV (comma delimited)', /\.csv$/i]];
      for (const [format, extension] of formats) {
        await page.locator('[id$="toggleExportList"]').first().click();
        const download = page.waitForEvent('download', { timeout: 60_000 });
        await page.getByRole('link', { name: format, exact: true }).click();
        const file = await download;
        expect(file.suggestedFilename(), format).toMatch(extension);
      }
      await page.locator('[id$="toggleExportList"]').first().click();
      for (const format of ['TIFF file', 'MHTML (web archive)', 'XML file with report data']) {
        await expect(page.getByRole('link', { name: format, exact: true }), format).toBeVisible();
      }
      await page.locator('[id$="toggleExportList"]').first().click();
    });

    await test.step('Cancel and Back to Sessions both return to the list', async () => {
      await page.locator(`#${ID}btnCancel`).click();
      await expect(page).toHaveURL(/Reconciliation\.aspx/);
      await apply(page);
      await page.locator(`${GRID} > tbody > tr`).first().locator('a[title^="Reconcile"]').click();
      await expect(page).toHaveTitle(/Reconciliation Info/i);
      await page.locator(`#${ID}hplBackSessions`).click();
      await expect(page).toHaveURL(/Reconciliation\.aspx/);
      await expect(page).toHaveTitle(/Reconciliation/i);
    });
  });

  // QA: Meal Type Breakfast also lists CACFP Breakfast sessions.
  test.fixme('Reconciliation: a meal type lists only that meal type', async ({ page }) => {
    await openPosPage(page, PATH);
    await pickSiteCode(page, TEST_SITE_CODE);
    const from = new Date();
    from.setDate(from.getDate() - 30);
    await typeDate(page, `${ID}calFromDate_dateInput`, usDate(from));
    for (const i of [3, 4]) await page.locator(`#${ID}chkSessionStatus_${i}`).check();
    await page.locator(`#${ID}ddlMealType`).selectOption({ label: 'Breakfast' });
    await apply(page);
    for (const r of await allGridRows(page, GRID)) expect(r['Meal Type']).toBe('Breakfast');
  });
});

async function apply(page: Page): Promise<void> {
  await redraw(page, GRID, () => page.locator(`#${ID}btnApply`).click());
}
