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

// POS > Business Reports > Cash Collection (/POS/CashCollection.aspx)
const PATH = '/POS/CashCollection.aspx';

test.describe('POS - Business Reports - Cash Collection', () => {
  test('Cash Collection screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Cash Collection/i);
    await expectPageTitle(page, 'Cash Collection');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Reporting Group',
        'Site Code',
        'Site',
        'Date Range',
        'Daily',
        'From:',
        'Monthly',
        'Month:',
        'Year:',
        'To:',
        'Report Type',
        'Summary',
        'Detailed',
        'Include Satellite Schools',
        'Report Options',
        'Exclude Non-Payment Days',
        'Page Break by Site',
        'Include Refund',
        'Yes',
        'No',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_BasicReportInput1_dailyRadioButton',
        'ctl00_UserContentArea_BasicReportInput1_monthlyRadioButton',
        'ctl00_UserContentArea_BasicReportInput1_dateRangeRadioButton',
        'ctl00_UserContentArea_BasicReportInput1_rblReportType_0',
        'ctl00_UserContentArea_BasicReportInput1_rblReportType_1',
        'ctl00_UserContentArea_BasicReportInput1_satelliteSchoolCheckBox',
        'ctl00_UserContentArea_chkExcludeNonPaymentDays',
        'ctl00_UserContentArea_chkPageBreakBySite',
        'ctl00_UserContentArea_rblIncludeRefund_0',
        'ctl00_UserContentArea_rblIncludeRefund_1',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucReportingGroupSelector_rcbReportingGroup_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_BasicReportInput1_dailyCalendarPopup_dateInput',
        'ctl00_UserContentArea_BasicReportInput1_fromCalendarPopup_dateInput',
        'ctl00_UserContentArea_BasicReportInput1_toCalendarPopup_dateInput',
      ]);
      await expectHasOptions(page, 'ctl00_UserContentArea_BasicReportInput1_monthlyDropDownList');
      await expectHasOptions(page, 'ctl00_UserContentArea_BasicReportInput1_yearDropDownList');
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_ReportCaller1_rptRetriever', 'Generate Report'],
      ]);
    });
  });
});
