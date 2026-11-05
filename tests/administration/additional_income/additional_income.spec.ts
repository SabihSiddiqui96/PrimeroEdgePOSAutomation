import { test, expect, Page } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectGridColumns,
  expectGridResolved,
  expectPageTitle,
} from '../../../utils/screen';
import { TEST_SITE_CODE, TEST_SITE_NAME, usDate } from '../../../utils/testData';
import { cents, EDIT_SITE_PICKER, gridRows, money, pickSiteCode, redraw, typeDate } from '../../../utils/webforms';

// POS > Administration > Additional Income (/POS/POSAdditionalIncome.aspx)
const PATH = '/POS/POSAdditionalIncome.aspx';
const ID = 'ctl00_UserContentArea_';
const LIST = `#${ID}RadGridAdditionalIncome_ctl00`;
const CHECKS = `#${ID}UCDenomination_gridChecks_ctl00`;
const COMMENT = 'Sabih-automation testing';
// Income can't be deleted, so the test keeps editing one record on the first day of the year.
const INCOME_DATE = usDate(new Date(new Date().getFullYear(), 0, 1));

test.describe('POS - Administration - Additional Income', () => {
  test('Additional Income: add, edit, cash and checks, comments', async ({ page }) => {
    test.setTimeout(6 * 60_000);
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/Additional Income/i);
    await expectPageTitle(page, 'Additional Income');
    await expectCaptions(page, ['Site Code', 'Site', 'From', 'To']);
    await expectFilled(page, [
      `${ID}ucAreaSiteSelector_rcbSiteCode_Input`,
      `${ID}ucAreaSiteSelector_rcbSite_Input`,
      `${ID}fromCalendarPopup_dateInput`,
      `${ID}toCalendarPopup_dateInput`,
    ]);
    await expect(page.locator(`#${ID}fromCalendarPopup_dateInput`), 'defaults to today').toHaveValue(usDate(new Date()));
    await expect(page.locator(`#${ID}toCalendarPopup_dateInput`)).toHaveValue(usDate(new Date()));
    await expectButtons(page, [
      [`${ID}btnApply`, 'Apply'],
      [`${ID}btnAdd`, 'Add...'],
    ]);
    await expectGridColumns(page, `${ID}RadGridAdditionalIncome_ctl00`, ['Site', 'Amount', 'Entry Date', 'Entered By']);
    await expectGridResolved(page, `${ID}RadGridAdditionalIncome_ctl00`);

    await test.step('the test site’s income for its day', async () => {
      await showIncome(page);
      if ((await gridRows(page, LIST)).length) return;

      // First run this year: add it.
      await button(page, 'btnAdd').click();
      await expect(page).toHaveURL(/EditAdditionalIncome\.aspx/);
      await expect(page.locator('#ctl00_IDPageTitle')).toContainText('Add Additional Income');
      await button(page, 'btnSave').click();
      await expect(page.locator('#ctl00_page_content'), 'comments are required').toContainText('Please Enter Comments');
      await pickSiteCode(page, TEST_SITE_CODE, EDIT_SITE_PICKER);
      await expect(page.locator(`#${EDIT_SITE_PICKER.site}`)).toHaveValue(new RegExp(`^${TEST_SITE_NAME}$`, 'i'));
      await typeDate(page, `${ID}calFromDate_dateInput`, INCOME_DATE);
      await setOnes(page, 1);
      await field(page, 'UCDenomination_txtAdditionalComments').fill(COMMENT);
      await button(page, 'btnSave').click();
      await showIncome(page);
      expect(await gridRows(page, LIST), 'income added').toHaveLength(1);
    });

    const before = await test.step('Edit: site is fixed, the saved counts and comment history load', async () => {
      const [row] = await gridRows(page, LIST);
      expect(row['Site']).toBe(TEST_SITE_NAME);
      expect(Date.parse(row['Entry Date']), 'entry date').toBe(Date.parse(INCOME_DATE));
      expect(row['Entered By']).not.toBe('');
      await openEdit(page);
      await expect(page.locator(`#${EDIT_SITE_PICKER.code}_Input`)).toHaveValue(TEST_SITE_CODE);
      await expect(page.locator(`#${EDIT_SITE_PICKER.code}_Input`), 'site cannot change').toBeDisabled();
      await expect(field(page, 'calFromDate_dateInput')).toHaveValue(INCOME_DATE);
      await expect(field(page, 'UCDenomination_txtAdditionalTotal')).toHaveValue(row['Amount']);
      await expect(field(page, 'UCDenomination_txtAdditionalComments')).toHaveValue('');
      expect(await field(page, 'UCDenomination_txtAdditionalCommentHistory').inputValue()).toMatch(/\d+\/\d+\/\d{4} \d+:\d{2}:\d{2} [AP]M/);
      return cents(row['Amount']);
    });

    // A cash count and a check that differ from what is saved, so the update shows.
    const ones = (Math.floor(before / 100) % 20) + 2;
    const check = { number: `Chk${Date.now() % 100000}`, amount: '3.25' };
    const expected = ones * 100 + cents(check.amount);

    await test.step('Cash and checks add up; Cancel throws the changes away', async () => {
      await clearChecks(page);
      await setOnes(page, ones);
      await expect(field(page, 'UCDenomination_txtAdditionalTotalCash')).toHaveValue(money(ones * 100));
      await addCheck(page, check.number, check.amount);
      await expect(field(page, 'UCDenomination_txtAdditionalTotalChecks')).toHaveValue(money(cents(check.amount)));
      await expect(field(page, 'UCDenomination_txtAdditionalTotal')).toHaveValue(money(expected));
      for (const id of ['txtAdditionalTotalCash', 'txtAdditionalTotalChecks', 'txtAdditionalTotal', 'txtAdditionalCommentHistory']) {
        await expect(field(page, `UCDenomination_${id}`), `${id} is not typed`).not.toBeEditable();
      }
      await cancel(page);
      await showIncome(page);
      expect((await gridRows(page, LIST))[0]['Amount'], 'cancel saves nothing').toBe(money(before));
    });

    await test.step('Save: the list and the record show the new amount and the comment', async () => {
      await openEdit(page);
      await clearChecks(page);
      await setOnes(page, ones);
      await addCheck(page, check.number, check.amount);
      await field(page, 'UCDenomination_txtAdditionalComments').fill(COMMENT);
      await button(page, 'btnSave').click();
      await showIncome(page);
      expect((await gridRows(page, LIST))[0]['Amount']).toBe(money(expected));

      await openEdit(page);
      await expect(field(page, 'UCDenomination_txtAdditionalTotal')).toHaveValue(money(expected));
      expect(await checkRows(page)).toEqual([{ number: check.number, amount: money(cents(check.amount)) }]);
      const today = new Date();
      expect(await field(page, 'UCDenomination_txtAdditionalCommentHistory').inputValue(), 'commented today').toMatch(
        new RegExp(`\\b0?${today.getMonth() + 1}/0?${today.getDate()}/${today.getFullYear()} `),
      );
      expect(await field(page, 'UCDenomination_txtAdditionalCommentHistory').inputValue()).toContain(COMMENT);
      await cancel(page);
    });
  });
});

/** Cancel goes back to the list; the server can be slow to answer it. */
async function cancel(page: Page): Promise<void> {
  await button(page, 'btnCancel').click({ noWaitAfter: true });
  await expect(page).toHaveURL(/POSAdditionalIncome\.aspx/, { timeout: 60_000 });
}

function field(page: Page, id: string) {
  return page.locator(`#${ID}${id}`);
}

function button(page: Page, id: string) {
  return page.locator(`#${ID}${id}`);
}

/** The list, narrowed to the test site on the income's day. */
async function showIncome(page: Page): Promise<void> {
  if (!/POSAdditionalIncome\.aspx/i.test(page.url())) await openPosPage(page, PATH);
  await pickSiteCode(page, TEST_SITE_CODE);
  await typeDate(page, `${ID}fromCalendarPopup_dateInput`, INCOME_DATE);
  await typeDate(page, `${ID}toCalendarPopup_dateInput`, INCOME_DATE);
  await redraw(page, LIST, () => button(page, 'btnApply').click());
}

async function openEdit(page: Page): Promise<void> {
  await page.locator(`${LIST} input[id$="imgEditEntry"]`).first().click();
  await expect(page).toHaveURL(/EditAdditionalIncome\.aspx.*IsEdit=true/);
  await expect(page.locator('#ctl00_IDPageTitle')).toContainText('Additional Income Details');
}

/** Count one-dollar bills; the Ones line total follows. */
async function setOnes(page: Page, value: number): Promise<void> {
  const row = page.locator('tr', { has: page.locator('input[id$="txtCount"]') }).filter({ hasText: /^\s*Ones\b/ });
  const box = row.locator('input[id$="txtCount"]');
  await box.click();
  await box.press('Control+A');
  await box.pressSequentially(String(value));
  await box.press('Tab');
  await expect(row.locator('span[id$="lblTotal"]')).toHaveText(money(value * 100));
}

async function addCheck(page: Page, number: string, amount: string): Promise<void> {
  await field(page, 'UCDenomination_gridChecks_ctl00_ctl02_ctl00_InitInsertButton').click();
  await page.locator('input[id$="TB_Description"]').fill(number);
  const value = page.locator('input[id$="RNTB_Amount"]').first();
  await value.click();
  await value.pressSequentially(amount);
  await value.press('Tab');
  await redraw(page, CHECKS, () => page.locator('a[id$="PerformInsertButton"]').click());
}

/** Check #, Amount; this grid keeps its headers in a separate table. */
async function checkRows(page: Page): Promise<{ number: string; amount: string }[]> {
  return page.locator(`${CHECKS} > tbody > tr.rgRow, ${CHECKS} > tbody > tr.rgAltRow`).evaluateAll((rows) =>
    rows.map((tr) => ({ number: (tr.children[0] as HTMLElement).innerText.trim(), amount: (tr.children[1] as HTMLElement).innerText.trim() })),
  );
}

async function clearChecks(page: Page): Promise<void> {
  while ((await checkRows(page)).length) {
    page.once('dialog', (d) => d.accept());
    await redraw(page, CHECKS, () => page.locator(`${CHECKS} input[id$="gbcDeleteColumn"]`).first().click());
  }
}
