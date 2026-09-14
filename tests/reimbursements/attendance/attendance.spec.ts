import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Reimbursements > Attendance (/POS/ManageAttendanceFactor.aspx)
const PATH = '/POS/ManageAttendanceFactor.aspx';

test.describe('POS - Reimbursements - Attendance', () => {
  test('Attendance screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Attendance/i);
    await expectPageTitle(page, 'Attendance');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Site Code',
        'Site',
        'Academic Year',
        'Weekly',
        'Monthly',
        'Yearly',
        'District',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_rbtnlistTerm_0',
        'ctl00_UserContentArea_rbtnlistTerm_1',
        'ctl00_UserContentArea_rbtnlistTerm_2',
        'ctl00_UserContentArea_rbtnlistRegion_0',
        'ctl00_UserContentArea_rbtnlistRegion_1',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_academicYearDropDownList_Input',
        'ctl00_UserContentArea_rcbQuarterly_Input',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_btnApply', 'Apply'],
        ['ctl00_UserContentArea_btnCancel', 'Cancel'],
        ['ctl00_UserContentArea_btnSave', 'Save'],
      ]);
    });
  });
});
