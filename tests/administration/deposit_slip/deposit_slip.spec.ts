import { test, expect, Page } from '@playwright/test';
import { dialogFrame, expectNoDialog } from '../../../utils/dialog';
import { closeSummarySale, setMealCount, startSale, summaryLines } from '../../../utils/manualSale';
import { openPosPage } from '../../../utils/pos';
import { expectButtons, expectCaptions, expectGridColumns, expectGridResolved, expectPageTitle, expectVisible } from '../../../utils/screen';
import { LOCAL_ONLY, LOCAL_ONLY_REASON, nextTestName, TEST_SITE_CODE, TEST_SITE_NAME, usDate } from '../../../utils/testData';
import { allGridRows, cents, EDIT_SITE_PICKER, expectSorts, gridRows, money, pickSiteCode, postbackIdle, redraw, typeDate } from '../../../utils/webforms';
import { filterDay, SESSIONS_GRID, sessionRows } from '../reconciliation/_reconciliation_page';

// POS > Administration > Deposit Slip (/POS/DepositSlip.aspx)
const PATH = '/POS/DepositSlip.aspx';
const ID = 'ctl00_UserContentArea_';
const LIST = `#${ID}gridDepositSlip_ctl00`;
const TOTALS = `#${ID}UCDenomination_`;
const TODAY = usDate(new Date());
const YEAR_START = usDate(new Date(new Date().getFullYear(), 0, 1));
// Deposits need every session that day reconciled, so the test uses the day its own manual sales go on.
const DEPOSIT_DATE = YEAR_START;
// Nobody records sales on the third of January, so there is never anything to deposit.
const EMPTY_DATE = usDate(new Date(new Date().getFullYear(), 0, 3));
const FACE: Record<string, number> = {
  Pennies: 1, Nickels: 5, Dimes: 10, Quarters: 25, 'Half-Dollars': 50, Dollars: 100,
  Ones: 100, Twos: 200, Fives: 500, Tens: 1000, Twenties: 2000, Fifties: 5000, Hundreds: 10000,
};

test.describe('POS - Administration - Deposit Slip', () => {
  test('Deposit Slip: list, search by number, sort, a slip’s details, and Add with nothing to deposit', async ({ page }) => {
    test.setTimeout(8 * 60_000);
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/Deposit Slip/i);
    await expectPageTitle(page, 'Deposit Slip');

    await test.step('every site, the last week, both statuses by default', async () => {
      await expectCaptions(page, ['Site Code', 'Site', 'Search By', 'Date Range', 'Deposit Slip No.', 'From', 'To', 'Active', 'InActive']);
      await expect(page.locator(`#${ID}ucAreaSiteSelector_rcbSiteCode_Input`)).toHaveValue('-- ALL --');
      await expect(page.locator(`#${ID}ucAreaSiteSelector_rcbSite_Input`)).toHaveValue('-- ALL --');
      await expect(page.locator(`#${ID}rbDateRange`)).toBeChecked();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      await expect(page.locator(`#${ID}calFromDate_dateInput`)).toHaveValue(usDate(weekAgo));
      await expect(page.locator(`#${ID}calToDate_dateInput`)).toHaveValue(TODAY);
      await expect(page.locator(`#${ID}chkbActive`)).toBeChecked();
      await expect(page.locator(`#${ID}chkbInActive`)).toBeChecked();
      await expect(page.locator('#ctl00_page_content')).toContainText('The date range selections cannot exceed one year, please adjust the From Date as needed.');
      await expectButtons(page, [
        [`${ID}btnApply`, 'Apply'],
        [`${ID}btnAdd`, 'Add ...'],
      ]);
      await expectGridColumns(page, LIST.slice(1), ['Deposit Slip No.', 'Site', 'Deposit Date', 'Deposit Amount', 'Modified Date', 'Deposited By']);
      await expectGridResolved(page, LIST.slice(1));
    });

    const slips = await test.step('a site and the year so far: only that site and those dates', async () => {
      const rows = await slipsBetween(page, YEAR_START, TODAY);
      expect(rows.length, 'slips this year').toBeGreaterThan(1);
      for (const row of rows) {
        expect(row['Site']).toBe(TEST_SITE_NAME);
        expect(Date.parse(row['Deposit Date'])).toBeGreaterThanOrEqual(Date.parse(YEAR_START));
        expect(Date.parse(row['Deposit Date'])).toBeLessThanOrEqual(Date.parse(TODAY));
        // An edited slip also lists a reversal in brackets.
        expect(row['Deposit Amount']).toMatch(/^\(?\$[\d,]+\.\d{2}\)?$/);
        expect(row['Deposited By']).not.toBe('');
      }
      return rows;
    });

    await test.step('sorting by number, date, amount and depositor', async () => {
      const first = page.locator(`${LIST} .rgPageFirst`).first();
      if (await first.isVisible()) await redraw(page, LIST, () => first.click());
      await expectSorts(page, LIST, 'Deposit Slip No.');
      await expectSorts(page, LIST, 'Deposit Date', 'date');
      await expectSorts(page, LIST, 'Deposit Amount', 'money');
      await expectSorts(page, LIST, 'Deposited By');
    });

    const numbers = slips.map((s) => s['Deposit Slip No.']);
    const slip = slips.find((s) => numbers.filter((n) => n === s['Deposit Slip No.']).length === 1)!;
    await test.step('Deposit Slip No. swaps the dates for a number box and finds exactly that slip', async () => {
      await page.locator(`#${ID}radDepositSlipNo`).check();
      await expect(page.locator(`#${ID}depositSlipNo`)).toBeVisible();
      await expect(page.locator(`#${ID}calFromDate_dateInput`)).toBeHidden();
      await page.locator(`#${ID}depositSlipNo`).fill(slip['Deposit Slip No.']);
      await redraw(page, LIST, () => page.locator(`#${ID}btnApply`).click());
      expect(await gridRows(page, LIST)).toEqual([slip]);
    });

    await test.step('a number that isn’t a slip finds nothing', async () => {
      await page.locator(`#${ID}depositSlipNo`).fill('999999999');
      await redraw(page, LIST, () => page.locator(`#${ID}btnApply`).click());
      await expect(page.locator(LIST)).toContainText('No records to display.');
    });

    await test.step('opening a slip shows its site, date, counts and totals', async () => {
      await page.locator(`#${ID}depositSlipNo`).fill(slip['Deposit Slip No.']);
      await redraw(page, LIST, () => page.locator(`#${ID}btnApply`).click());
      await page.locator(LIST).getByRole('link', { name: slip['Deposit Slip No.'], exact: true }).click();
      await expect(page).toHaveURL(/DepositSlipInfo\.aspx\?.*IsView=true/);
      await expect(page.locator('body')).toContainText(new RegExp(`Deposit Slip Number:\\s*${slip['Deposit Slip No.']}\\b`));
      const content = page.locator('#ctl00_page_content');
      await expect(content).toContainText(TEST_SITE_CODE);
      await expect(content).toContainText(TEST_SITE_NAME);
      await expect(content).toContainText(slip['Deposit Date']);
      await expect(page.locator(`${TOTALS}txtDepositTotalClosing`)).toHaveValue(slip['Deposit Amount']);
      const cash = cents(await page.locator(`${TOTALS}txtTotalCash`).inputValue());
      const checks = cents(await page.locator(`${TOTALS}txtTotalChecks`).inputValue());
      expect(cash + checks, 'cash + checks = deposit total').toBe(cents(slip['Deposit Amount']));
      expect(await countedCash(page), 'the counts add up to the cash').toBe(cash);
      await expectButtons(page, [
        [`${ID}btnCancel`, 'Cancel'],
        [`${ID}btnSave`, 'Save'],
        [`${ID}ReportCaller1_rptRetriever`, 'Print'],
      ]);
    });

    await test.step('Back to Deposit Slips returns to the list', async () => {
      await page.locator(`#${ID}hplBackSlips`).click();
      await expect(page).toHaveURL(/DepositSlip\.aspx/);
      await expectPageTitle(page, 'Deposit Slip');
    });

    await test.step('Add starts on the user’s own site and today, with nothing to count yet', async () => {
      await page.locator(`#${ID}btnAdd`).click();
      await expect(page).toHaveURL(/DepositSlipInfo\.aspx\?isAddNew=true/);
      await expect(page).toHaveTitle(/Add Deposit Slip/);
      await expect(page.locator(`#${ID}calFromDate_dateInput`)).toHaveValue(TODAY);
      await expect(page.locator(`#${EDIT_SITE_PICKER.code}_Input`)).not.toHaveValue('');
      for (const total of ['txtTotalCash', 'txtTotalChecks', 'txtDepositTotalClosing', 'txtDepositActualTotal']) {
        await expect(page.locator(`${TOTALS}${total}`), total).toHaveValue('$0.00');
      }
      await expect(page.locator(`${TOTALS}txtComments`)).toBeDisabled();
      await expect(page.locator(`#${ID}btnSave`)).toHaveCount(0);
    });

    await test.step('a day with no reconciled sessions has nothing to deposit', async () => {
      await pickSiteCode(page, TEST_SITE_CODE, EDIT_SITE_PICKER);
      await typeDate(page, `${ID}calFromDate_dateInput`, EMPTY_DATE);
      await page.locator(`#${ID}btnApply`).click();
      await expect(page.locator('body')).toContainText('There are no reconciled sessions to deposit.');
      await expect(page.locator('[id*="gridBills"][id$="txtCount"]').first()).toBeDisabled();
      await expect(page.locator(`${TOTALS}txtDepositActualTotal`)).toHaveValue('$0.00');
    });

    await test.step('Cancel goes back to the list', async () => {
      await page.locator(`#${ID}btnCancelAdd, #${ID}btnCancel`).locator('visible=true').first().click();
      await expect(page).toHaveURL(/DepositSlip\.aspx/);
      await expectPageTitle(page, 'Deposit Slip');
    });
  });

  test('Deposit Slip: reconcile the day, deposit it with a check, and find the slip everywhere', async ({ page }) => {
    test.skip(LOCAL_ONLY, LOCAL_ONLY_REASON);
    test.setTimeout(30 * 60_000);

    await test.step('a manual sale that day, so there is something to deposit', async () => {
      await startSale(page, { siteCode: TEST_SITE_CODE, date: DEPOSIT_DATE, mealType: 'Lunch', menuItem: 'Lunch Meal' });
      await setMealCount(page, 'Paid', 1);
      const paid = (await summaryLines(page)).find((l) => l.personType === 'Paid')!;
      await closeSummarySale(page, cents(paid.total) / 100);
    });

    await test.step('Add is refused while a session that day is not reconciled', async () => {
      await openAdd(page);
      await expect(page.locator('body')).toContainText('There are some sessions which are not reconciled. Please reconcile all the sessions before adding a Deposit Slip.');
      await expect(page.locator(`#${ID}btnSave`)).toHaveCount(0);
    });

    await test.step('reconcile every session that day', async () => {
      await reconcileDay(page);
    });

    const outstanding = await test.step('what is left to deposit: reconciled takings less earlier slips', async () => {
      await filterDay(page, TEST_SITE_CODE, TEST_SITE_NAME, DEPOSIT_DATE, ['Reconciled', 'Deposited']);
      const sessions = await allGridRows(page, `#${SESSIONS_GRID}`);
      const taken = sessions.reduce((sum, s) => sum + cents(s['Closing Balance']), 0);
      const deposited = (await slipsBetween(page, DEPOSIT_DATE, DEPOSIT_DATE)).reduce((sum, s) => sum + cents(s['Deposit Amount']), 0);
      expect(taken - deposited, 'something left to deposit').toBeGreaterThan(100);
      return taken - deposited;
    });

    await test.step('Add: the day locks and the actual total is what is left to deposit', async () => {
      await openAdd(page);
      for (const id of [`${EDIT_SITE_PICKER.code}_Input`, `${ID}calFromDate_dateInput`, `${ID}btnApply`]) {
        await expect(page.locator(`#${id}`), `${id} locked`).toBeDisabled();
      }
      await expect(page.locator(`${TOTALS}txtDepositActualTotal`)).toHaveValue(money(outstanding));
      await expect(page.locator(`#${ID}ReportCaller1_rptRetriever`), 'nothing to print before saving').toBeDisabled();
    });

    await test.step('every coin and bill counts at face value', async () => {
      for (const [denomination, face] of Object.entries(FACE)) {
        await setCount(page, denomination, 1);
        await expect(page.locator(`${TOTALS}txtTotalCash`), denomination).toHaveValue(money(face));
        await setCount(page, denomination, 0);
      }
    });

    await test.step('Reset clears the counts and starts over on the user’s own site and today', async () => {
      await setCount(page, 'Ones', 3);
      await page.locator(`#${ID}btnReset`).click();
      await postbackIdle(page);
      await expect(page.locator(`#${ID}btnApply`)).toBeEnabled();
      await expect(page.locator(`${TOTALS}txtTotalCash`)).toHaveValue('$0.00');
      await expect(page.locator(`#${ID}calFromDate_dateInput`)).toHaveValue(TODAY);
      await expect(page.locator(`#${EDIT_SITE_PICKER.code}_Input`)).not.toHaveValue(TEST_SITE_CODE);
      await pickDay(page);
      await expect(page.locator(`${TOTALS}txtDepositActualTotal`)).toHaveValue(money(outstanding));
    });

    const checkNumber = String(Date.now()).slice(-8);
    await test.step('Add New Check adds to the checks total', async () => {
      await page.locator(`a[id^="${ID}UCDenomination_gridChecks"][id$="InitInsertButton"]`).click();
      const checks = (suffix: string) => page.locator(`[id^="${ID}UCDenomination_gridChecks"][id$="${suffix}"]`);
      await checks('TB_Description').fill(checkNumber);
      await checks('RNTB_Amount').click();
      await checks('RNTB_Amount').pressSequentially('1.00');
      await checks('PerformInsertButton').click();
      await expect(page.locator(`${TOTALS}gridChecks`)).toContainText(checkNumber);
      await expect(page.locator(`${TOTALS}txtTotalChecks`)).toHaveValue('$1.00');
    });

    const slip = await test.step('a dollar short needs a comment; balanced, it saves', async () => {
      const cash = outstanding - 100;
      await setCount(page, 'Ones', Math.floor(cash / 100) - 1);
      await setCount(page, 'Pennies', cash % 100);
      await expect(page.locator(`${TOTALS}txtDepositTotalClosing`)).toHaveValue(money(outstanding - 100));
      await page.locator(`#${ID}btnSave`).click();
      await expect(page.getByText('Please Enter Comments').first()).toBeVisible();

      await setCount(page, 'Ones', Math.floor(cash / 100));
      await expect(page.locator(`${TOTALS}txtTotalCash`)).toHaveValue(money(cash));
      await expect(page.locator(`${TOTALS}txtDepositTotalClosing`), 'deposit total').toHaveValue(money(outstanding));
      const comment = nextTestName([]);
      await page.locator(`${TOTALS}txtComments`).fill(comment);
      await page.locator(`#${ID}btnSave`).click();
      const saved = page.getByText(/Deposit Slip #\d+ has been saved successfully\./).first();
      await expect(saved).toBeVisible();
      const number = (await saved.innerText()).match(/#(\d+)/)![1];
      await expect(page.locator(`#${ID}ReportCaller1_rptRetriever`)).toBeEnabled();
      await expect(page.locator(`${TOTALS}txtCommentHistory`)).toHaveValue(new RegExp(comment));
      return { number, amount: money(outstanding), comment };
    });

    await test.step('Print shows the slip', async () => {
      const popup = page.context().waitForEvent('page');
      await page.locator(`#${ID}ReportCaller1_rptRetriever`).click();
      const report = await popup;
      const text = async () => (await report.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
      await expect.poll(text, { message: 'deposit slip report', timeout: 60_000 }).toContain(slip.number);
      expect(await text()).toContain(slip.amount.replace('$', ''));
      await report.close();
    });

    await test.step('the list finds it by number and by date', async () => {
      await openPosPage(page, PATH);
      await page.locator(`#${ID}radDepositSlipNo`).check();
      await page.locator(`#${ID}depositSlipNo`).fill(slip.number);
      await pickSiteCode(page, TEST_SITE_CODE);
      await redraw(page, LIST, () => page.locator(`#${ID}btnApply`).click());
      const [row] = await gridRows(page, LIST);
      expect(row).toMatchObject({ 'Deposit Slip No.': slip.number, Site: TEST_SITE_NAME, 'Deposit Amount': slip.amount });
      expect(Date.parse(row['Deposit Date'])).toBe(Date.parse(DEPOSIT_DATE));
      expect(row['Deposited By']).not.toBe('');
      expect((await slipsBetween(page, DEPOSIT_DATE, DEPOSIT_DATE)).map((s) => s['Deposit Slip No.'])).toContain(slip.number);
    });

    await test.step('the saved slip keeps its check, counts and comment, and takes another comment', async () => {
      await openSlip(page, slip.number);
      await expect(page.locator(`${TOTALS}txtDepositTotalClosing`)).toHaveValue(slip.amount);
      await expect(page.locator(`${TOTALS}txtTotalChecks`)).toHaveValue('$1.00');
      await expect(page.locator(`${TOTALS}gridChecks`)).toContainText(checkNumber);
      await expect(page.locator(`${TOTALS}txtCommentHistory`)).toHaveValue(new RegExp(slip.comment));
      const second = nextTestName([slip.comment]);
      await page.locator(`${TOTALS}txtComments`).fill(second);
      await page.locator(`#${ID}btnSave`).click();
      await postbackIdle(page);
      await openSlip(page, slip.number);
      await expect(page.locator(`${TOTALS}txtCommentHistory`)).toHaveValue(new RegExp(`${slip.comment}[\\s\\S]*${second}|${second}[\\s\\S]*${slip.comment}`));
      await expect(page.locator(`${TOTALS}txtDepositTotalClosing`)).toHaveValue(slip.amount);
    });

    await test.step('the day’s sessions are now Deposited, with nothing left over', async () => {
      await filterDay(page, TEST_SITE_CODE, TEST_SITE_NAME, DEPOSIT_DATE, ['Reconciled', 'Deposited']);
      for (const s of await allGridRows(page, `#${SESSIONS_GRID}`)) expect(s['Status'], `${s['Opening Date']} ${s['Closing Balance']}`).toBe('Deposited');
      await openAdd(page);
      await expect(page.locator(`${TOTALS}txtDepositActualTotal`)).toHaveValue('$0.00');
      await page.locator(`#${ID}btnCancel`).click();
    });
  });

  test.fixme('Deposit Slip: an edited slip is listed once, at its amount', async ({ page }) => {
    const slips = await slipsBetween(page, DEPOSIT_DATE, DEPOSIT_DATE);
    const edited = slips.filter((s) => s['Modified Date'] !== '--');
    expect(edited.length, 'an edited slip on the deposit day').toBeGreaterThan(0);
    const numbers = edited.map((s) => s['Deposit Slip No.']);
    expect(new Set(numbers).size, `each edited slip once: ${numbers.join(', ')}`).toBe(numbers.length);
    for (const s of edited) expect(cents(s['Deposit Amount']), s['Deposit Slip No.']).toBeGreaterThan(0);
  });

  test.fixme('Deposit Slip: slip numbers sort as numbers', async ({ page }) => {
    await slipsBetween(page, YEAR_START, TODAY);
    await expectSorts(page, LIST, 'Deposit Slip No.', 'number');
  });

  test.fixme('Deposit Slip: Active and InActive each narrow the list', async ({ page }) => {
    const both = (await slipsBetween(page, YEAR_START, TODAY)).length;
    await page.locator(`#${ID}chkbInActive`).uncheck();
    await redraw(page, LIST, () => page.locator(`#${ID}btnApply`).click());
    const active = (await gridRows(page, LIST)).length;
    await page.locator(`#${ID}chkbActive`).uncheck();
    await redraw(page, LIST, () => page.locator(`#${ID}btnApply`).click());
    await expect(page.locator(LIST), 'neither status ticked lists nothing').toContainText('No records to display.');
    await page.locator(`#${ID}chkbInActive`).check();
    await redraw(page, LIST, () => page.locator(`#${ID}btnApply`).click());
    const inactive = (await gridRows(page, LIST)).length;
    expect(active + inactive).toBe(both);
  });
});

/** Find a slip by number on a fresh list and open it. */
async function openSlip(page: Page, number: string): Promise<void> {
  await openPosPage(page, PATH);
  await pickSiteCode(page, TEST_SITE_CODE);
  await page.locator(`#${ID}radDepositSlipNo`).check();
  await page.locator(`#${ID}depositSlipNo`).fill(number);
  await redraw(page, LIST, () => page.locator(`#${ID}btnApply`).click());
  await page.locator(LIST).getByRole('link', { name: number, exact: true }).first().click();
  await expect(page.locator('body')).toContainText(new RegExp(`Deposit Slip Number:\\s*${number}\\b`));
}

/** Slips at the test site dated between two days, from a fresh list. */
async function slipsBetween(page: Page, from: string, to: string): Promise<Record<string, string>[]> {
  await openPosPage(page, PATH);
  await pickSiteCode(page, TEST_SITE_CODE);
  await typeDate(page, `${ID}calFromDate_dateInput`, from);
  await typeDate(page, `${ID}calToDate_dateInput`, to);
  await redraw(page, LIST, () => page.locator(`#${ID}btnApply`).click());
  return allGridRows(page, LIST);
}

/** Add Deposit Slip for the test site on the deposit day, then Apply. */
async function openAdd(page: Page): Promise<void> {
  await openPosPage(page, PATH);
  await page.locator(`#${ID}btnAdd`).click();
  await expect(page).toHaveURL(/DepositSlipInfo\.aspx\?isAddNew=true/);
  await pickDay(page);
}

/** On Add Deposit Slip: the test site and the deposit day, then Apply. */
async function pickDay(page: Page): Promise<void> {
  await pickSiteCode(page, TEST_SITE_CODE, EDIT_SITE_PICKER);
  await typeDate(page, `${ID}calFromDate_dateInput`, DEPOSIT_DATE);
  await page.locator(`#${ID}btnApply`).click();
  await page.waitForLoadState('networkidle');
}

function countBox(page: Page, denomination: string) {
  const row = page.locator('tr', { has: page.locator('input[id$="txtCount"]') }).filter({ hasText: new RegExp(`^\\s*${denomination}\\b`) });
  return row.locator('input[id$="txtCount"]');
}

async function setCount(page: Page, denomination: string, count: number): Promise<void> {
  const box = countBox(page, denomination);
  await box.click();
  await box.press('Control+A');
  await box.pressSequentially(String(count));
  await box.press('Tab');
  // Big counts come back with a thousands comma: "1,091".
  await expect(box).toHaveValue(count.toLocaleString('en-US'));
  await postbackIdle(page);
}

/** The cash the denomination counts add up to, in cents. */
async function countedCash(page: Page): Promise<number> {
  let total = 0;
  for (const [denomination, face] of Object.entries(FACE)) total += Number((await countBox(page, denomination).inputValue()).replace(/,/g, '')) * face;
  return total;
}

/** Reconcile each Closed session that day, adjusting any that don't balance. */
async function reconcileDay(page: Page): Promise<void> {
  for (let i = 0; i < 60; i++) {
    await filterDay(page, TEST_SITE_CODE, TEST_SITE_NAME, DEPOSIT_DATE);
    const index = (await sessionRows(page)).findIndex((s) => s.status === 'Closed');
    if (index < 0) return;
    await page.locator(`#${SESSIONS_GRID} > tbody > tr`).nth(index).locator('a[title^="Reconcile"]').click();
    await expect(page).toHaveTitle(/Reconciliation Info/i);
    const reconcile = page.locator(`#${ID}btnOk`);
    if (await reconcile.isDisabled()) {
      await page.locator(`#${ID}btnAdjustDifference`).click();
      const adjust = await dialogFrame(page, /MakeAdjustment\.aspx/i);
      await adjust.locator(`#${ID}txtComments`).fill(nextTestName([]));
      await adjust.locator(`#${ID}btnOk`).click();
      await expectNoDialog(page);
      await expect(reconcile).toBeEnabled();
    }
    await reconcile.click();
    await expect(page.locator(`#${ID}lblMessageBox`)).toContainText('This session is reconciled.');
  }
  throw new Error(`More than 60 sessions to reconcile on ${DEPOSIT_DATE}`);
}
