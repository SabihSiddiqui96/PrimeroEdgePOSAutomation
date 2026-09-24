import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Management > FSMC Mapping (/System/ManagementMapping.aspx)
const PATH = '/System/ManagementMapping.aspx';

test.describe('POS - Management - FSMC Mapping', () => {
  test('FSMC Mapping screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - FSMC Mapping/i);
    await expectPageTitle(page, 'FSMC Mapping');

    await test.step('tabs and fields', async () => {
      await expectCaptions(page, [
        'General',
        'Sites',
        'Programs',
        'Tiered Pricing',
        'Unit Number :',
        'Vendor Code:',
        'Capture Student Worker Meals?',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_txtUnitNumber',
        'ctl00_UserContentArea_txtVendorCode',
        'ctl00_UserContentArea_rbtStudentWorkerMeals_0',
        'ctl00_UserContentArea_rbtStudentWorkerMeals_1',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [['ctl00_UserContentArea_btnSave', 'Save']]);
    });
  });
});
