import { test, expect } from '@playwright/test';
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

// POS > Administration > Reconciliation (/POS/Reconciliation.aspx)
const PATH = '/POS/Reconciliation.aspx';

test.describe('POS - Administration - Reconciliation', () => {
  test('Reconciliation screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/Reconciliation/i);
    await expectPageTitle(page, 'Reconciliation');

    await test.step('search filters', async () => {
      await expectCaptions(page, [
        'Site Code',
        'Site',
        'From',
        'To',
        'Entry Type',
        'Terminal Name',
        'Cashier',
        'Meal Type',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_txtTerminalname',
        'ctl00_UserContentArea_txtCashier',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_calFromDate_dateInput',
        'ctl00_UserContentArea_calToDate_dateInput',
      ]);
      await expectHasOptions(page, 'ctl00_UserContentArea_ddlEntrymethod');
      await expectHasOptions(page, 'ctl00_UserContentArea_ddlMealType');
    });

    await test.step('session status checkboxes', async () => {
      await expectCaptions(page, [
        'Session Status',
        'Initialized',
        'Opened',
        'Closed',
        'Reconciled',
        'Deposited',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_chkSessionStatus_0',
        'ctl00_UserContentArea_chkSessionStatus_1',
        'ctl00_UserContentArea_chkSessionStatus_2',
        'ctl00_UserContentArea_chkSessionStatus_3',
        'ctl00_UserContentArea_chkSessionStatus_4',
      ]);
    });

    await test.step('report options', async () => {
      await expectCaptions(page, [
        'Check for Duplicate Meals',
        'Check for Empty Sessions',
        'Show Credit Card Column',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_chkDuplicateMeals',
        'ctl00_UserContentArea_chkEmptySessions',
        'ctl00_UserContentArea_chkShowCreditCard',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_btnApply', 'Apply'],
        ['ctl00_UserContentArea_btnDeleteSelected', 'Delete Selected'],
        ['ctl00_UserContentArea_btnAutoReconcile', 'Auto Reconcile'],
        ['ctl00_UserContentArea_btnDepositSlip', 'Deposit Slip ...'],
      ]);
    });

    await test.step('sessions grid', async () => {
      await expectGridColumns(page, 'ctl00_UserContentArea_gridSessions_ctl00', [
        'EntryType',
        'Terminal',
        'Cashier',
        'Meal Type',
        'Opening Balance',
        'Opening Date',
        'Closing Balance',
        'Credit Card',
        'Closing Date',
        'Status',
        'Over/Under',
        'A/R',
      ]);
      await expectGridResolved(page, 'ctl00_UserContentArea_gridSessions_ctl00');
    });
  });
});
