import { test, expect, Page } from '@playwright/test';
import { expressPointInstalled } from '../../../utils/expresspoint/launch';
import { DEFAULT_PATRON_ID, recordChargedSession, RecordedSession } from '../../../utils/expresspoint/session';
import { apply, cents, filterToday, money, openReconcile, sessionRows, showStatus, siteValue } from './_reconciliation_page';
import {
  button,
  closeDialog,
  countedDenominations,
  denomination,
  dialogFrame,
  expectNoOpenDialog,
  header,
  history,
  label,
  openTab,
  summary,
  transactions,
} from './_reconciliation_info_page';

const ADJUST_COMMENT = 'Sabih-automation testing';
// A session already recorded today (the "session" annotation of an earlier run), to re-check without ExpressPoint.
const REUSED_SESSION = process.env.EXPRESSPOINT_SESSION?.trim();

// POS > Administration > Reconciliation, checked against a session rung up on ExpressPoint.
test.describe('POS - Administration - Reconciliation - ExpressPoint session', () => {
  test.skip(!expressPointInstalled() && !REUSED_SESSION, 'ExpressPoint desktop app is not installed on this machine');
  test.describe.configure({ timeout: 10 * 60_000 });

  test('a session closed on ExpressPoint reconciles end to end', async ({ page }) => {
    const session: RecordedSession & { openingDate?: string } = REUSED_SESSION
      ? JSON.parse(REUSED_SESSION)
      : await test.step('ExpressPoint: open service, charge a sale, close service', () => recordChargedSession());
    test.info().annotations.push({ type: 'session', description: JSON.stringify(session) });

    // "103 - BLUEFIELD ELEMENTRY SCHOOL_CHILD CARE" -> code and site name.
    const [, siteCode, siteName] = session.site.match(/^(\S+)\s*-\s*(.+)$/) ?? [];
    expect(siteCode, `site code from "${session.site}"`).toBeTruthy();
    const opening = cents(session.openingBalance);
    const closing = cents(session.closingBalance);
    const sale = cents(`$${session.sale.total}`);
    // A charged sale takes no cash, so over/under is closing minus opening.
    const overUnder = money(closing - opening);

    const row = await test.step('Sessions grid: the new session, newest first', async () => {
      await filterToday(page, siteCode, siteName);
      expect(await siteValue(page), 'site follows the site code').toMatch(new RegExp(`^${escape(siteName)}$`, 'i'));

      const match = (await sessionRows(page)).find(
        (r) => r.terminal === session.terminal && (!REUSED_SESSION || r.openingDate === session.openingDate),
      );
      expect(match, `a session today on terminal ${session.terminal}`).toBeDefined();
      expect(match!.openingBalance, 'opening balance').toBe(session.openingBalance);
      expect(match!.closingBalance, 'closing balance').toBe(session.closingBalance);
      expect(match!.status, 'status').toBe('Closed');
      expect(match!.overUnder, 'over/under').toBe(overUnder);
      return match!;
    });

    await test.step('View Session: totals, from the same grid', async () => {
      await page
        .locator('#ctl00_UserContentArea_gridSessions_ctl00 > tbody > tr')
        .filter({ hasText: row.openingDate })
        .locator('input[title^="View Session"]')
        .click();
      const frame = await dialogFrame(page, /ViewSession\.aspx/i);
      const text = async () => (await frame.locator('body').innerText()).replace(/\s+/g, ' ');
      await expect.poll(text, { message: 'View Session loaded' }).toContain(`Opening Balance ${session.openingBalance}`);
      const view = await text();
      expect(view).toContain(`Cashier ${row.cashier}`);
      expect(view).toContain(`Opening Session Date/Time ${row.openingDate}`);
      expect(view).toContain(`Total Sales ${money(sale)}`);
      expect(view).toContain(`DEBIT ${money(sale)}`);
      await closeDialog(page);
    });

    await test.step('Reconciliation Info: session details', async () => {
      await openReconcile(page, row.openingDate);
      const details = await header(page);
      expect(details).toEqual({
        cashier: row.cashier,
        terminal: session.terminal,
        openingDate: row.openingDate,
        openingBalance: session.openingBalance,
        closingDate: expect.stringMatching(/^\d+\/\d+\/\d{4} \d+:\d{2}:\d{2} [AP]M$/),
        closingBalance: session.closingBalance,
      });
      expect(Date.parse(details.closingDate), 'closed after it opened').toBeGreaterThan(Date.parse(row.openingDate));
    });

    await test.step('Move controls offer other sites, not this one', async () => {
      const sites = (await label(page, 'ddlSite').locator('option').allInnerTexts()).map((o) => o.trim().toLowerCase());
      expect(sites[0]).toBe('-- select --');
      expect(sites.length, 'other sites to move to').toBeGreaterThan(1);
      expect(sites, 'the session’s own site').not.toContain(siteName.toLowerCase());
      await expect(label(page, 'ddlTerminal')).toBeVisible();
      for (const id of ['btnMoveSession', 'btnMoveDate']) await expect(button(page, id)).toBeVisible();
      await expect(label(page, 'rdtChangeSessionDates_dateInput')).toHaveValue('');
    });

    await test.step('Summary: cashier counted vs system expected', async () => {
      expect(await summary(page)).toEqual({
        cash: { cashier: session.closingBalance, system: session.openingBalance, overUnder },
        checks: { cashier: '$0.00', system: '$0.00', overUnder: '$0.00' },
        cards: { cashier: '$0.00', system: '$0.00', overUnder: '$0.00' },
        adjusted: '$0.00',
        total: { cashier: session.closingBalance, system: session.openingBalance, overUnder },
        message: expect.stringContaining('This session is not balanced.'),
      });
      await expect(button(page, 'btnOk'), 'Reconcile Session before balancing').toBeDisabled();
      await expect(button(page, 'btnAdjustDifference')).toBeEnabled();
    });

    await test.step('Opening balance details: the bills counted on ExpressPoint', async () => {
      await button(page, 'btnOpeningBalance').click();
      const frame = await dialogFrame(page, /OpenPOS\.aspx/i);
      await expect(frame.locator('body')).toContainText('Denominations');
      expect(await countedDenominations(frame)).toEqual(['Ones']);
      expect(await denomination(frame, 'Ones')).toEqual({ count: String(opening / 100), total: session.openingBalance });
      await button(frame, 'btnCancel').click();
      await expectNoOpenDialog(page);
    });

    await test.step('Closing balance details: counts, totals and net receipts', async () => {
      await button(page, 'btnClosingBalance').click();
      const frame = await dialogFrame(page, /ClosePOS\.aspx/i);
      expect(await countedDenominations(frame)).toEqual(['Ones']);
      expect(await denomination(frame, 'Ones')).toEqual({ count: String(closing / 100), total: session.closingBalance });
      const total = (id: string) => label(frame, `UCDenomination_${id}`);
      await expect(total('txtCash')).toHaveValue(session.closingBalance);
      await expect(total('txtCheck')).toHaveValue('$0.00');
      await expect(total('txtCard')).toHaveValue('$0.00');
      await expect(total('txtTotalClosing')).toHaveValue(session.closingBalance);
      await expect(total('lblOpeningBalance')).toHaveText(session.openingBalance);
      await expect(total('txtNetReceipts')).toHaveValue(overUnder);
      for (const id of ['txtCash', 'txtCheck', 'txtCard', 'txtTotalClosing', 'txtNetReceipts']) {
        await expect(total(id), `${id} is calculated, not typed`).toBeDisabled();
      }
      await button(frame, 'btnCancel').click();
      await expectNoOpenDialog(page);
    });

    await test.step('Transactions: the charged sale', async () => {
      const rows = await transactions(page);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        'Patron ID': DEFAULT_PATRON_ID,
        Type: 'DEBIT',
        'Sale Amt': money(sale),
        'Payment Amt': '$0.00',
      });
      expect(Date.parse(rows[0]['Transaction Date']), 'sold while the session was open').toBeGreaterThanOrEqual(
        Date.parse(row.openingDate),
      );
    });

    await test.step('Bulk Adjustments: this session, no comments yet', async () => {
      const view = await openTab(page, 'Bulk Adjustments');
      await expect(view).toContainText(siteName, { ignoreCase: true });
      await expect(view).toContainText(session.terminal);
      await expect(view).toContainText(row.openingDate.split(' ')[0]);
      await expect(view).toContainText(row.cashier);
      await expect(view).toContainText('No comment history.');
    });

    await test.step('History: opened then closed on this terminal', async () => {
      const rows = await history(page);
      expect(rows.map((r) => r['Status'])).toEqual(['Closed', 'Opened']);
      for (const r of rows) {
        expect(r).toMatchObject({ Terminal: session.terminal, 'Updated By': row.cashier });
        expect(r['School'].toLowerCase()).toBe(siteName.toLowerCase());
      }
      await openTab(page, 'Summary');
    });

    await test.step('Session Report: every item rung up on ExpressPoint', async () => {
      const report = await openSessionReport(page);
      const text = (await report.locator('body').innerText()).replace(/\s+/g, ' ');
      expect(text).toContain(`Terminal: ${session.terminal}`);
      expect(text.toLowerCase()).toContain(`serving site: ${siteCode} ${siteName}`.toLowerCase());
      for (const line of session.sale.lines) {
        expect(text, `report line for ${line.name}`).toMatch(new RegExp(`${escape(line.name)} \\S+ \\d+ ${escape(line.amount)}`));
      }
      expect(text).toMatch(new RegExp(`Session Total \\d+ ${escape(session.sale.total)}`));
      await report.close();
    });

    await test.step('Adjust Session: cashier and amount are fixed, a comment is required', async () => {
      const frame = await openAdjust(page);
      await expect(label(frame, 'lblCashier')).toHaveText(row.cashier);
      await expect(label(frame, 'lblAdjustAmount')).toHaveText(overUnder);
      await expect(frame.locator('input[type="text"], select, textarea'), 'only the comment can be typed').toHaveCount(1);
      await expect(label(frame, 'txtComments')).toBeEditable();

      await button(frame, 'btnOk').click();
      await expect(label(frame, 'rfvalComments'), 'comment required').toBeVisible();

      await label(frame, 'txtComments').fill(`${ADJUST_COMMENT} - cancelled`);
      await button(frame, 'btnCancel').click();
      await expectNoOpenDialog(page);
      await expect(label(page, 'lblAdjustedAmount'), 'cancel saves nothing').toHaveText('$0.00');
      await expect(button(page, 'btnOk')).toBeDisabled();
    });

    await test.step('Adjust Session: OK balances the session', async () => {
      const frame = await openAdjust(page);
      await label(frame, 'txtComments').fill(ADJUST_COMMENT);
      await button(frame, 'btnOk').click();
      await expectNoOpenDialog(page);
      await expect(label(page, 'lblAdjustedAmount')).toHaveText(overUnder);
      expect(await summary(page)).toMatchObject({
        cash: { cashier: session.closingBalance, system: session.openingBalance, overUnder },
        adjusted: overUnder,
        total: { cashier: session.closingBalance, system: session.openingBalance, overUnder: '$0.00' },
        message: 'This session is balanced and ready to be reconciled.',
      });
      await expect(button(page, 'btnOk'), 'Reconcile Session once balanced').toBeEnabled();
    });

    await test.step('Reconcile Session', async () => {
      await button(page, 'btnOk').click();
      await expect(label(page, 'lblMessageBox')).toHaveText(/This session is reconciled\./);
      await expect(button(page, 'btnAdjustDifference'), 'no more adjusting').toBeDisabled();
      // The History tab keeps what it loaded earlier until the page reloads.
      await page.reload();
      const rows = await history(page);
      expect(rows.map((r) => r['Status'])).toEqual(['Reconciled', 'Closed', 'Opened']);
      expect(rows[0]['Updated By']).toBe(row.cashier);
    });

    await test.step('Sessions grid: reconciled, and hidden unless Reconciled is ticked', async () => {
      await filterToday(page, siteCode, siteName, ['Reconciled']);
      const reconciled = (await sessionRows(page)).find((r) => r.openingDate === row.openingDate);
      expect(reconciled, 'listed with Reconciled ticked').toMatchObject({ status: 'Reconciled', overUnder });
      await showStatus(page, 'Reconciled', false);
      await apply(page);
      expect((await sessionRows(page)).map((r) => r.openingDate), 'not listed by default').not.toContain(row.openingDate);
    });
  });
});

async function openAdjust(page: Page) {
  await button(page, 'btnAdjustDifference').click();
  // The dialog can take a long time to load.
  const frame = await dialogFrame(page, /MakeAdjustment\.aspx/i);
  await expect(button(frame, 'btnOk')).toBeVisible({ timeout: 60_000 });
  return frame;
}

async function openSessionReport(page: Page) {
  const popup = page.context().waitForEvent('page');
  await button(page, 'ReportCaller1_rptRetriever').click();
  const report = await popup;
  await expect
    .poll(async () => (await report.locator('body').innerText().catch(() => '')).includes('Session Total'), {
      message: 'session report rendered',
      timeout: 60_000,
    })
    .toBe(true);
  return report;
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
