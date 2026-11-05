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
import { cents, EDIT_SITE_PICKER, expectSorts, gridRows, money, pickSiteCode, redraw, typeDate } from '../../../utils/webforms';

// POS > Administration > Additional Income (/POS/POSAdditionalIncome.aspx)
const PATH = '/POS/POSAdditionalIncome.aspx';
const ID = 'ctl00_UserContentArea_';
const LIST = `#${ID}RadGridAdditionalIncome_ctl00`;
const CHECKS = `#${ID}UCDenomination_gridChecks_ctl00`;
const COMMENT = 'Sabih-automation testing';
// Test income goes on Jan 1, away from today's sessions and deposits.
const INCOME_DATE = usDate(new Date(new Date().getFullYear(), 0, 1));
const SECOND_DATE = usDate(new Date(new Date().getFullYear(), 0, 2));

const COINS: [string, number][] = [['Pennies', 1], ['Nickels', 5], ['Dimes', 10], ['Quarters', 25], ['Half-Dollars', 50], ['Dollars', 100]];
const BILLS: [string, number][] = [['Ones', 100], ['Twos', 200], ['Fives', 500], ['Tens', 1000], ['Twenties', 2000], ['Fifties', 5000], ['Hundreds', 10000]];

test.describe('POS - Administration - Additional Income', () => {
  test('Additional Income: filters, add, every denomination, checks, edit, sort and delete', async ({ page }) => {
    test.setTimeout(8 * 60_000);
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/Additional Income/i);
    await expectPageTitle(page, 'Additional Income');

    await test.step('list defaults: every site, today to today', async () => {
      await expectCaptions(page, ['Site Code', 'Site', 'From', 'To']);
      await expectFilled(page, [
        `${ID}ucAreaSiteSelector_rcbSiteCode_Input`,
        `${ID}ucAreaSiteSelector_rcbSite_Input`,
        `${ID}fromCalendarPopup_dateInput`,
        `${ID}toCalendarPopup_dateInput`,
      ]);
      await expect(field(page, 'ucAreaSiteSelector_rcbSiteCode_Input')).toHaveValue(/ALL/);
      await expect(field(page, 'fromCalendarPopup_dateInput')).toHaveValue(usDate(new Date()));
      await expect(field(page, 'toCalendarPopup_dateInput')).toHaveValue(usDate(new Date()));
      await expect(page.locator('#ctl00_page_content')).toContainText('The date range selections cannot exceed one year');
      await expectButtons(page, [
        [`${ID}btnApply`, 'Apply'],
        [`${ID}btnAdd`, 'Add...'],
      ]);
      await expectGridColumns(page, `${ID}RadGridAdditionalIncome_ctl00`, ['Site', 'Amount', 'Entry Date', 'Entered By']);
      await expectGridResolved(page, `${ID}RadGridAdditionalIncome_ctl00`);
    });

    await test.step('a From date over a year back pulls To in to one year', async () => {
      const from = new Date();
      from.setFullYear(from.getFullYear() - 2);
      await typeDate(page, `${ID}fromCalendarPopup_dateInput`, usDate(from));
      const to = new Date(from);
      to.setFullYear(to.getFullYear() + 1);
      await expect(field(page, 'toCalendarPopup_dateInput')).toHaveValue(usDate(to));
    });

    try {
      await test.step('start clean: no test income on the day', async () => {
        await removeIncome(page);
        expect(await gridRows(page, LIST)).toHaveLength(0);
        await expect(page.locator(LIST)).toContainText('No records to display.');
      });

      await test.step('Add: defaults, and comments are required', async () => {
        await button(page, 'btnAdd').click();
        await expect(page).toHaveURL(/EditAdditionalIncome\.aspx/);
        await expect(page.locator('#ctl00_IDPageTitle')).toContainText('Add Additional Income');
        await expectCaptions(page, ['Site Code', 'Site', 'Date', 'Denominations', 'Summary', 'Cash', 'Checks', 'Total', 'Comments', 'Comment History']);
        await expectGridColumns(page, `${ID}UCDenomination_gridCoins_ctl00`, ['Coins']);
        await expectGridColumns(page, `${ID}UCDenomination_gridBills_ctl00`, ['Bills']);
        await expect(field(page, 'calFromDate_dateInput'), 'date defaults to today').toHaveValue(usDate(new Date()));
        await expect(page.locator(`#${EDIT_SITE_PICKER.code}_Input`), 'site can be chosen on Add').toBeEnabled();
        for (const [name] of [...COINS, ...BILLS]) await expect(countRow(page, name), name).toBeVisible();
        for (const [name] of [...COINS, ...BILLS]) await expect(countBox(page, name), `${name} starts at 0`).toHaveValue('0');
        for (const id of ['txtAdditionalTotalCash', 'txtAdditionalTotalChecks', 'txtAdditionalTotal']) {
          await expect(field(page, `UCDenomination_${id}`)).toHaveValue('$0.00');
        }
        await expect(page.locator(CHECKS)).toContainText('No records to display.');
        await expectButtons(page, [[`${ID}btnCancel`, 'Cancel'], [`${ID}btnSave`, 'Save']]);

        await button(page, 'btnSave').click();
        await expect(page.locator('#ctl00_page_content')).toContainText('Please Enter Comments');
        await expect(page, 'nothing saved without a comment').toHaveURL(/EditAdditionalIncome\.aspx/);
      });

      const expected = await test.step('Add: every coin and bill counts at its face value', async () => {
        await pickSiteCode(page, TEST_SITE_CODE, EDIT_SITE_PICKER);
        await expect(page.locator(`#${EDIT_SITE_PICKER.site}`)).toHaveValue(new RegExp(`^${TEST_SITE_NAME}$`, 'i'));
        await typeDate(page, `${ID}calFromDate_dateInput`, INCOME_DATE);
        let cash = 0;
        for (const [i, [name, value]] of [...COINS, ...BILLS].entries()) {
          const count = i + 1;
          await setCount(page, name, count);
          await expect(countRow(page, name).locator('span[id$="lblTotal"]'), `${count} ${name}`).toHaveText(money(count * value));
          cash += count * value;
          await expect(field(page, 'UCDenomination_txtAdditionalTotalCash'), `cash after ${name}`).toHaveValue(money(cash));
        }
        return cash;
      });

      // Check # holds 10 characters, so SabihTesting1 is kept as SabihTesti.
      const check = { number: 'SabihTesti', amount: '3.25' };

      await test.step('Checks: add two, delete one; totals follow', async () => {
        await addCheck(page, 'SabihTesting1', check.amount);
        await addCheck(page, 'SabihTesting2', '10.00');
        expect(await checkRows(page)).toEqual([
          { number: check.number, amount: '$3.25' },
          { number: 'SabihTesti', amount: '$10.00' },
        ]);
        await expect(field(page, 'UCDenomination_txtAdditionalTotalChecks')).toHaveValue('$13.25');
        await expect(field(page, 'UCDenomination_txtAdditionalTotal')).toHaveValue(money(expected + 1325));

        page.once('dialog', (d) => d.accept());
        await redraw(page, CHECKS, () => page.locator(`${CHECKS} > tbody > tr`).filter({ hasText: '$10.00' }).locator('input[id$="gbcDeleteColumn"]').click());
        expect(await checkRows(page)).toEqual([{ number: check.number, amount: '$3.25' }]);
        await expect(field(page, 'UCDenomination_txtAdditionalTotalChecks')).toHaveValue('$3.25');
        await expect(field(page, 'UCDenomination_txtAdditionalTotal')).toHaveValue(money(expected + 325));
        for (const id of ['txtAdditionalTotalCash', 'txtAdditionalTotalChecks', 'txtAdditionalTotal', 'txtAdditionalCommentHistory']) {
          await expect(field(page, `UCDenomination_${id}`), `${id} is calculated, not typed`).not.toBeEditable();
        }
      });

      const total = expected + 325;

      await test.step('Save: listed under the site and day with the amount and who entered it', async () => {
        await field(page, 'UCDenomination_txtAdditionalComments').fill(COMMENT);
        await saveNew(page);
        await expect(field(page, 'UCDenomination_txtAdditionalComments'), 'comment moves to the history').toHaveValue('');
        await expect(field(page, 'UCDenomination_txtAdditionalCommentHistory')).toHaveValue(new RegExp(COMMENT));
        await expect(field(page, 'UCDenomination_txtAdditionalTotal')).toHaveValue(money(total));
        await cancel(page);
        await showIncome(page);
        const rows = await gridRows(page, LIST);
        expect(rows).toHaveLength(1);
        expect(rows[0]['Site']).toBe(TEST_SITE_NAME);
        expect(rows[0]['Amount']).toBe(money(total));
        expect(Date.parse(rows[0]['Entry Date'])).toBe(Date.parse(INCOME_DATE));
        expect(rows[0]['Entered By']).not.toBe('');
      });

      await test.step('Edit: site is fixed, every count, the check and the comment load', async () => {
        await openEdit(page);
        await expect(page.locator(`#${EDIT_SITE_PICKER.code}_Input`)).toHaveValue(TEST_SITE_CODE);
        await expect(page.locator(`#${EDIT_SITE_PICKER.code}_Input`), 'site cannot change').toBeDisabled();
        await expect(field(page, 'calFromDate_dateInput')).toHaveValue(INCOME_DATE);
        for (const [i, [name]] of [...COINS, ...BILLS].entries()) await expect(countBox(page, name), name).toHaveValue(String(i + 1));
        expect(await checkRows(page)).toEqual([{ number: check.number, amount: '$3.25' }]);
        await expect(field(page, 'UCDenomination_txtAdditionalTotal')).toHaveValue(money(total));
        await expect(field(page, 'UCDenomination_txtAdditionalComments'), 'a new comment starts empty').toHaveValue('');
        const history = await field(page, 'UCDenomination_txtAdditionalCommentHistory').inputValue();
        expect(history).toContain(COMMENT);
        const today = new Date();
        expect(history, 'commented today').toMatch(new RegExp(`\\b0?${today.getMonth() + 1}/0?${today.getDate()}/${today.getFullYear()} \\d+:\\d{2}:\\d{2} [AP]M`));
      });

      await test.step('Edit then Cancel saves nothing', async () => {
        await setCount(page, 'Hundreds', 99);
        await expect(field(page, 'UCDenomination_txtAdditionalTotal')).not.toHaveValue(money(total));
        await cancel(page);
        await showIncome(page);
        expect((await gridRows(page, LIST))[0]['Amount']).toBe(money(total));
      });

      const updated = await test.step('Edit and Save: new counts and a second comment', async () => {
        await openEdit(page);
        await setCount(page, 'Pennies', 0);
        await setCount(page, 'Hundreds', 0);
        const counted = (name: string) => [...COINS, ...BILLS].findIndex(([n]) => n === name) + 1;
        const now = total - counted('Pennies') * 1 - counted('Hundreds') * 10000;
        await expect(field(page, 'UCDenomination_txtAdditionalTotal')).toHaveValue(money(now));
        await button(page, 'btnSave').click();
        await expect(page.locator('#ctl00_page_content'), 'every save needs its own comment').toContainText('Please Enter Comments');
        await field(page, 'UCDenomination_txtAdditionalComments').fill(`${COMMENT} - edited`);
        await button(page, 'btnSave').click();
        await showIncome(page);
        expect((await gridRows(page, LIST))[0]['Amount']).toBe(money(now));
        await openEdit(page);
        const history = await field(page, 'UCDenomination_txtAdditionalCommentHistory').inputValue();
        expect(history).toContain(COMMENT);
        expect(history).toContain(`${COMMENT} - edited`);
        await cancel(page);
        await showIncome(page);
        return now;
      });

      await test.step('Sort: every column both ways, against a second entry the next day', async () => {
        await addIncome(page, SECOND_DATE, 1);
        await showIncome(page, SECOND_DATE);
        const rows = await gridRows(page, LIST);
        expect(rows.map((r) => r["Amount"]).sort()).toEqual([money(500), money(updated)].sort());
        await expectSorts(page, LIST, 'Amount', 'money');
        await expectSorts(page, LIST, 'Entry Date', 'date');
        await expectSorts(page, LIST, 'Site');
        await expectSorts(page, LIST, 'Entered By');
        await removeIncome(page, SECOND_DATE, SECOND_DATE);
        await showIncome(page);
      });

      await test.step('Site filter: another site does not list it', async () => {
        const other = TEST_SITE_CODE === '001' ? '002' : '001';
        await pickSiteCode(page, other);
        await redraw(page, LIST, () => button(page, 'btnApply').click());
        for (const row of await gridRows(page, LIST)) expect(row['Site']).not.toBe(TEST_SITE_NAME);
        await showIncome(page);
        expect((await gridRows(page, LIST))[0]['Amount']).toBe(money(updated));
      });

      await test.step('Delete asks first; dismissing keeps it, confirming removes it', async () => {
        const remove = page.locator(`${LIST} input[id$="imgDelete"]`).first();
        page.once('dialog', async (d) => {
          expect(d.message()).toBe('Are you sure you want to delete this Additional Income entry?');
          await d.dismiss();
        });
        await remove.click();
        expect(await gridRows(page, LIST)).toHaveLength(1);
        page.once('dialog', (d) => d.accept());
        await redraw(page, LIST, () => remove.click());
        await expect(page.locator(LIST)).toContainText('No records to display.');
        await redraw(page, LIST, () => button(page, 'btnApply').click());
        expect(await gridRows(page, LIST), 'gone after Apply too').toHaveLength(0);
      });
    } finally {
      await removeIncome(page, INCOME_DATE, SECOND_DATE).catch(() => undefined);
    }
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

/** The list, narrowed to the test site from `from` to `to`. */
async function showIncome(page: Page, to = INCOME_DATE, from = INCOME_DATE): Promise<void> {
  if (!/POSAdditionalIncome\.aspx/i.test(page.url())) await openPosPage(page, PATH);
  await pickSiteCode(page, TEST_SITE_CODE);
  await typeDate(page, `${ID}fromCalendarPopup_dateInput`, from);
  await typeDate(page, `${ID}toCalendarPopup_dateInput`, to);
  await redraw(page, LIST, () => button(page, 'btnApply').click());
}

async function removeIncome(page: Page, from = INCOME_DATE, to = SECOND_DATE): Promise<void> {
  await showIncome(page, to, from);
  while ((await gridRows(page, LIST)).length) {
    page.once('dialog', (d) => d.accept());
    await redraw(page, LIST, () => page.locator(`${LIST} input[id$="imgDelete"]`).first().click());
  }
}

/** A plain entry of `fives` five-dollar bills. */
async function addIncome(page: Page, date: string, fives: number): Promise<void> {
  await button(page, 'btnAdd').click();
  await expect(page).toHaveURL(/EditAdditionalIncome\.aspx/);
  await pickSiteCode(page, TEST_SITE_CODE, EDIT_SITE_PICKER);
  await typeDate(page, `${ID}calFromDate_dateInput`, date);
  await setCount(page, 'Fives', fives);
  await field(page, 'UCDenomination_txtAdditionalComments').fill(COMMENT);
  await saveNew(page);
  await cancel(page);
}

/** Saving a new entry stays on the page; Save disables and Cancel becomes Close. */
async function saveNew(page: Page): Promise<void> {
  await button(page, 'btnSave').click();
  await expect(page.getByText('Adding the Additional Income is completed successfully.').first()).toBeVisible();
  await expect(button(page, 'btnSave')).toBeDisabled();
  await expect(button(page, 'btnCancel')).toHaveValue('Close');
}

async function openEdit(page: Page): Promise<void> {
  await page.locator(`${LIST} input[id$="imgEditEntry"]`).first().click();
  await expect(page).toHaveURL(/EditAdditionalIncome\.aspx.*IsEdit=true/);
  await expect(page.locator('#ctl00_IDPageTitle')).toContainText('Additional Income Details');
}

function countRow(page: Page, name: string) {
  return page.locator('tr', { has: page.locator('input[id$="txtCount"]') }).filter({ hasText: new RegExp(`^\\s*${name}\\b`) });
}

function countBox(page: Page, name: string) {
  return countRow(page, name).locator('input[id$="txtCount"]');
}

async function setCount(page: Page, name: string, value: number): Promise<void> {
  const box = countBox(page, name);
  await box.click();
  await box.press('Control+A');
  await box.pressSequentially(String(value));
  await box.press('Tab');
  await expect(box).toHaveValue(String(value));
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
