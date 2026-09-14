import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Bills > Quick Payments (/POS/MakePaymentLight.aspx)
const PATH = '/POS/MakePaymentLight.aspx';

test.describe('POS - Bills - Quick Payments', () => {
  test('Quick Payments screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Quick Payments/i);
    await expectPageTitle(page, 'Quick Payments');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, ['Site Code', 'Site', 'Cash', 'Check', 'Card']);
      await expectVisible(page, [
        'ctl00_UserContentArea_ucPayments_ucLookUp_txtStudentID',
        'ctl00_UserContentArea_ucPayments_txtPaymentAmount',
        'ctl00_UserContentArea_ucPayments_txtCheckNumber',
        'ctl00_UserContentArea_ucPayments_txtCardNumber',
        'ctl00_UserContentArea_ucPayments_rbtnCash',
        'ctl00_UserContentArea_ucPayments_rbtnCheck',
        'ctl00_UserContentArea_ucPayments_rbtnCredit',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucPayments_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucPayments_ucAreaSiteSelector_rcbSite_Input',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_ucPayments_ucLookUp_btnStudentID', '...'],
        ['ctl00_UserContentArea_ucPayments_btnMakePayment', 'Make Payment'],
      ]);
    });
  });
});
