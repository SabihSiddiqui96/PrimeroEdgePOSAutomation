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

// POS > Daily Reports > Session Transactions (/POS/SessionTransactionsReport.aspx)
const PATH = '/POS/SessionTransactionsReport.aspx';

test.describe('POS - Daily Reports - Session Transactions', () => {
  test('Session Transactions screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Session Transactions/i);
    await expectPageTitle(page, 'Session Transactions');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Reporting Group',
        'Site Code',
        'Site',
        'Terminal',
        'Date Range',
        'Daily',
        'From:',
        'Monthly',
        'Month:',
        'Year:',
        'To:',
        'Report Type',
        'Summary By School',
        'Include Payments',
        'Manual Summary Sale',
        'Show Meal Status',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_BasicReportInput1_dailyRadioButton',
        'ctl00_UserContentArea_BasicReportInput1_monthlyRadioButton',
        'ctl00_UserContentArea_BasicReportInput1_dateRangeRadioButton',
        'ctl00_UserContentArea_chkSummaryBySchool',
        'ctl00_UserContentArea_chkIncludePayments',
        'ctl00_UserContentArea_chkManualSaleSummary',
        'ctl00_UserContentArea_chkShowMealStatus',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucReportingGroupSelector_rcbReportingGroup_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_ucGradeSelector_rcbGrades_Input',
        'ctl00_UserContentArea_TerminalDropDownList_rcbTerminals_Input',
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
