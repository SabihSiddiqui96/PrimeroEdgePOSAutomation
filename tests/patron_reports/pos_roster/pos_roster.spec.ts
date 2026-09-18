import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectHasOptions,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Patron Reports > POS Roster (/POS/StudentRoster.aspx)
const PATH = '/POS/StudentRoster.aspx';

test.describe('POS - Patron Reports - POS Roster', () => {
  test('POS Roster screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - POS Roster/i);
    await expectPageTitle(page, 'POS Roster');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Site Code',
        'Site',
        'Special Roster',
        'Patron Criteria',
        'Students',
        'Active',
        'Inactive',
        'All',
        'Free',
        'Reduced',
        'Paid',
        'Adults',
        'Adult',
        'Staff/Teacher',
        'Program Adult',
        'Report Options',
        'Portrait',
        'Landscape',
        'Standard',
        'Barcode',
        'Weekly',
        'Weekly Barcode',
        'Status',
        'Balance',
        'Contact Info',
        'Special Instructions or Allergens',
        'Age',
        'DOB',
        'Homeroom',
        'Alphabetical',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_StudentOptionCheckBox',
        'ctl00_UserContentArea_rbStudentActive',
        'ctl00_UserContentArea_rbStudentInactive',
        'ctl00_UserContentArea_rbStudentAll',
        'ctl00_UserContentArea_chkStudentPriceTypeList_0',
        'ctl00_UserContentArea_chkStudentPriceTypeList_1',
        'ctl00_UserContentArea_chkStudentPriceTypeList_2',
        'ctl00_UserContentArea_AdultOptionCheckBox',
        'ctl00_UserContentArea_rbAdultActive',
        'ctl00_UserContentArea_rbAdultInactive',
        'ctl00_UserContentArea_rbAdultAll',
        'ctl00_UserContentArea_adultCheckBox',
        'ctl00_UserContentArea_staffCheckBox',
        'ctl00_UserContentArea_programadultCheckBox',
        'ctl00_UserContentArea_rdbPortrait',
        'ctl00_UserContentArea_rdbLandscape',
        'ctl00_UserContentArea_stdRadioButton',
        'ctl00_UserContentArea_barcodeRadioButton',
        'ctl00_UserContentArea_weeklyRadioButton',
        'ctl00_UserContentArea_weeklyBarcodeRadioButton',
        'ctl00_UserContentArea_statusCheckBox',
        'ctl00_UserContentArea_balanceCheckBox',
        'ctl00_UserContentArea_contactInfoCheckBox',
        'ctl00_UserContentArea_onlySpeInsCheckBox',
        'ctl00_UserContentArea_isSpecInstrucOrAllegCheckBox',
        'ctl00_UserContentArea_studentAge',
        'ctl00_UserContentArea_studentDOB',
        'ctl00_UserContentArea_homeRoomGroupByCheckBox',
        'ctl00_UserContentArea_alphaRadioButton',
        'ctl00_UserContentArea_pinRadioButton',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_ucGradeSelector_rcbGrades_Input',
      ]);
      await expectHasOptions(page, 'ctl00_UserContentArea_ddlSpecialRoster');
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_studentRosterReportCaller_rptRetriever', 'Generate Report'],
      ]);
    });
  });
});
