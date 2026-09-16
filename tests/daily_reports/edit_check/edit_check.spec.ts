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

// POS > Daily Reports > Edit Check (/POS/EditCheckInput.aspx)
const PATH = '/POS/EditCheckInput.aspx';

test.describe('POS - Daily Reports - Edit Check', () => {
  test('Edit Check screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Edit Check/i);
    await expectPageTitle(page, 'Edit Check');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Reporting Group',
        'Site Type',
        'Site Code',
        'Site',
        'Date Range',
        'Daily',
        'From:',
        'Monthly',
        'Month:',
        'Year:',
        'To:',
        'Programs',
        'Meal Type',
        'Report Options',
        'Exceptions Only',
        'Exclude Non-Serving Days',
        'Include Site Name',
        'Include CEP details for non-CEP Sites',
        'Provision Sites Only',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_BasicReportInput1_dailyRadioButton',
        'ctl00_UserContentArea_BasicReportInput1_monthlyRadioButton',
        'ctl00_UserContentArea_BasicReportInput1_dateRangeRadioButton',
        'ctl00_UserContentArea_chkExceptions',
        'ctl00_UserContentArea_chkExcludeNonServingDays',
        'ctl00_UserContentArea_chkIncludeSiteHeader',
        'ctl00_UserContentArea_chkIncludeSatelliteSite',
        'ctl00_UserContentArea_chkIncludeCEPdetails',
        'ctl00_UserContentArea_chkProvisionSitesOnly',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucReportingGroupSelector_rcbReportingGroup_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteType_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_BasicReportInput1_dailyCalendarPopup_dateInput',
        'ctl00_UserContentArea_BasicReportInput1_fromCalendarPopup_dateInput',
        'ctl00_UserContentArea_BasicReportInput1_toCalendarPopup_dateInput',
      ]);
      await expectHasOptions(page, 'ctl00_UserContentArea_BasicReportInput1_monthlyDropDownList');
      await expectHasOptions(page, 'ctl00_UserContentArea_BasicReportInput1_yearDropDownList');
      await expectHasOptions(page, 'ctl00_UserContentArea_ddlProgram');
      await expectHasOptions(page, 'ctl00_UserContentArea_mealTypeDropDownList');
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_ReportCaller1_rptRetriever', 'Generate Report'],
      ]);
    });
  });
});
