import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import { expectButtons, expectPageTitle } from '../../../utils/screen';

// POS > Bills > Lockbox Import (/DataExchange/PaymentsImport.aspx)
const PATH = '/DataExchange/PaymentsImport.aspx';

test.describe('POS - Bills - Lockbox Import', () => {
  test('Lockbox Import screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Lockbox Import/i);
    await expectPageTitle(page, 'Lockbox Import');

    await test.step('actions', async () => {
      await expectButtons(page, [['ctl00_UserContentArea_btnUploadFile', 'Upload File']]);
    });
  });
});
