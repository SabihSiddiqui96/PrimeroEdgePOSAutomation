import { test, expect, Page } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';
import { TEST_PATRON_ID, TEST_SITE_CODE, usDate } from '../../../utils/testData';
import { cents, expectPaging, expectSorts, gridRows, gridTotal, redraw } from '../../../utils/webforms';

// POS > Administration > Reminders (/POS/PrintReminders.aspx)
const PATH = '/POS/PrintReminders.aspx';
const ID = 'ctl00_UserContentArea_';
const GRID = `#${ID}gridReminders_ctl00`;

test.describe('POS - Administration - Reminders', () => {
  test('Reminders: criteria, filters, results, letters, sort and notify', async ({ page }) => {
    test.setTimeout(10 * 60_000);
    // Notify prints the letters; keep the text instead of opening the print dialog.
    await page.context().addInitScript(() => {
      window.print = () => console.log(`PRINTED:${document.body.innerText}`);
    });
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/Reminders/i);
    await expectPageTitle(page, 'Reminders');

    await test.step('site filters', async () => {
      await expectCaptions(page, ['Site Code', 'Site', 'HomeRoom']);
      await expectFilled(page, [
        `${ID}ucAreaSiteSelector_rcbSiteCode_Input`,
        `${ID}ucAreaSiteSelector_rcbSite_Input`,
        `${ID}ucGradeSelector_rcbGrades_Input`,
        `${ID}ddlHomeRoom_Input`,
      ]);
    });

    await test.step('patron, site, balance and print criteria', async () => {
      await expectCaptions(page, ['Patron Criteria', 'Students', 'Active', 'Inactive', 'Free', 'Reduced', 'Paid', 'Staff']);
      await expectCaptions(page, ['Site Criteria', 'Exclude CEP/Provision II Sites']);
      await expectCaptions(page, ['Balance Criteria', 'Below', 'Between', 'Above', 'All Balances', 'Balance Below:', 'Exclude $0.00', 'Exclude No Charge']);
      await expectCaptions(page, ['Print Criteria', 'Single', 'Multiple (3)']);
      await expect(page.locator('#ctl00_page_content')).toContainText('Reminder letters are not available for re-printing via Student Notification.');
      await expectVisible(page, [
        `${ID}rbStudent`, `${ID}cboxStudentActive`, `${ID}cboxStudentInactive`,
        `${ID}chkStudentPriceTypeList_0`, `${ID}chkStudentPriceTypeList_1`, `${ID}chkStudentPriceTypeList_2`,
        `${ID}rbStaff`, `${ID}chkCEP`,
        `${ID}rdlBalance_0`, `${ID}rdlBalance_1`, `${ID}rdlBalance_2`, `${ID}rdlBalance_3`,
        `${ID}excludeZeroCheckBox`, `${ID}excludeNoChargeCheckBox`,
        `${ID}radioButtonStandardReminder`, `${ID}radioButtonMultipleReminder`,
      ]);
      await expectButtons(page, [[`${ID}btnApply`, 'Apply']]);
    });

    await test.step('grade list: PK, KG, 1 to 12 and not specified', async () => {
      await page.locator(`#${ID}ucGradeSelector_rcbGrades_Arrow`).click();
      const grades = (await page.locator(`#${ID}ucGradeSelector_rcbGrades_DropDown li`).allInnerTexts()).map((g) => g.trim());
      for (const grade of ['PK', 'KG', ...Array.from({ length: 12 }, (_, i) => String(i + 1)), 'Grade Not Specified']) {
        expect(grades, `grade ${grade}`).toContain(grade);
      }
      await page.locator(`#${ID}ucGradeSelector_rcbGrades_Arrow`).click();
    });

    await test.step('defaults: active students of every price type, below $5.00, $0.00 excluded', async () => {
      const ticked = ['rbStudent', 'cboxStudentActive', 'chkStudentPriceTypeList_0', 'chkStudentPriceTypeList_1', 'chkStudentPriceTypeList_2', 'rdlBalance_0', 'excludeZeroCheckBox', 'radioButtonStandardReminder'];
      for (const id of ticked) await expect(page.locator(`#${ID}${id}`), id).toBeChecked();
      for (const id of ['cboxStudentInactive', 'chkCEP', 'excludeNoChargeCheckBox']) await expect(page.locator(`#${ID}${id}`), id).not.toBeChecked();
      await expect(page.locator(`#${ID}txtBalanceBelow1`)).toHaveValue('$5.00');
    });

    const below = await test.step('Apply: everyone listed is below $5.00 and not at $0.00', async () => {
      await apply(page);
      const rows = await reminders(page);
      expect(rows.length, 'patrons below $5.00').toBeGreaterThan(0);
      for (const r of rows) {
        expect(r.balance, `${r.id} balance`).toBeLessThan(5);
        expect(r.balance, `${r.id} balance`).not.toBe(0);
      }
      await expectButtons(page, [[`${ID}btnNotifyAllReminderLetter`, 'Notify All'], [`${ID}btnNotifySelected`, 'Notify Selected']]);
      return { rows, total: await gridTotal(page, GRID) };
    });

    await test.step('View: the single letter is for that patron and balance', async () => {
      const first = below.rows[0];
      const body = await letterFor(page, 0);
      expect(body).toContain(first.id);
      expect(body).toContain(first.firstName);
      expect(body).toContain(first.lastName);
      expect(body).toContain(first.siteName);
      // The letter pads month and day (11/04/2026).
      const today = usDate(new Date()).replace(/\b(\d)\//g, '0$1/');
      expect(body).toContain(`balance is ${first.balanceText} as of ${today}`);
    });

    await test.step('Print boxes drive Notify Selected; its options cancel cleanly', async () => {
      const notifySelected = page.locator(`#${ID}btnNotifySelected`);
      const printBox = row(page, 0).locator('input[id$="cboxPrint"]');
      await expect(notifySelected, 'nothing ticked').toBeDisabled();
      await printBox.check();
      await expect(notifySelected).toBeEnabled();
      await printBox.uncheck();
      await expect(notifySelected).toBeDisabled();

      const checkAll = page.locator(`${GRID} input[id$="CheckAllPrintCheckBox"]`);
      await checkAll.check();
      for (const box of await page.locator(`${GRID} input[id$="cboxPrint"]`).all()) await expect(box).toBeChecked();
      await expect(notifySelected).toBeEnabled();

      await notifySelected.click();
      const options = notifyOptions(page);
      await expect(options).toBeVisible();
      for (const text of ['Letter Templates', 'Letter Format', 'Individual', 'Household', 'Sort By', 'Site Code', 'Last Name', 'Grade', 'Zip Code']) {
        await expect(options, `option "${text}"`).toContainText(text);
      }
      await expect(page.locator(`#${ID}btnPrintEmailAllReminderLetters`)).toHaveValue('Notify');
      await page.locator(`#${ID}btnCancel`).click();
      await expect(options).toBeHidden();
      await checkAll.uncheck();
      await expect(notifySelected).toBeDisabled();
    });

    const all = await test.step('Between, Above and All balances', async () => {
      await chooseBalance(page, 1);
      await typeMoney(page, 'txtBalanceBelow1', '0');
      await typeMoney(page, 'txtBalanceBelow2', '5');
      await apply(page);
      const between = await reminders(page);
      expect(between.length, 'patrons between $0.00 and $5.00').toBeGreaterThan(0);
      for (const r of between) {
        expect(r.balance, `${r.id} between $0.00 and $5.00`).toBeGreaterThanOrEqual(0);
        expect(r.balance, `${r.id} between $0.00 and $5.00`).toBeLessThanOrEqual(5);
      }

      await chooseBalance(page, 2);
      await typeMoney(page, 'txtBalanceBelow1', '5');
      await apply(page);
      const aboveRows = await reminders(page);
      expect(aboveRows.length, 'patrons above $5.00').toBeGreaterThan(0);
      for (const r of aboveRows) expect(r.balance, `${r.id} above $5.00`).toBeGreaterThan(5);
      const above = await gridTotal(page, GRID);

      await chooseBalance(page, 3);
      await apply(page);
      const total = await gridTotal(page, GRID);
      expect(total, 'All balances covers below and above').toBeGreaterThanOrEqual(below.total + above);

      await page.locator(`#${ID}excludeZeroCheckBox`).uncheck();
      await apply(page);
      const withZero = await gridTotal(page, GRID);
      expect(withZero, 'with $0.00 balances too').toBeGreaterThanOrEqual(total);
      await page.locator(`#${ID}excludeZeroCheckBox`).check();
      await apply(page);
      return total;
    });

    await test.step('Pages, page size, and sorting by each column', async () => {
      await expectSorts(page, GRID, 'Patron ID');
      await expectSorts(page, GRID, 'Last Name');
      await expectSorts(page, GRID, 'First Name');
      await expectSorts(page, GRID, 'Site Code');
      await expectSorts(page, GRID, 'Site Name');
      await expectSorts(page, GRID, 'Balance', 'money');
      await expectSorts(page, GRID, 'Grade', 'grade');
      await expectSorts(page, GRID, 'Homeroom');
      if (all > (await reminders(page)).length) await expectPaging(page, GRID);
    });

    await test.step('Inactive, each price type, No Charge and CEP', async () => {
      await page.locator(`#${ID}cboxStudentInactive`).check();
      await apply(page);
      const both = await gridTotal(page, GRID);
      await page.locator(`#${ID}cboxStudentActive`).uncheck();
      await apply(page);
      const inactive = await gridTotal(page, GRID);
      // QA lists 3 extra with both ticked; the exact sum is the fixme test below.
      expect(both, 'both ticked lists at least the active').toBeGreaterThanOrEqual(all);
      expect(both, 'both ticked lists at least the inactive').toBeGreaterThanOrEqual(inactive);
      await page.locator(`#${ID}cboxStudentActive`).check();
      await page.locator(`#${ID}cboxStudentInactive`).uncheck();

      let byType = 0;
      for (const only of [0, 1, 2]) {
        for (const i of [0, 1, 2]) await page.locator(`#${ID}chkStudentPriceTypeList_${i}`).setChecked(i === only);
        await apply(page);
        byType += await gridTotal(page, GRID);
      }
      expect(byType, 'Free + Reduced + Paid').toBe(all);
      for (const i of [0, 1, 2]) await page.locator(`#${ID}chkStudentPriceTypeList_${i}`).check();

      for (const id of ['excludeNoChargeCheckBox', 'chkCEP']) {
        await page.locator(`#${ID}${id}`).check();
        await apply(page);
        expect(await gridTotal(page, GRID), id).toBeLessThanOrEqual(all);
        await page.locator(`#${ID}${id}`).uncheck();
      }
      await apply(page);
      expect(await gridTotal(page, GRID)).toBe(all);
    });

    await test.step('Grade narrows the list to that grade', async () => {
      const graded = (await reminders(page)).find((r) => r.grade);
      expect(graded, 'a patron with a grade').toBeDefined();
      await pickChecked(page, `${ID}ucGradeSelector_rcbGrades`, graded!.grade);
      await apply(page);
      const rows = await reminders(page);
      expect(rows.map((r) => r.id)).toContain(graded!.id);
      for (const r of rows) expect(r.grade, r.id).toBe(graded!.grade);
      await pickChecked(page, `${ID}ucGradeSelector_rcbGrades`, null);
      await apply(page);
    });

    await test.step('HomeRoom narrows the list to that homeroom', async () => {
      const roomed = (await reminders(page)).find((r) => r.homeroom);
      expect(roomed, 'a patron with a homeroom').toBeDefined();
      await page.locator(`#${ID}ddlHomeRoom_Arrow`).click();
      await page.locator(`#${ID}ddlHomeRoom_DropDown li`).filter({ hasText: new RegExp(`^${escape(roomed!.homeroom)}\\b`) }).first().click();
      await page.waitForLoadState('networkidle');
      await apply(page);
      const rows = await reminders(page);
      expect(rows.map((r) => r.id)).toContain(roomed!.id);
      for (const r of rows) expect(r.homeroom, r.id).toBe(roomed!.homeroom);
      await page.locator(`#${ID}ddlHomeRoom_Arrow`).click();
      await page.locator(`#${ID}ddlHomeRoom_DropDown li`).filter({ hasText: /^--ALL--$/ }).click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Site filter narrows the list to that site', async () => {
      await pickSite(page, TEST_SITE_CODE);
      await apply(page);
      const rows = await reminders(page);
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) expect(r.siteCode).toBe(TEST_SITE_CODE);
    });

    await test.step('Notify Selected prints the letter for just that patron', async () => {
      await findPatron(page, TEST_PATRON_ID);
      const patron = (await reminders(page)).find((r) => r.id === TEST_PATRON_ID)!;
      await page.locator(`${GRID} > tbody > tr`).filter({ has: page.getByRole('cell', { name: TEST_PATRON_ID, exact: true }) }).locator('input[id$="cboxPrint"]').check();
      await page.locator(`#${ID}btnNotifySelected`).click();
      await expect(notifyOptions(page)).toBeVisible();
      const printed = page.context().waitForEvent('console', { predicate: (m) => m.text().startsWith('PRINTED:'), timeout: 60_000 });
      await page.locator(`#${ID}btnPrintEmailAllReminderLetters`).click();
      const letter = (await printed).text().replace(/\s+/g, ' ');
      expect(letter).toContain(TEST_PATRON_ID);
      expect(letter).toContain(patron.firstName);
      expect(letter).toContain(patron.lastName);
      // The letter drops the thousands comma the grid shows ($29664.13 vs $29,664.13).
      const [, amount] = letter.match(/balance is (-?\$[\d,]+\.\d{2})/) ?? [];
      expect(amount, 'balance in the letter').toBeDefined();
      expect(cents(amount)).toBe(cents(patron.balanceText));
      expect(letter).toContain(`as of ${usDate(new Date()).replace(/\b(\d)\//g, '0$1/')}`);
    });

    await test.step('Multiple (3): the letter is for that patron', async () => {
      await page.locator(`#${ID}radioButtonMultipleReminder`).check();
      await page.waitForLoadState('networkidle');
      // The site is cleared on Apply after a criteria switch; see the fixme test below.
      await pickSite(page, TEST_SITE_CODE);
      await apply(page);
      const first = (await reminders(page))[0];
      const body = await letterFor(page, 0);
      expect(body).toContain(first.id);
      expect(body).toContain(first.firstName);
      expect(body).toContain(first.siteName);
    });

    await test.step('Staff: active and inactive staff at the site', async () => {
      await page.locator(`#${ID}rbStaff`).check();
      await page.waitForLoadState('networkidle');
      await expect(page.locator(`#${ID}cboxStaffActive`)).toBeChecked();
      await expect(page.locator(`#${ID}cboxStaffInactive`)).not.toBeChecked();
      await expect(page.locator(`#${ID}chkStudentPriceTypeList_0`), 'price types are for students').toBeHidden();
      await pickSite(page, TEST_SITE_CODE);
      await apply(page);
      const active = await gridTotal(page, GRID);
      for (const r of await reminders(page)) expect(r.siteCode).toBe(TEST_SITE_CODE);
      await page.locator(`#${ID}cboxStaffInactive`).check();
      await apply(page);
      expect(await gridTotal(page, GRID), 'with inactive staff').toBeGreaterThanOrEqual(active);
    });
  });

  // QA: after switching Students/Staff, Apply ignores the site still shown in Site Code.
  test.fixme('Reminders: the site filter survives switching between Students and Staff', async ({ page }) => {
    await openPosPage(page, PATH);
    await chooseBalance(page, 3);
    await pickSite(page, TEST_SITE_CODE);
    await page.locator(`#${ID}rbStaff`).check();
    await page.waitForLoadState('networkidle');
    await apply(page);
    await expect(page.locator(`#${ID}ucAreaSiteSelector_rcbSiteCode_Input`)).toHaveValue(TEST_SITE_CODE);
    for (const r of await reminders(page)) expect(r.siteCode).toBe(TEST_SITE_CODE);
  });

  // QA: 66 active + 0 inactive, yet 69 with both ticked (three Central Office patrons).
  test.fixme('Reminders: Active plus Inactive lists exactly the active and the inactive', async ({ page }) => {
    await openPosPage(page, PATH);
    await chooseBalance(page, 3);
    await apply(page);
    const active = await gridTotal(page, GRID);
    await page.locator(`#${ID}cboxStudentInactive`).check();
    await apply(page);
    const both = await gridTotal(page, GRID);
    await page.locator(`#${ID}cboxStudentActive`).uncheck();
    await apply(page);
    expect(active + (await gridTotal(page, GRID))).toBe(both);
  });

  // QA: the letter Notify prints carries "{{ParentOnline Information}}" unfilled.
  test.fixme('Reminders: the Notify letter fills every placeholder', async ({ page }) => {
    await page.context().addInitScript(() => {
      window.print = () => console.log(`PRINTED:${document.body.innerText}`);
    });
    await openPosPage(page, PATH);
    await chooseBalance(page, 3);
    await pickSite(page, TEST_SITE_CODE);
    await apply(page);
    await findPatron(page, TEST_PATRON_ID);
    await page.locator(`${GRID} > tbody > tr`).filter({ has: page.getByRole('cell', { name: TEST_PATRON_ID, exact: true }) }).locator('input[id$="cboxPrint"]').check();
    await page.locator(`#${ID}btnNotifySelected`).click();
    const printed = page.context().waitForEvent('console', { predicate: (m) => m.text().startsWith('PRINTED:') });
    await page.locator(`#${ID}btnPrintEmailAllReminderLetters`).click();
    expect((await printed).text()).not.toContain('{{');
  });

  // QA: the Multiple (3) letter prints {{Balance}} and {{Current Date}} unfilled.
  test.fixme('Reminders: the Multiple (3) letter fills in the balance and date', async ({ page }) => {
    await openPosPage(page, PATH);
    await page.locator(`#${ID}radioButtonMultipleReminder`).check();
    await page.waitForLoadState('networkidle');
    await apply(page);
    const first = (await reminders(page))[0];
    const body = await letterFor(page, 0);
    expect(body).not.toContain('{{');
    expect(body).toContain(first.balanceText);
  });
});

function row(page: Page, index: number) {
  return page.locator(`${GRID} > tbody > tr`).nth(index);
}

async function apply(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await redraw(page, GRID, () => page.locator(`#${ID}btnApply`).click());
}

function notifyOptions(page: Page) {
  return page.locator(`#${ID}btnPrintEmailAllReminderLetters`).locator('xpath=ancestor::*[contains(@class,"RadToolTip")][1]');
}

/** View a row's letter and read it. */
async function letterFor(page: Page, index: number): Promise<string> {
  const popup = page.context().waitForEvent('page');
  await row(page, index).locator('input[id$="imgView"]').click();
  const letter = await popup;
  const text = async () => (await letter.locator('body').innerText()).replace(/\s+/g, ' ');
  await expect.poll(text, { message: 'letter text', timeout: 30_000 }).toContain('Dear Parent');
  const body = await text();
  await letter.close();
  return body;
}

/** Site Code here is a multi-select: clear Check All, then tick just the one code. */
async function pickSite(page: Page, code: string): Promise<void> {
  await pickChecked(page, `${ID}ucAreaSiteSelector_rcbSiteCode`, code);
  await expect(page.locator(`#${ID}ucAreaSiteSelector_rcbSiteCode_Input`)).toHaveValue(code);
}

/** Tick one item in a check-box combo, or every item when `item` is null. */
async function pickChecked(page: Page, combo: string, item: string | null): Promise<void> {
  const list = page.locator(`#${combo}_DropDown`);
  await page.locator(`#${combo}_Arrow`).click();
  const all = list.locator('.rcbCheckAllItemsCheckBox');
  if (await all.count()) {
    await all.setChecked(item === null);
  } else {
    for (const box of await list.locator('li input[type="checkbox"]').all()) await box.setChecked(item === null);
  }
  if (item !== null) await list.locator('li').filter({ hasText: new RegExp(`^\\s*${escape(item)}\\s*$`) }).locator('input[type="checkbox"]').check();
  await page.locator(`#${combo}_Arrow`).click();
  await page.waitForLoadState('networkidle');
}

/** Page through the list until the patron is on screen. */
async function findPatron(page: Page, id: string): Promise<void> {
  for (let i = 0; !(await reminders(page)).some((r) => r.id === id); i++) {
    const next = page.locator(`${GRID} .rgPageNext`).first();
    expect(i < 20 && (await next.count()) > 0, `patron ${id} in the list`).toBe(true);
    await redraw(page, GRID, () => next.click());
  }
}

/** Each balance option reloads the form; Apply before that runs the previous option. */
async function chooseBalance(page: Page, index: number): Promise<void> {
  await page.locator(`#${ID}rdlBalance_${index}`).check();
  const first = page.locator(`#${ID}txtBalanceBelow1`);
  const second = page.locator(`#${ID}txtBalanceBelow2`);
  // Below and Above take one amount, Between two, All none.
  if (index === 3) await expect(first).toBeHidden();
  else await expect(first).toBeVisible();
  if (index === 1) await expect(second).toBeVisible();
  else await expect(second).toBeHidden();
  await page.waitForLoadState('networkidle');
}

async function typeMoney(page: Page, id: string, value: string): Promise<void> {
  const input = page.locator(`#${ID}${id}`);
  await input.click();
  await input.press('Control+A');
  await input.pressSequentially(value);
  await input.press('Tab');
  await expect(input).toHaveValue(`$${Number(value).toFixed(2)}`);
}

async function reminders(page: Page) {
  return (await gridRows(page, GRID)).map((r) => ({
    id: r['Patron ID'],
    lastName: r['Last Name'],
    firstName: r['First Name'],
    siteCode: r['Site Code'],
    siteName: r['Site Name'],
    grade: r['Grade'],
    homeroom: r['Homeroom'],
    balanceText: r['Balance'],
    balance: (r['Balance'].includes('-') ? -1 : 1) * Number(r['Balance'].replace(/[^0-9.]/g, '')),
  }));
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
