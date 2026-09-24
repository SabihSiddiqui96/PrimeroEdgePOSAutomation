import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import { expectButtons, expectCaptions, expectPageTitle } from '../../../utils/screen';

// POS > Management > Payments Import (/DataExchange/PaymentsImportV1.aspx)
const PATH = '/DataExchange/PaymentsImportV1.aspx';

test.describe('POS - Management - Payments Import', () => {
  test('Payments Import screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Payments Import/i);
    await expectPageTitle(page, 'Payments Import');

    await test.step('notes', async () => {
      await expectCaptions(page, ['Notes']);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_ucUploadFile_btnUploadFile', 'Select a Payment Import File'],
      ]);
    });
  });
});
