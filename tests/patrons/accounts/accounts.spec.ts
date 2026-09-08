import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Patrons > Accounts (/POS/Accounts.aspx)
const PATH = '/POS/Accounts.aspx';

test.describe('POS - Patrons - Accounts', () => {
  test('Accounts screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Accounts/i);
    await expectPageTitle(page, 'Accounts');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, ['Site Code', 'Site']);
      await expectVisible(page, ['ctl00_UserContentArea_ucStudentLookUp_txtStudentID']);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_ucStudentLookUp_btnStudentID', '...'],
        ['ctl00_UserContentArea_btnAccountHistory', 'Transaction History ...'],
        ['ctl00_UserContentArea_btnTransferFunds', 'Transfer Funds ...'],
        ['ctl00_UserContentArea_btnBills', 'Bills ...'],
        ['ctl00_UserContentArea_btnPayments', 'Payments ...'],
        ['ctl00_UserContentArea_btnAdjustAccount', 'Adjust Account ...'],
        ['ctl00_UserContentArea_btnRefund', 'Refund ...'],
        ['ctl00_UserContentArea_btnReturnCheck', 'Return Check ...'],
        ['ctl00_UserContentArea_btnManageACH', 'Manage ACH ...'],
        ['ctl00_UserContentArea_btnStudentNotes', 'Student Notes ...'],
      ]);
    });
  });
});
