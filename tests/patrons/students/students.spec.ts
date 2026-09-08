import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Patrons > Students (/POS/ManageStudents.aspx)
const PATH = '/POS/ManageStudents.aspx';

test.describe('POS - Patrons - Students', () => {
  test('Students screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Students/i);
    await expectPageTitle(page, 'Students');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Site Code',
        'Site',
        'ID Only',
        'PIN',
        'State ID',
        'Last Name',
        'First Name',
        'Preferred Name',
        'Status',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_ManageStudents1_txtLastName',
        'ctl00_UserContentArea_ManageStudents1_txtFirstName',
        'ctl00_UserContentArea_ManageStudents1_txtPreferredName',
        'ctl00_UserContentArea_ManageStudents1_txtStudentId',
        'ctl00_UserContentArea_ManageStudents1_rblStudentIdSSNPinStateId_0',
        'ctl00_UserContentArea_ManageStudents1_rblStudentIdSSNPinStateId_1',
        'ctl00_UserContentArea_ManageStudents1_rblStudentIdSSNPinStateId_2',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ManageStudents1_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ManageStudents1_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_ManageStudents1_ucGradeSelector_rcbGrades_Input',
        'ctl00_UserContentArea_ManageStudents1_txtBirthDate',
        'ctl00_UserContentArea_ManageStudents1_ddlActive_Input',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_ManageStudents1_btnApply', 'Apply'],
        ['ctl00_UserContentArea_ManageStudents1_btnReset', 'Reset'],
        ['ctl00_UserContentArea_ManageStudents1_btnExport', 'Export'],
        ['ctl00_UserContentArea_ManageStudents1_btnAddNew', 'Add ...'],
      ]);
    });
  });
});
