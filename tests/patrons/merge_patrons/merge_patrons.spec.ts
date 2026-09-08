import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Patrons > Merge Patrons (/System/MergeStudents.aspx)
const PATH = '/System/MergeStudents.aspx';

test.describe('POS - Patrons - Merge Patrons', () => {
  test('Merge Patrons screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Merge Patrons/i);
    await expectPageTitle(page, 'Merge Patrons');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Original Patron',
        'Use this status',
        'Is Active',
        'Duplicate Patron',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_rbOrStatus',
        'ctl00_UserContentArea_chkorIsActive',
        'ctl00_UserContentArea_rbDStatus',
        'ctl00_UserContentArea_chkDIsActive',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_btnOrLookup', 'Lookup'],
        ['ctl00_UserContentArea_btnDLookup', 'Lookup'],
        ['ctl00_UserContentArea_btnCancel', 'Cancel'],
        ['ctl00_UserContentArea_btnMerege', 'Merge'],
      ]);
    });
  });
});
