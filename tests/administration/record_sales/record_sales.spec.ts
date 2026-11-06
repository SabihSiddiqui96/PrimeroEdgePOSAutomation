import { test, expect, Page } from '@playwright/test';
import {
  addPatron,
  closeSummarySale,
  countOnes,
  DETAILED_GRID,
  EDIT_SALES_GRID,
  OTHER_SALES_GRID,
  pickEntryMethod,
  QUICK,
  quickRows,
  unfedPatrons,
  RECORD_SALES_PATH,
  setMealCount,
  showEditSales,
  startSale,
  summaryLines,
} from '../../../utils/manualSale';
import { TEST_SITE_CODE, TEST_SITE_NAME, usDate, LOCAL_ONLY, LOCAL_ONLY_REASON } from '../../../utils/testData';
import { allGridRows, cents, expectPaging, expectSorts, money, pickSiteCode, postbackIdle, redraw } from '../../../utils/webforms';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectGridColumns,
  expectHasOptions,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Administration > Record Sales (/POS/ManualSaleBulkEntry.aspx)
const ID = 'ctl00_UserContentArea_';
const MEAL_TYPE = 'Lunch';
const MENU_ITEM = 'Lunch Meal';
const PAID_MEALS = 2;
// Sales can't be deleted, so they all go on the first day of the year instead of today.
const SALE_DATE = usDate(new Date(new Date().getFullYear(), 0, 1));
const SALE = { siteCode: TEST_SITE_CODE, date: SALE_DATE, mealType: MEAL_TYPE, menuItem: MENU_ITEM };
const CANCEL_PROMPT = 'Are you sure you want to cancel Sale?';
const BALANCE_PATRON = process.env.BALANCE_PATRON_ID?.trim() || '18884';

test.describe('POS - Administration - Record Sales', () => {
  test.skip(LOCAL_ONLY, LOCAL_ONLY_REASON);

  test('Record Sales: every entry method through to Edit Sales', async ({ page }) => {
    test.setTimeout(20 * 60_000);
    await openPosPage(page, RECORD_SALES_PATH);
    await expect(page).toHaveTitle(/Record Sales/i);
    await expectPageTitle(page, 'Record Sales');

    await test.step('session filters, meal menu, entry methods and actions', async () => {
      await expectCaptions(page, ['Site Code', 'Site', 'Terminal', 'Session Date', 'Meal Type', 'Meal Menu', 'Meal', 'A La Carte']);
      await expectCaptions(page, ['Entry Method', 'Summary', 'Quick', 'Meals Only', 'Detailed']);
      await expectFilled(page, [`${ID}ucAreaSiteSelector_rcbSiteCode_Input`, `${ID}ucAreaSiteSelector_rcbSite_Input`, `${ID}calSessionDate_dateInput`]);
      await expectHasOptions(page, `${ID}ddlTerminal`);
      await expect(page.locator(`#${ID}ddlMealType option`)).toContainText(['-- SELECT --', 'Breakfast', 'Lunch']);
      await expect(page.locator(`#${ID}ddlMealType option:checked`)).toHaveText('-- SELECT --');
      for (const radio of ['rbMealItem_0', 'rbMealItem_1', 'rbEntryType_0', 'rbEntryType_1', 'rbEntryType_2', 'rbEntryType_3']) {
        await expect(page.locator(`#${ID}${radio}`), `${radio} waits for a site`).not.toBeChecked();
      }
      await expectVisible(page, [`${ID}ddlMenuItem_Input`, `${ID}rbEntryType_1`, `${ID}rbEntryType_2`, `${ID}rbEntryType_3`]);
      await expectButtons(page, [
        [`${ID}btnApply`, 'Apply'],
        [`${ID}btnBulkSales`, 'Multiple Meals'],
      ]);
    });

    await test.step('picking a site loads its terminals and defaults to its manual terminal and today', async () => {
      await pickSiteCode(page, TEST_SITE_CODE);
      await expect(page.locator(`#${ID}ucAreaSiteSelector_rcbSite_Input`)).toHaveValue(new RegExp(`^${TEST_SITE_NAME}$`, 'i'));
      await expect(page.locator(`#${ID}ddlTerminal option:checked`)).toHaveText(new RegExp(`^SITE_\\d+_${TEST_SITE_CODE}$`));
      const terminals = await page.locator(`#${ID}ddlTerminal option`).allInnerTexts();
      expect(terminals.filter((t) => t.trim().endsWith(`-${TEST_SITE_CODE}`) || t.trim().endsWith(`_${TEST_SITE_CODE}`)).length, 'the site’s terminals').toBeGreaterThan(1);
      await expect(page.locator(`#${ID}calSessionDate_dateInput`)).toHaveValue(usDate(new Date()));
      await expect(page.locator(`#${ID}rbMealItem_0`), 'Meal by default').toBeChecked();
      await expect(page.locator(`#${ID}rbEntryType_0`), 'no entry method yet').not.toBeChecked();
    });

    await test.step('Apply needs a meal type, then a menu item', async () => {
      await page.locator(`#${ID}btnApply`).click();
      await expect(page.locator('#ctl00_page_content')).toContainText(/Please select a Meal Type/i);
      await page.locator(`#${ID}ddlMealType`).selectOption({ label: MEAL_TYPE });
      await expect(page.locator(`#${ID}ddlMenuItem_Input`)).toHaveValue('-- SELECT --');
      await page.locator(`#${ID}btnApply`).click();
      await expect(page.locator('#ctl00_page_content')).toContainText('Please select a Meal Menu Item.');
    });

    await test.step('Meal and A La Carte offer different items', async () => {
      const meals = await menuItems(page);
      expect(meals).toContain(MENU_ITEM);
      await page.locator(`#${ID}rbMealItem_1`).check();
      await expect(page.locator(`#${ID}ddlMenuItem_Input`)).toHaveValue('-- SELECT --');
      const alaCarte = await menuItems(page);
      expect(alaCarte.length, 'a la carte items').toBeGreaterThan(0);
      expect(alaCarte).not.toContain(MENU_ITEM);
      await page.locator(`#${ID}rbMealItem_0`).check();
      await expect(page.locator(`#${ID}ddlMenuItem_Input`)).toHaveValue('-- SELECT --');
    });

    await test.step('Enrollment Status shows for every method but Summary; Detailed adds Special Roster and Homeroom', async () => {
      const enrollment = page.locator(`#${ID}rbEnrollmentStatus_0`);
      const roster = page.locator(`#${ID}ddlSpecialRoster`);
      for (const entry of ['Quick', 'Meals Only', 'Detailed', 'Summary'] as const) {
        await pickEntryMethod(page, entry);
        if (entry === 'Summary') await expect(enrollment, entry).toBeHidden();
        else {
          await expect(enrollment, entry).toBeVisible();
          await expect(page.locator(`#${ID}rbEnrollmentStatus_1`), `${entry}: Actives only by default`).toBeChecked();
        }
        if (entry === 'Detailed') {
          await expect(roster).toBeVisible();
          await expect(page.locator(`#${ID}ddlHomeRoom_Input`)).toBeVisible();
          await expect(roster.locator('option:checked')).toHaveText('-- SELECT --');
        } else await expect(roster, entry).toBeHidden();
      }
    });

    const editSales = await test.step('the sales already on the sale date', async () => {
      await showEditSales(page, TEST_SITE_CODE, SALE_DATE);
      return { summary: await countOf(page, 'Summary'), detail: await countOf(page, 'Detail') };
    });

    const total = await test.step('Summary step 1: counts per person type, and the totals follow', async () => {
      await startSale(page, SALE, 'Summary');
      await expect(page.locator('#ctl00_page_content')).toContainText(`Step 1 - Enter ${MEAL_TYPE} Summary`);
      await expect(page.locator('#ctl00_page_content')).toContainText('Step 2 - Close Session');
      await expect(page.locator('#ctl00_page_content')).toContainText('Step 3 - Confirmation');
      await expect(page.locator(`#${ID}ddlMealType`), 'the setup locks once applied').toBeDisabled();
      const lines = await summaryLines(page);
      expect(lines.map((l) => l.personType)).toEqual(expect.arrayContaining(['Free', 'Reduced', 'Paid']));
      for (const line of lines) expect(line, line.personType).toMatchObject({ count: '0', total: '$0.00' });

      await setMealCount(page, 'Paid', PAID_MEALS);
      const paid = (await summaryLines(page)).find((l) => l.personType === 'Paid')!;
      expect(cents(paid.total), 'count x price + tax').toBe(PAID_MEALS * cents(paid.price) + cents(paid.tax));
      return cents(paid.total);
    });

    await test.step('Summary step 2: count the cash and save', async () => {
      const cash = await closeSummarySale(page, total / 100);
      expect(cash).toBe(money(total));
    });

    await test.step('Summary step 3: Print Close Session opens the session report', async () => {
      await expect(page.locator('#ctl00_page_content')).toContainText('Click to View Session');
      await expectButtons(page, [
        [`${ID}btnNewSales`, 'Record New Sales'],
        [`${ID}ReportCaller1_rptRetriever`, 'Print Close Session'],
      ]);
      await expectReport(page, `${ID}ReportCaller1_rptRetriever`);
    });

    await test.step('Summary step 3: Click to View Session opens that session, closed at the counted cash', async () => {
      // The session page can take well over the click's own wait to load on QA.
      await Promise.all([page.waitForURL(/ReconciliationInfo\.aspx/, { timeout: 90_000 }), page.getByText('Click to View Session').click({ noWaitAfter: true })]);
      await expect(page.locator(`#${ID}lblTerminal`)).toHaveText(new RegExp(`_${TEST_SITE_CODE}$`));
      await expect(page.locator(`#${ID}lblOpeningDateTime`)).toHaveText(new RegExp(`^${SALE_DATE} `));
      await expect(page.locator(`#${ID}lblClosingBalance`)).toHaveText(money(total));
    });

    await test.step('Edit Sales lists one more Summary sale on that day', async () => {
      const sales = await showEditSales(page, TEST_SITE_CODE, SALE_DATE);
      expect(await countOf(page, 'Summary')).toBe(editSales.summary + 1);
      for (const sale of sales) {
        expect(Date.parse(sale['Date'])).toBe(Date.parse(SALE_DATE));
        expect(sale).toMatchObject({ Site: TEST_SITE_NAME, 'Meal Type': MEAL_TYPE, 'Menu Item': MENU_ITEM });
      }
    });

    await test.step('Summary: Cancel on step 1 drops the sale and unlocks the setup', async () => {
      await startSale(page, SALE, 'Summary');
      await setMealCount(page, 'Paid', 1);
      expect(await confirmed(page, `#${ID}btnCancelSSStep1`)).toBe(CANCEL_PROMPT);
      await expect(page.locator(`#${ID}gridSummarySale_ctl00`)).toBeHidden();
      await expect(page.locator(`#${ID}ddlMealType`)).toBeEnabled();
    });

    const candidates = await test.step('patrons still to eat on the sale date', async () => {
      await startSale(page, SALE, 'Detailed');
      await page.locator(`${DETAILED_GRID} [id$="PageSizeComboBox_Arrow"]`).click();
      await redraw(page, DETAILED_GRID, () => page.locator('.rcbSlide li').locator('visible=true').filter({ hasText: /^\d+$/ }).last().click());
      const fresh = (await unfedPatrons(page)).filter((id) => id !== BALANCE_PATRON);
      expect(fresh.length, 'patrons still to eat on the sale date').toBeGreaterThanOrEqual(3);
      return fresh;
    });
    const used: string[] = [];

    const quick = await test.step('Quick step 1: a patron id fills the row and adds the next one', async () => {
      await startSale(page, SALE, 'Quick');
      await expect(page.locator('#ctl00_page_content')).toContainText(`${MEAL_TYPE} Sales - Quick`);
      for (const step of [`Step 1 - Enter ${MEAL_TYPE} Details`, `Step 2 - Enter Other ${MEAL_TYPE} Sales`, 'Step 3 - Close Session', 'Step 4 - Confirmation']) {
        await expect(page.locator('#ctl00_page_content')).toContainText(step);
      }
      await expect(page.locator(`#${ID}btnNextDSStep1`), 'Next waits for a recorded sale').toBeDisabled();
      await page.locator(`${QUICK}btnSubmitSales`).click();
      await postbackIdle(page);
      await expect(page.locator(`#${ID}btnNextDSStep1`), 'recording an empty row does nothing').toBeDisabled();

      const patron = await addUnfedPatron(page, 'Quick', candidates, used);
      await expect(page.locator('#ctl00_page_content')).toContainText('Total Entries: 1');
      await page.locator(`${QUICK}cboxHadMeal`).check();
      await expect(page.locator(`${QUICK}cboxHadMeal`)).toBeChecked();
      return { ...patron, id: used[used.length - 1] };
    });

    await test.step('Quick step 1: the payment method decides which number box opens', async () => {
      await page.locator(`${QUICK}rbtnCheck`).check();
      await expect(page.locator(`${QUICK}txtCheckNumber`)).toBeEnabled();
      await page.locator(`${QUICK}rbtnCredit`).check();
      await expect(page.locator(`${QUICK}txtCardNumber`)).toBeEnabled();
      await page.locator(`${QUICK}rbtnCash`).check();
      await page.locator(`${QUICK}txtAlaCarte`).fill('1.00');
      await page.locator(`${QUICK}txtPaymentAmount`).fill('10');
    });

    await test.step('Quick step 1: Record Sales locks the row and opens Next', async () => {
      await page.locator(`${QUICK}btnSubmitSales`).click();
      await expect(page.locator(`#${ID}btnNextDSStep1`)).toBeEnabled();
      await expect(page.locator(`${QUICK}btnSubmitSales`)).toBeDisabled();
      await expect(page.locator(`${QUICK}btnQuickCancel`)).toBeDisabled();
      await expect(page.locator(`${QUICK}cboxHadMeal`)).toBeDisabled();
      await expect(page.locator(`${QUICK}txtPaymentAmount`)).toHaveValue('10.00');
    });

    await test.step('Quick step 2: other sales by person type, totals follow the count', async () => {
      await page.locator(`#${ID}btnNextDSStep1`).click();
      await expect(page.locator('#ctl00_page_content')).toContainText(`Other ${MEAL_TYPE} Sales`);
      const lines = await summaryLines(page, OTHER_SALES_GRID);
      expect(lines.map((l) => l.personType)).toEqual(expect.arrayContaining(['Staff', 'Visitor']));
      for (const line of lines) expect(line, line.personType).toMatchObject({ count: '0', total: '$0.00' });
      await setMealCount(page, 'Staff', 1, OTHER_SALES_GRID);
      const staff = (await summaryLines(page, OTHER_SALES_GRID)).find((l) => l.personType === 'Staff')!;
      expect(cents(staff.total), 'price + tax').toBe(cents(staff.price) + cents(staff.tax));
    });

    await test.step('Quick step 3: close the session, and step 4 confirms', async () => {
      await page.locator(`#${ID}btnNextDSStep2`).click();
      await expect(page.locator('#ctl00_page_content')).toContainText('* Credit card amount is not included in Total');
      expect(await countOnes(page, 10)).toBe('$10.00');
      await page.locator(`#${ID}btnSaveDSStep3`).click();
      await expect(page.getByText('Quick Sale Entry Completed Successfully!')).toBeVisible();
      await expectButtons(page, [
        [`${ID}btnNewSalest`, 'Record New Sales'],
        [`${ID}ReportCaller2_rptRetriever`, 'Print Close Session'],
      ]);
      await expectReport(page, `${ID}ReportCaller2_rptRetriever`);
    });

    await test.step('Record New Sales starts over with the setup unlocked', async () => {
      await page.locator(`#${ID}btnNewSalest`).click();
      await expect(page.locator(`#${ID}ddlMealType`)).toBeEnabled();
      await expect(page.getByText('Quick Sale Entry Completed Successfully!')).toBeHidden();
    });

    await test.step('Meals Only: a patron, no payment columns, and save', async () => {
      await addUnfedPatron(page, 'Meals Only', candidates, used);
      await expect(page.locator('#ctl00_page_content')).toContainText(`${MEAL_TYPE} Sales - Meals Only`);
      await expect(page.locator(`${QUICK}txtPaymentAmount`)).toHaveCount(0);
      await expect(page.locator(`${QUICK}txtAlaCarte`)).toHaveCount(0);
      await page.locator(`${QUICK}btnSubmitSales`).click();
      await expect(page.locator(`#${ID}btnNextDSStep1`)).toBeEnabled();
      await page.locator(`#${ID}btnNextDSStep1`).click();
      await page.locator(`#${ID}btnNextDSStep2`).click();
      await page.locator(`#${ID}btnSaveDSStep3`).click();
      await expect(page.getByText(/Sale Entry Completed Successfully!/).locator('visible=true')).toBeVisible();
    });

    const detailedPatron = candidates.find((id) => !used.includes(id))!;
    await test.step('Detailed: the patron grid sorts and pages', async () => {
      await startSale(page, SALE, 'Detailed');
      await expect(page.locator('#ctl00_page_content')).toContainText(`${MEAL_TYPE} Sales - Detailed`);
      await expectGridColumns(page, DETAILED_GRID.slice(1), ['ID / PIN', 'Name', 'Grade', 'Homeroom', 'Balance', 'Had Meal', 'A La Carte', 'Payment', 'Check #', 'Card #']);
      await expectButtons(page, [[`${ID}btnLookup`, 'Look Up ...']]);
      await expectPaging(page, DETAILED_GRID);
      await expectSorts(page, DETAILED_GRID, 'Name');
      await expectSorts(page, DETAILED_GRID, 'Balance', 'money');
    });

    await test.step('Detailed: a ticked meal survives Next and Previous', async () => {
      await redraw(page, DETAILED_GRID, () => page.locator(`${DETAILED_GRID} > thead`).getByRole('link', { name: 'ID / PIN', exact: true }).click());
      const row = await patronRow(page, detailedPatron);
      await row.locator('input[id$="chkHadMeal"]').check();
      await postbackIdle(page);
      await page.locator(`#${ID}btnNextDSStep1`).click();
      await expect(page.locator(OTHER_SALES_GRID)).toBeVisible();
      await expectButtons(page, [
        [`${ID}btnCancelDSStep2`, 'Cancel'],
        [`${ID}btnPrevDSStep2`, '« Previous'],
        [`${ID}btnNextDSStep2`, 'Next »'],
      ]);
      await page.locator(`#${ID}btnPrevDSStep2`).click();
      await expect((await patronRow(page, detailedPatron)).locator('input[id$="chkHadMeal"]')).toBeChecked();
    });

    await test.step('Detailed: save the one meal', async () => {
      await page.locator(`#${ID}btnNextDSStep1`).click();
      await page.locator(`#${ID}btnNextDSStep2`).click();
      await page.locator(`#${ID}btnSaveDSStep3`).click();
      await expect(page.getByText(/Sale Entry Completed Successfully!/).locator('visible=true')).toBeVisible();
    });

    await test.step('Edit Sales lists the Quick, Meals Only and Detailed sales as Detail entries', async () => {
      await showEditSales(page, TEST_SITE_CODE, SALE_DATE);
      expect(await countOf(page, 'Detail')).toBe(editSales.detail + 3);
      expect(await countOf(page, 'Summary')).toBe(editSales.summary + 1);
    });

    await test.step('a patron who has eaten can’t have the meal again, and shows the new balance', async () => {
      await startSale(page, SALE, 'Meals Only');
      const again = await addPatron(page, quick.id);
      await expect(page.locator('#ctl00_page_content')).toContainText(`Student ${quick.id} has already had a meal`);
      expect(again.balance, 'balance changed after the sale').not.toBe(quick.balance);
      expect(await confirmed(page, `${QUICK}btnQuickCancel`)).toBe(CANCEL_PROMPT);
      await expect.poll(async () => (await quickRows(page)).length).toBe(0);
    });

    await test.step('Multiple Meals opens its own page for the district', async () => {
      await openPosPage(page, RECORD_SALES_PATH);
      await page.locator(`#${ID}btnBulkSales`).click();
      await expect(page).toHaveURL(/\/MultipleMeals\//);
      // The Angular app signs in through a token redirect before it draws anything.
      await expect(page.getByText('Multiple Meals', { exact: true })).toBeVisible({ timeout: 60_000 });
      await expect(page.getByText('Service Context')).toBeVisible();
      await expect(page.locator('mat-select')).toBeVisible();
      await expect(page.getByPlaceholder('Start date'), 'dates wait for a site').toBeDisabled();
      await expect(page.getByRole('button', { name: 'Serve' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeDisabled();
      await expect(page.getByText('Show Weekends')).toBeVisible();
      await page.getByRole('button', { name: 'Dashboard' }).click();
      await expect(page).not.toHaveURL(/\/MultipleMeals\//);
    });
  });

  test.fixme('Quick: the balance rises by the payment less what was bought', async ({ page }) => {
    test.setTimeout(6 * 60_000);
    await startSale(page, SALE, 'Quick');
    const before = await addPatron(page, BALANCE_PATRON);
    await page.locator(`${QUICK}txtAlaCarte`).fill('1.00');
    await page.locator(`${QUICK}rbtnCash`).check();
    await page.locator(`${QUICK}txtPaymentAmount`).fill('10');
    await page.locator(`${QUICK}btnSubmitSales`).click();
    await page.locator(`#${ID}btnNextDSStep1`).click();
    await page.locator(`#${ID}btnNextDSStep2`).click();
    await countOnes(page, 10);
    await page.locator(`#${ID}btnSaveDSStep3`).click();
    await expect(page.getByText('Quick Sale Entry Completed Successfully!')).toBeVisible();
    await startSale(page, SALE, 'Meals Only');
    const after = await addPatron(page, BALANCE_PATRON);
    expect(cents(after.balance) - cents(before.balance), 'never more than the $10 paid less the $1 a la carte').toBeLessThanOrEqual(900);
  });

  test.fixme('Multiple Meals: the Serving Site list offers the district’s sites', async ({ page }) => {
    await openPosPage(page, RECORD_SALES_PATH);
    await page.locator(`#${ID}btnBulkSales`).click();
    await page.locator('.mat-select-arrow').click();
    await expect(page.locator('mat-option').first()).toBeVisible();
  });
});

/** Click a button that asks to confirm, say OK, and return what it asked. */
async function confirmed(page: Page, selector: string): Promise<string> {
  const asked = new Promise<string>((resolve) => page.once('dialog', (d) => { resolve(d.message()); void d.accept(); }));
  await page.locator(selector).click();
  return asked;
}

async function menuItems(page: Page): Promise<string[]> {
  await page.locator(`#${ID}ddlMenuItem_Arrow`).click();
  const items = (await page.locator(`#${ID}ddlMenuItem_DropDown li`).allInnerTexts()).map((t) => t.trim()).filter((t) => !/^--/.test(t));
  await page.locator(`#${ID}ddlMenuItem_Arrow`).click();
  return items;
}

/** Start a Quick or Meals Only sale and add the first candidate who hasn't eaten yet. */
async function addUnfedPatron(page: Page, entry: 'Quick' | 'Meals Only', candidates: string[], used: string[]) {
  for (const id of candidates.filter((c) => !used.includes(c))) {
    used.push(id);
    if (entry === 'Meals Only' || used.length > 1) await startSale(page, SALE, entry);
    const patron = await addPatron(page, id);
    // The Detailed grid doesn't always mark a meal recorded through Quick.
    if (await page.getByText(`Student ${id} has already had a meal`).isVisible()) continue;
    expect(patron.name, `patron ${id}`).not.toBe('');
    return patron;
  }
  throw new Error(`every candidate patron has already had ${MEAL_TYPE} on ${SALE_DATE}`);
}

/** The Detailed grid row for one patron, paging forward until it shows. */
async function patronRow(page: Page, patronId: string) {
  const row = page.locator(`${DETAILED_GRID} > tbody > tr`).filter({ has: page.locator('td').first().getByText(patronId, { exact: true }) });
  for (let pages = 0; !(await row.count()); pages++) {
    expect(pages, `patron ${patronId} in the grid`).toBeLessThan(30);
    await redraw(page, DETAILED_GRID, () => page.locator(`${DETAILED_GRID} .rgPageNext`).first().click());
  }
  return row;
}

/** Sales of one entry type in the Edit Sales list, across every page. */
async function countOf(page: Page, entryType: string): Promise<number> {
  return (await allGridRows(page, EDIT_SALES_GRID)).filter((r) => r['Entry Type'] === entryType).length;
}

/** A report button opens a window with the report in it. */
async function expectReport(page: Page, buttonId: string): Promise<void> {
  const popup = page.context().waitForEvent('page');
  await page.locator(`#${buttonId}`).click();
  const report = await popup;
  await expect.poll(async () => (await report.locator('body').innerText()).replace(/\s+/g, ' '), { message: 'report text', timeout: 60_000 }).toContain(TEST_SITE_NAME);
  await report.close();
}
