import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import { expectButtons, expectPageTitle } from '../../../utils/screen';

// POS > Bills > Payments Import (/DataExchange/FloridaPaymentsImport.aspx)
const PATH = '/DataExchange/FloridaPaymentsImport.aspx';

test.describe('POS - Bills - Payments Import', () => {
  test('Payments Import screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Payments Import/i);
    await expectPageTitle(page, 'Payments Import');

    await test.step('actions', async () => {
      await expectButtons(page, [['ctl00_UserContentArea_btnUploadFile', 'Upload File']]);
    });
  });
});
