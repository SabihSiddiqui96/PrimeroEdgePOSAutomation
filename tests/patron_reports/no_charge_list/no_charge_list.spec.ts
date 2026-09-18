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

// POS > Patron Reports > No Charge List (/POS/NoChargeListReport.aspx)
const PATH = '/POS/NoChargeListReport.aspx';

test.describe('POS - Patron Reports - No Charge List', () => {
  test('No Charge List screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - No Charge List/i);
    await expectPageTitle(page, 'No Charge List');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Site Code',
        'Site',
        'Date Range',
        'Daily',
        'From:',
        'Monthly',
        'Month:',
        'Year:',
        'To:',
        'Criteria',
        'Include Inactive',
        'No Charge Reason',
        'Report Options',
        'Sale',
        'Payments',
        'Contact Info',
        'Alphabetical',
        'Homeroom',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_BasicReportInput1_dailyRadioButton',
        'ctl00_UserContentArea_BasicReportInput1_monthlyRadioButton',
        'ctl00_UserContentArea_BasicReportInput1_dateRangeRadioButton',
        'ctl00_UserContentArea_chkInactives',
        'ctl00_UserContentArea_ExcludeNochargeKidsCheckBox',
        'ctl00_UserContentArea_chkSales',
        'ctl00_UserContentArea_chkPayments',
        'ctl00_UserContentArea_chkContactInfo',
        'ctl00_UserContentArea_AlphabeticalRadioButton',
        'ctl00_UserContentArea_GroupbyHomeRoomRadioButton',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_BasicReportInput1_dailyCalendarPopup_dateInput',
        'ctl00_UserContentArea_BasicReportInput1_fromCalendarPopup_dateInput',
        'ctl00_UserContentArea_BasicReportInput1_toCalendarPopup_dateInput',
      ]);
      await expectHasOptions(page, 'ctl00_UserContentArea_BasicReportInput1_monthlyDropDownList');
      await expectHasOptions(page, 'ctl00_UserContentArea_BasicReportInput1_yearDropDownList');
      await expectHasOptions(page, 'ctl00_UserContentArea_ddlNoChargeResons');
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_ReportCaller1_rptRetriever', 'Generate Report'],
      ]);
    });
  });
});
