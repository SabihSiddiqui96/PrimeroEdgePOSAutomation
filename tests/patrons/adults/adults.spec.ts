import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Patrons > Adults (/POS/ManageStaff.aspx)
const PATH = '/POS/ManageStaff.aspx';

test.describe('POS - Patrons - Adults', () => {
  test('Adults screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Adults/i);
    await expectPageTitle(page, 'Adults');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Site Code',
        'Site',
        'ID',
        'PIN',
        'Last Name',
        'First Name',
        'Adult ID',
        'Person Type',
        'Status',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_ManageStaff1_txtLastName',
        'ctl00_UserContentArea_ManageStaff1_txtFirstName',
        'ctl00_UserContentArea_ManageStaff1_txtStudentId',
        'ctl00_UserContentArea_ManageStaff1_rblStudentIdSSNPinStateId_0',
        'ctl00_UserContentArea_ManageStaff1_rblStudentIdSSNPinStateId_1',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ManageStaff1_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ManageStaff1_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_ManageStaff1_ddlPersonType_Input',
        'ctl00_UserContentArea_ManageStaff1_ddlActive_Input',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_ManageStaff1_btnApply', 'Apply'],
        ['ctl00_UserContentArea_ManageStaff1_btnReset', 'Reset'],
        ['ctl00_UserContentArea_ManageStaff1_btnImport', 'Import'],
        ['ctl00_UserContentArea_ManageStaff1_btnAddNew', 'Add ...'],
      ]);
    });
  });
});
