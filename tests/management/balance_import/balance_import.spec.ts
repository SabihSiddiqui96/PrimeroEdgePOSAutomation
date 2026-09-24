import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Management > Balance Import (/DataExchange/BalanceImport.aspx)
const PATH = '/DataExchange/BalanceImport.aspx';

test.describe('POS - Management - Balance Import', () => {
  test('Balance Import screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Balance Import/i);
    await expectPageTitle(page, 'Balance Import');

    await test.step('options', async () => {
      await expectCaptions(page, [
        'Balance Type :',
        'Student',
        'Adult',
        'Please import a Tab-Delimited File only',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_rblType_0',
        'ctl00_UserContentArea_rblType_1',
        'ctl00_UserContentArea_rbnZeroBalImport_0',
        'ctl00_UserContentArea_rbnZeroBalImport_1',
        'ctl00_UserContentArea_rbnPreviousBalImport_0',
        'ctl00_UserContentArea_rbnPreviousBalImport_1',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_ucUploadFile_btnUploadFile', 'Upload File'],
      ]);
    });
  });
});
