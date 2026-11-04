import { test, expect, Page } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';
import { usDate } from '../../../utils/testData';
import { gridTotal, redraw } from '../../../utils/webforms';

// POS > Administration > Reminders (/POS/PrintReminders.aspx)
const PATH = '/POS/PrintReminders.aspx';
const ID = 'ctl00_UserContentArea_';
const GRID = `#${ID}gridReminders_ctl00`;

test.describe('POS - Administration - Reminders', () => {
  test('Reminders: criteria, results, letter preview and notify options', async ({ page }) => {
    test.setTimeout(5 * 60_000);
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

    await test.step('defaults: active students of every price type, below $5.00, $0.00 excluded', async () => {
      const ticked = ['rbStudent', 'cboxStudentActive', 'chkStudentPriceTypeList_0', 'chkStudentPriceTypeList_1', 'chkStudentPriceTypeList_2', 'rdlBalance_0', 'excludeZeroCheckBox', 'radioButtonStandardReminder'];
      for (const id of ticked) await expect(page.locator(`#${ID}${id}`), id).toBeChecked();
      for (const id of ['cboxStudentInactive', 'chkCEP', 'excludeNoChargeCheckBox']) await expect(page.locator(`#${ID}${id}`), id).not.toBeChecked();
      await expect(page.locator(`#${ID}txtBalanceBelow1`)).toHaveValue('$5.00');
    });

    const below = await test.step('Apply: everyone listed is below $5.00 and not at $0.00', async () => {
      await redraw(page, GRID, () => page.locator(`#${ID}btnApply`).click());
      const rows = await reminders(page);
      expect(rows.length, 'patrons below $5.00').toBeGreaterThan(0);
      for (const r of rows) {
        expect(r.balance, `${r.id} balance`).toBeLessThan(5);
        expect(r.balance, `${r.id} balance`).not.toBe(0);
      }
      return { rows, total: await gridTotal(page, GRID) };
    });

    await test.step('View: the letter is for that patron and balance', async () => {
      const first = below.rows[0];
      const popup = page.context().waitForEvent('page');
      await row(page, 0).locator('input[id$="imgView"]').click();
      const letter = await popup;
      const text = async () => (await letter.locator('body').innerText()).replace(/\s+/g, ' ');
      await expect.poll(text, { message: 'letter text', timeout: 30_000 }).toContain(first.id);
      const body = await text();
      expect(body).toContain(first.firstName);
      expect(body).toContain(first.lastName);
      expect(body).toContain(first.siteName);
      // The letter pads month and day (11/04/2026).
      const today = usDate(new Date()).replace(/\b(\d)\//g, '0$1/');
      expect(body).toContain(`balance is ${first.balanceText} as of ${today}`);
      await letter.close();
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
      const notify = page.locator(`#${ID}btnPrintEmailAllReminderLetters`);
      const options = notify.locator('xpath=ancestor::*[contains(@class,"RadToolTip")][1]');
      await expect(options).toBeVisible();
      for (const text of ['Letter Templates', 'Letter Format', 'Individual', 'Household', 'Sort By', 'Site Code', 'Last Name', 'Grade', 'Zip Code']) {
        await expect(options, `option "${text}"`).toContainText(text);
      }
      await expect(notify).toHaveValue('Notify');
      // Notify sends the letters, so only Cancel is pressed.
      await page.locator(`#${ID}btnCancel`).click();
      await expect(options).toBeHidden();
      await checkAll.uncheck();
      await expect(notifySelected).toBeDisabled();
    });

    await test.step('Between, Above and All balances', async () => {
      await chooseBalance(page, 1);
      await typeMoney(page, 'txtBalanceBelow1', '0');
      await typeMoney(page, 'txtBalanceBelow2', '5');
      await redraw(page, GRID, () => page.locator(`#${ID}btnApply`).click());
      const between = await reminders(page);
      expect(between.length, 'patrons between $0.00 and $5.00').toBeGreaterThan(0);
      for (const r of between) {
        expect(r.balance, `${r.id} between $0.00 and $5.00`).toBeGreaterThanOrEqual(0);
        expect(r.balance, `${r.id} between $0.00 and $5.00`).toBeLessThanOrEqual(5);
      }

      await chooseBalance(page, 2);
      await typeMoney(page, 'txtBalanceBelow1', '5');
      await redraw(page, GRID, () => page.locator(`#${ID}btnApply`).click());
      const aboveRows = await reminders(page);
      expect(aboveRows.length, 'patrons above $5.00').toBeGreaterThan(0);
      for (const r of aboveRows) expect(r.balance, `${r.id} above $5.00`).toBeGreaterThan(5);
      const above = await gridTotal(page, GRID);

      await chooseBalance(page, 3);
      await redraw(page, GRID, () => page.locator(`#${ID}btnApply`).click());
      const all = await gridTotal(page, GRID);
      expect(all, 'All balances covers below and above').toBeGreaterThanOrEqual(below.total + above);

      await page.locator(`#${ID}excludeZeroCheckBox`).uncheck();
      await redraw(page, GRID, () => page.locator(`#${ID}btnApply`).click());
      expect(await gridTotal(page, GRID), 'with $0.00 balances too').toBeGreaterThanOrEqual(all);
    });

    await test.step('Site filter narrows the list to that site', async () => {
      const site = below.rows[0].siteCode;
      // Site Code here is a multi-select: clear Check All, then tick just the one code.
      const codes = page.locator(`#${ID}ucAreaSiteSelector_rcbSiteCode_DropDown`);
      await page.locator(`#${ID}ucAreaSiteSelector_rcbSiteCode_Arrow`).click();
      await codes.locator('.rcbCheckAllItemsCheckBox').uncheck();
      await codes.locator('li').filter({ hasText: new RegExp(`^${site}$`) }).locator('input[type="checkbox"]').check();
      await page.locator(`#${ID}ucAreaSiteSelector_rcbSiteCode_Arrow`).click();
      await expect(page.locator(`#${ID}ucAreaSiteSelector_rcbSiteCode_Input`)).toHaveValue(site);
      await page.waitForLoadState('networkidle');
      await redraw(page, GRID, () => page.locator(`#${ID}btnApply`).click());
      const rows = await reminders(page);
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) expect(r.siteCode).toBe(site);
    });
  });
});

function row(page: Page, index: number) {
  return page.locator(`${GRID} > tbody > tr`).nth(index);
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
  return page.locator(GRID).evaluate((grid) => {
    const headers = Array.from(grid.querySelectorAll(':scope > thead > tr > th')).map((th) => (th as HTMLElement).innerText.replace(/HeaderText/g, '').trim());
    return Array.from(grid.querySelectorAll(':scope > tbody > tr.rgRow, :scope > tbody > tr.rgAltRow')).map((tr) => {
      const cell = (name: string) => (tr.children[headers.indexOf(name)] as HTMLElement)?.innerText.trim() ?? '';
      const balanceText = cell('Balance');
      return {
        id: cell('Patron ID'),
        lastName: cell('Last Name'),
        firstName: cell('First Name'),
        siteCode: cell('Site Code'),
        siteName: cell('Site Name'),
        balanceText,
        balance: (balanceText.includes('-') ? -1 : 1) * Number(balanceText.replace(/[^0-9.]/g, '')),
      };
    });
  });
}
