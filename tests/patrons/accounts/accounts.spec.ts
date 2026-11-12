import { test, expect, Locator, Page } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import { expectButtons, expectCaptions, expectGridColumns, expectPageTitle, expectVisible } from '../../../utils/screen';
import { LOCAL_ONLY, LOCAL_ONLY_REASON, nextTestName, TEST_PATRON_ID, TEST_SITE_CODE } from '../../../utils/testData';
import { cents, gridRows, money, postbackIdle } from '../../../utils/webforms';

// POS > Patrons > Accounts (/POS/Accounts.aspx)
const PATH = '/POS/Accounts.aspx';
const ID = 'ctl00_UserContentArea_';
const HISTORY = `#${ID}POSAccountHistory1_`;
const TRANSFER_PATRON = process.env.TRANSFER_PATRON_ID?.trim() || '18884';
const ACTIONS: [string, string][] = [
  ['btnAccountHistory', 'Transaction History ...'],
  ['btnTransferFunds', 'Transfer Funds ...'],
  ['btnBills', 'Bills ...'],
  ['btnPayments', 'Payments ...'],
  ['btnAdjustAccount', 'Adjust Account ...'],
  ['btnRefund', 'Refund ...'],
  ['btnReturnCheck', 'Return Check ...'],
  ['btnManageACH', 'Manage ACH ...'],
  ['btnStudentNotes', 'Student Notes ...'],
];

test.describe('POS - Patrons - Accounts', () => {
  test('Accounts: a patron’s card, history with a running balance, and every action opens and cancels', async ({ page }) => {
    test.setTimeout(10 * 60_000);
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Accounts/i);
    await expectPageTitle(page, 'Accounts');

    await test.step('nothing to act on until a patron is looked up', async () => {
      await expectCaptions(page, ['Site Code', 'Site']);
      await expectVisible(page, [`${ID}ucStudentLookUp_txtStudentID`]);
      await expectButtons(page, [[`${ID}ucStudentLookUp_btnStudentID`, '...'], ...ACTIONS.map(([id, label]): [string, string] => [`${ID}${id}`, label])]);
      for (const [id, label] of ACTIONS) await expect(page.locator(`#${ID}${id}`), label).toBeDisabled();
    });

    const card = await test.step('looking up a patron shows their card and opens every action', async () => {
      const card = await lookUp(page, TEST_PATRON_ID);
      expect(card.patronId).toBe(TEST_PATRON_ID);
      expect(card.site).toMatch(new RegExp(`^${TEST_SITE_CODE} - `));
      expect(card.status).toMatch(/^(Active|Inactive)$/);
      expect(card.balance).toMatch(/^-?\$[\d,]+\.\d{2}$/);
      for (const [id, label] of ACTIONS) await expect(page.locator(`#${ID}${id}`), label).toBeEnabled();
      return card;
    });

    await test.step('Transaction History: the last 30 days, newest first, with a balance that adds up', async () => {
      await openAction(page, 'btnAccountHistory');
      await expect(page.locator(`${HISTORY}ddlAccountDays option:checked`)).toHaveText('30');
      await expect(page.locator(`${HISTORY}ddlAccountDays option`)).toContainText(['30', '60', '90']);
      await expect(page.locator('#ctl00_page_content')).toContainText('Transaction History ( Last 30 Days )');
      await expect(page.locator('#ctl00_page_content')).toContainText('Use the Transaction History report to view data older than 90 days');
      await expect(page.locator('#ctl00_page_content')).toContainText('Records displayed with italics indicate an adjusted transaction.');
      const grid = page.locator('#ctl00_page_content table.rgMasterTable').first();
      const gridId = `#${await grid.getAttribute('id')}`;
      await expectGridColumns(page, gridId.slice(1), ['Transaction Date', 'Site', 'Terminal', 'User', 'Description', 'Debit', 'Credit', 'Balance']);
      const rows = await gridRows(page, gridId);
      if (!rows.length) return;
      expect(rows[0]['Balance'], 'newest balance is the card balance').toBe(card.balance);
      const since = Date.now() - 31 * 24 * 3600 * 1000;
      for (const [i, r] of rows.entries()) {
        expect(Date.parse(r['Transaction Date']), 'within 30 days').toBeGreaterThan(since);
        if (i === 0) continue;
        const newer = rows[i - 1];
        expect(Date.parse(newer['Transaction Date']), 'newest first').toBeGreaterThanOrEqual(Date.parse(r['Transaction Date']));
        expect(cents(r['Balance']), `balance before ${newer['Transaction Date']} ${newer['Description']}`).toBe(cents(newer['Balance']) + cents(newer['Debit']) - cents(newer['Credit']));
      }
      await expect(page.locator(`${HISTORY}btnAdjustTransaction`), 'nothing picked to adjust').toBeDisabled();
    });

    await test.step('Transaction History: 90 days lists at least as much', async () => {
      const grid = page.locator('#ctl00_page_content table.rgMasterTable').first();
      const before = await grid.innerText();
      const thirty = Number((await page.locator('#ctl00_page_content').innerText()).match(/(\d+) items in \d+ pages/)?.[1] ?? 0);
      await page.locator(`${HISTORY}ddlAccountDays`).selectOption('90');
      await postbackIdle(page);
      await expect.poll(() => grid.innerText()).not.toBe(before);
      await expect(page.locator('#ctl00_page_content')).toContainText('Last 90 Days');
      const ninety = Number((await page.locator('#ctl00_page_content').innerText()).match(/(\d+) items in \d+ pages/)?.[1] ?? 0);
      expect(ninety).toBeGreaterThanOrEqual(thirty);
    });

    await test.step('Transaction History: Cancel closes it', async () => {
      await expectButtons(page, [[`${ID}POSAccountHistory1_btnPrint`, 'Print']]);
      await closeAction(page, `${HISTORY}btnCancel`);
    });

    await test.step('Transfer Funds: Apply waits for the other patron', async () => {
      await openAction(page, 'btnTransferFunds');
      await expect(page.locator(`#${ID}POSTransferFunds1_txtTransferAmount`)).toHaveValue('$0.00');
      await expect(page.locator(`#${ID}POSTransferFunds1_btnApply`)).toBeDisabled();
      await expectButtons(page, [[`${ID}POSTransferFunds1_btnPrincipal`, 'Principal ...']]);
      await closeAction(page, `#${ID}POSTransferFunds1_btnCancel`);
    });

    await test.step('Bills: the patron’s bills, and Cancel', async () => {
      await openAction(page, 'btnBills');
      await closeAction(page, `#${ID}btnClose`);
    });

    await test.step('Payments: cash by default, check and card offered', async () => {
      await openAction(page, 'btnPayments');
      await expect(page.locator(`#${ID}ucMakePayment_rbtnCash`)).toBeChecked();
      await expectVisible(page, [`${ID}ucMakePayment_rbtnCheck`, `${ID}ucMakePayment_rbtnCredit`]);
      await expectButtons(page, [[`${ID}ucMakePayment_btnSubmit`, 'Submit Payment »']]);
      await closeAction(page, `#${ID}ucMakePayment_btnCancelPayment`);
    });

    await test.step('Adjust Account: Deduct by default, nothing entered yet', async () => {
      await openAction(page, 'btnAdjustAccount');
      await expect(page.locator(`#${ID}POSAdjustAccount1_rbAdjustmentType_1`)).toBeChecked();
      await expect(page.locator(`#${ID}POSAdjustAccount1_txtAdjustAmount`)).toHaveValue('$0.00');
      await closeAction(page, `#${ID}POSAdjustAccount1_btnCancel`);
    });

    await test.step('Refund: cash by default', async () => {
      await openAction(page, 'btnRefund');
      await expect(page.locator(`#${ID}POSRefundAmount1_rbtnCash`)).toBeChecked();
      await expect(page.locator(`#${ID}POSRefundAmount1_txtRefundAmount`)).toHaveValue('$0.00');
      await closeAction(page, `#${ID}POSRefundAmount1_btnCancel`);
    });

    await test.step('Return Check: blocks checks on the account by default', async () => {
      await openAction(page, 'btnReturnCheck');
      await expect(page.locator(`#${ID}POSReturnCheck1_chkNotAccept`)).toBeChecked();
      await expect(page.locator(`#${ID}POSReturnCheck1_txtCheckAmount`)).toHaveValue('$0.00');
      await closeAction(page, `#${ID}POSReturnCheck1_btnCancel`);
    });

    await test.step('Manage ACH: account and routing number boxes, Save, Remove and Close', async () => {
      await openAction(page, 'btnManageACH');
      await expectVisible(page, [`${ID}ACHAccountNumberTextBox`, `${ID}RoutingNumberTextBox`]);
      await expectButtons(page, [
        [`${ID}SaveACHButton`, 'Save'],
        [`${ID}RemoveACHButton`, 'Remove'],
      ]);
      await closeAction(page, `#${ID}CloseACHButton`);
    });

    await test.step('Student Notes: a box to add notes, and Close', async () => {
      await openAction(page, 'btnStudentNotes');
      await expectVisible(page, [`${ID}POSStudentNotes_newCommentsTextBox`]);
      await closeAction(page, `#${ID}CloseStudentNotesButton`);
    });

    await test.step('the Patron ID link opens the patron', async () => {
      await page.locator(`#${ID}studentInfoPrimary_hlinkStudentId`).click();
      await expect(page).toHaveURL(/View(Student|Staff)\.aspx/);
    });
  });

  test.fixme('Accounts: Transaction History Print opens the history', async ({ page }) => {
    await openPosPage(page, PATH);
    await lookUp(page, TEST_PATRON_ID);
    await openAction(page, 'btnAccountHistory');
    const popup = page.context().waitForEvent('page');
    await page.locator(`${HISTORY}btnPrint`).click();
    await expect.poll(async () => (await (await popup).locator('body').innerText()).length, { timeout: 60_000 }).toBeGreaterThan(50);
  });

  test.fixme('Accounts: a second transfer on the same page goes through without reloading', async ({ page }) => {
    await openPosPage(page, PATH);
    await lookUp(page, TEST_PATRON_ID);
    await transfer(page, TRANSFER_PATRON, nextTestName([]));
    await lookUp(page, TRANSFER_PATRON);
    await transfer(page, TEST_PATRON_ID, nextTestName([]));
  });

  test('Accounts: adjust, pay, refund, transfer and note on the test patron, and the balance and history follow', async ({ page }) => {
    test.skip(LOCAL_ONLY, LOCAL_ONLY_REASON);
    test.setTimeout(10 * 60_000);
    page.on('dialog', (d) => void d.accept());
    await openPosPage(page, PATH);
    let balance = cents((await lookUp(page, TEST_PATRON_ID)).balance);
    const comment = nextTestName([]);

    const expectBalance = async (change: number, description: RegExp) => {
      balance += change;
      const card = await lookUp(page, TEST_PATRON_ID);
      expect(card.balance).toBe(money(balance).replace(/^\((.*)\)$/, '-$1'));
      await openAction(page, 'btnAccountHistory');
      const grid = `#${await page.locator('#ctl00_page_content table.rgMasterTable').first().getAttribute('id')}`;
      const [newest] = await gridRows(page, grid);
      expect(newest['Description']).toMatch(description);
      expect(cents(newest['Credit']) - cents(newest['Debit'])).toBe(change);
      await closeAction(page, `${HISTORY}btnCancel`);
    };

    await test.step('Adjust Account: Add $1.00 raises the balance', async () => {
      await openAction(page, 'btnAdjustAccount');
      await page.locator(`#${ID}POSAdjustAccount1_rbAdjustmentType_0`).check();
      await typeMoney(page, `${ID}POSAdjustAccount1_txtAdjustAmount`, '1.00');
      await page.locator(`#${ID}POSAdjustAccount1_txtComment`).fill(comment);
      await page.locator(`#${ID}POSAdjustAccount1_btnApply`).click();
      await postbackIdle(page);
      await expectBalance(100, /Adjust|Bonus/i);
    });

    await test.step('Adjust Account: Deduct $1.00 brings it back', async () => {
      await openAction(page, 'btnAdjustAccount');
      await typeMoney(page, `${ID}POSAdjustAccount1_txtAdjustAmount`, '1.00');
      await page.locator(`#${ID}POSAdjustAccount1_txtComment`).fill(comment);
      await page.locator(`#${ID}POSAdjustAccount1_btnApply`).click();
      await postbackIdle(page);
      await expectBalance(-100, /Adjust|Deduct|Penalty/i);
    });

    await test.step('Payments: a $1.00 cash payment raises the balance', async () => {
      await openAction(page, 'btnPayments');
      await typeMoney(page, `${ID}ucMakePayment_rgInvoices_ctl00_ctl04_txtPayment`, '1.00');
      await page.locator(`#${ID}ucMakePayment_btnSubmit`).click();
      await postbackIdle(page);
      const confirm = page.locator('input[value="OK"], input[value*="Confirm"]').locator('visible=true').first();
      if (await confirm.count()) {
        await confirm.click();
        await postbackIdle(page);
      }
      await expectBalance(100, /Payment/i);
    });

    await test.step('Refund: a $1.00 cash refund lowers it again', async () => {
      await openAction(page, 'btnRefund');
      await typeMoney(page, `${ID}POSRefundAmount1_txtRefundAmount`, '1.00');
      await page.locator(`#${ID}POSRefundAmount1_txtComment`).fill(comment);
      await page.locator(`#${ID}POSRefundAmount1_btnApply`).click();
      await postbackIdle(page);
      await expectBalance(-100, /Refund/i);
    });

    await test.step('Transfer Funds: $1.00 to another patron and back leaves both where they were', async () => {
      const otherBefore = cents((await lookUp(page, TRANSFER_PATRON)).balance);
      await lookUp(page, TEST_PATRON_ID);
      await transfer(page, TRANSFER_PATRON, comment);
      await expectBalance(-100, /Transfer/i);
      await openPosPage(page, PATH);
      expect(cents((await lookUp(page, TRANSFER_PATRON)).balance), 'the other patron got the dollar').toBe(otherBefore + 100);
      await transfer(page, TEST_PATRON_ID, comment);
      expect(cents((await lookUp(page, TRANSFER_PATRON)).balance)).toBe(otherBefore);
      await expectBalance(100, /Transfer/i);
    });

    await test.step('Student Notes: a note is listed', async () => {
      await openAction(page, 'btnStudentNotes');
      await page.locator(`#${ID}POSStudentNotes_newCommentsTextBox`).fill(comment);
      await page.locator(`#${ID}POSStudentNotes_AddButton`).click();
      await postbackIdle(page);
      await expect(page.locator('#ctl00_page_content')).toContainText(comment);
      await closeAction(page, `#${ID}CloseStudentNotesButton`);
    });
  });
});

/** Type a patron ID, read their card. */
async function lookUp(page: Page, patronId: string) {
  const box = page.locator(`#${ID}ucStudentLookUp_txtStudentID`);
  await box.click();
  await box.press('Control+A');
  await typePatronId(page, box, patronId);
  await expect(page.locator(`#${ID}studentInfoPrimary_hlinkStudentId`)).toHaveText(patronId);
  await postbackIdle(page);
  // The card's rows read "Label:<tab>value"; a long site name wraps onto the next line.
  const text = await page.locator(`#${ID}studentInfoPrimary_hlinkStudentId`).locator('xpath=ancestor::table[1]').innerText();
  const field = (name: string) =>
    text.match(new RegExp(`${name}:\\s*([\\s\\S]*?)(?=\\n\\s*[A-Z][A-Za-z ]*:|$)`))?.[1].replace(/\s+/g, ' ').trim() ?? '';
  return { patronId: field('Patron ID'), pin: field('PIN'), site: field('Site'), status: field('Status'), balance: field('Balance') };
}

/** Type a patron ID; the suggestion list highlights a longer match, so close it before Tab. */
async function typePatronId(page: Page, box: Locator, patronId: string): Promise<void> {
  await box.pressSequentially(patronId);
  const panel = page.locator(`#${(await box.getAttribute('id'))!.replace(/txtStudentID$/, 'myPanel')}`);
  await panel.waitFor({ timeout: 5_000 }).then(() => box.press('Escape'), () => {});
  await expect(box).toHaveValue(patronId);
  await box.press('Tab');
}

async function openAction(page: Page, id: string): Promise<void> {
  await page.locator(`#${ID}${id}`).click();
  await postbackIdle(page);
  for (const [other] of ACTIONS) await expect(page.locator(`#${ID}${other}`), `${other} locked while ${id} is open`).toBeDisabled();
}

async function closeAction(page: Page, selector: string): Promise<void> {
  await page.locator(selector).click();
  await postbackIdle(page);
  for (const [other] of ACTIONS) await expect(page.locator(`#${ID}${other}`), `${other} back after closing`).toBeEnabled();
}

/** From the patron on screen: $1.00 to another patron. */
async function transfer(page: Page, to: string, comment: string): Promise<void> {
  await openAction(page, 'btnTransferFunds');
  const target = page.locator(`#${ID}POSTransferFunds1_StudentLookUp1_txtStudentID`);
  await target.click();
  await typePatronId(page, target, to);
  await postbackIdle(page);
  await expect(page.locator(`#${ID}POSTransferFunds1_btnApply`), 'Apply once there is someone to send to').toBeEnabled();
  await typeMoney(page, `${ID}POSTransferFunds1_txtTransferAmount`, '1.00');
  await page.locator(`#${ID}POSTransferFunds1_txtComment`).fill(comment);
  await postbackIdle(page);
  await page.locator(`#${ID}POSTransferFunds1_btnApply`).click();
  await expect(page.locator('body')).toContainText('Transfer Funds was successful.');
  await postbackIdle(page);
  // Sometimes the panel closes itself after a transfer and sometimes it stays open.
  const cancel = page.locator(`#${ID}POSTransferFunds1_btnCancel`);
  if (await cancel.isVisible()) await closeAction(page, `#${ID}POSTransferFunds1_btnCancel`);
}

async function typeMoney(page: Page, id: string, value: string): Promise<void> {
  const box = page.locator(`#${id}`);
  await box.click();
  await box.press('Control+A');
  await box.pressSequentially(value);
  await box.press('Tab');
  await expect(box).toHaveValue(new RegExp(`^\\$?${value.replace('.', '\\.')}$`));
  await postbackIdle(page);
}
