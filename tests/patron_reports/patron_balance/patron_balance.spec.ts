import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Patron Reports > Patron Balance (/POS/StudentBalanceReport.aspx)
const PATH = '/POS/StudentBalanceReport.aspx';

test.describe('POS - Patron Reports - Patron Balance', () => {
  test('Patron Balance screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Patron Balance/i);
    await expectPageTitle(page, 'Patron Balance');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Site Code',
        'Site',
        'Patron Criteria',
        'Students',
        'Active',
        'Inactive',
        'All',
        'Free',
        'Reduced',
        'Paid',
        'Adults',
        'Staff',
        'Prog Adult',
        'Balance Criteria',
        'Below',
        'Between',
        'Above',
        'All Balances',
        'Balance Below:',
        'Exclude $0.00',
        'Exclude No Charge',
        'Report Options',
        'Contact Info',
        'Eligibility Status',
        'Alphabetical',
        'Homeroom',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_StudentCheckBox',
        'ctl00_UserContentArea_rbStudentActive',
        'ctl00_UserContentArea_rbStudentInactive',
        'ctl00_UserContentArea_rbStudentAll',
        'ctl00_UserContentArea_chkStudentPriceTypeList_0',
        'ctl00_UserContentArea_chkStudentPriceTypeList_1',
        'ctl00_UserContentArea_chkStudentPriceTypeList_2',
        'ctl00_UserContentArea_AdultCheckBox',
        'ctl00_UserContentArea_rbAdultActive',
        'ctl00_UserContentArea_rbAdultInactive',
        'ctl00_UserContentArea_rbAdultAll',
        'ctl00_UserContentArea_chkAdultPriceTypeList_0',
        'ctl00_UserContentArea_chkAdultPriceTypeList_1',
        'ctl00_UserContentArea_rdlBalance_0',
        'ctl00_UserContentArea_rdlBalance_1',
        'ctl00_UserContentArea_rdlBalance_2',
        'ctl00_UserContentArea_rdlBalance_3',
        'ctl00_UserContentArea_ExcludeZeroCheckBox',
        'ctl00_UserContentArea_ExcludeNoChargeCheckBox',
        'ctl00_UserContentArea_cbContactInfo',
        'ctl00_UserContentArea_cbShowEligibilityStatus',
        'ctl00_UserContentArea_GroupbySchoolCheckBox',
        'ctl00_UserContentArea_AlphabeticalRadioButton',
        'ctl00_UserContentArea_HomeRoomRadioButton',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_ucGradeSelector_rcbGrades_Input',
        'ctl00_UserContentArea_txtBalanceBelow1',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_ReportCaller1_rptRetriever', 'Generate Report'],
      ]);
    });
  });
});
