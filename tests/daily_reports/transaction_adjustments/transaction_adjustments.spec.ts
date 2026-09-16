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

// POS > Daily Reports > Transaction Adjustments (/POS/TransactionAdjustmentsReport.aspx)
const PATH = '/POS/TransactionAdjustmentsReport.aspx';

test.describe('POS - Daily Reports - Transaction Adjustments', () => {
  test('Transaction Adjustments screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Transaction Adjustments/i);
    await expectPageTitle(page, 'Transaction Adjustments');

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
        'Adjustment Type',
        'Sale Adjustments',
        'Payment Adjustments',
        'Session Adjustments',
        'Account Adjustments',
        'Fund Transfers',
        'Refund',
        'Report Options',
        'Serving Site',
        'Enrollment Site',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_BasicReportInput1_dailyRadioButton',
        'ctl00_UserContentArea_BasicReportInput1_monthlyRadioButton',
        'ctl00_UserContentArea_BasicReportInput1_dateRangeRadioButton',
        'ctl00_UserContentArea_rblAdjustmentType_0',
        'ctl00_UserContentArea_rblAdjustmentType_1',
        'ctl00_UserContentArea_rblAdjustmentType_2',
        'ctl00_UserContentArea_rblAdjustmentType_3',
        'ctl00_UserContentArea_rblAdjustmentType_4',
        'ctl00_UserContentArea_rblAdjustmentType_5',
        'ctl00_UserContentArea_rdServingSite',
        'ctl00_UserContentArea_rdEnrollmentSite',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucReportingGroupSelector_rcbReportingGroup_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_ucGradeSelector_rcbGrades_Input',
        'ctl00_UserContentArea_TerminalDropDownList_rcbTerminals_Input',
        'ctl00_UserContentArea_UserLookup_txtUser',
        'ctl00_UserContentArea_BasicReportInput1_dailyCalendarPopup_dateInput',
        'ctl00_UserContentArea_BasicReportInput1_fromCalendarPopup_dateInput',
        'ctl00_UserContentArea_BasicReportInput1_toCalendarPopup_dateInput',
      ]);
      await expectHasOptions(page, 'ctl00_UserContentArea_BasicReportInput1_monthlyDropDownList');
      await expectHasOptions(page, 'ctl00_UserContentArea_BasicReportInput1_yearDropDownList');
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_UserLookup_btnUser', '...'],
        ['ctl00_UserContentArea_ReportCaller1_rptRetriever', 'Generate Report'],
      ]);
    });
  });
});
