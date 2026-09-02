import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectGridColumns,
  expectGridResolved,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Administration > Deposit Slip (/POS/DepositSlip.aspx)
const PATH = '/POS/DepositSlip.aspx';

test.describe('POS - Administration - Deposit Slip', () => {
  test('Deposit Slip screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/Deposit Slip/i);
    await expectPageTitle(page, 'Deposit Slip');

    await test.step('site and search-by filters', async () => {
      await expectCaptions(page, [
        'Site Code',
        'Site',
        'Search By',
        'Date Range',
        'Deposit Slip No.',
        'From',
        'To',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_rbDateRange',
        'ctl00_UserContentArea_radDepositSlipNo',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_calFromDate_dateInput',
        'ctl00_UserContentArea_calToDate_dateInput',
      ]);
    });

    await test.step('status filters', async () => {
      await expectCaptions(page, ['Active', 'InActive']);
      await expectVisible(page, [
        'ctl00_UserContentArea_chkbActive',
        'ctl00_UserContentArea_chkbInActive',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_btnApply', 'Apply'],
        ['ctl00_UserContentArea_btnAdd', 'Add ...'],
      ]);
    });

    await test.step('deposit slips grid', async () => {
      await expectGridColumns(page, 'ctl00_UserContentArea_gridDepositSlip_ctl00', [
        'Deposit Slip No.',
        'Site',
        'Deposit Date',
        'Deposit Amount',
        'Deposited By',
      ]);
      await expectGridResolved(page, 'ctl00_UserContentArea_gridDepositSlip_ctl00');
    });
  });
});
