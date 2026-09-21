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

// POS > Business Reports > Paid Lunch Equity (/POS/PaidLunchEquityReport.aspx)
const PATH = '/POS/PaidLunchEquityReport.aspx';

test.describe('POS - Business Reports - Paid Lunch Equity', () => {
  test('Paid Lunch Equity screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Paid Lunch Equity/i);
    await expectPageTitle(page, 'Paid Lunch Equity');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Date Range',
        'Daily',
        'From:',
        'Monthly',
        'Month:',
        'Year:',
        'To:',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_BasicReportInput_dailyRadioButton',
        'ctl00_UserContentArea_BasicReportInput_monthlyRadioButton',
        'ctl00_UserContentArea_BasicReportInput_dateRangeRadioButton',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_BasicReportInput_dailyCalendarPopup_dateInput',
        'ctl00_UserContentArea_BasicReportInput_fromCalendarPopup_dateInput',
        'ctl00_UserContentArea_BasicReportInput_toCalendarPopup_dateInput',
      ]);
      await expectHasOptions(page, 'ctl00_UserContentArea_BasicReportInput_monthlyDropDownList');
      await expectHasOptions(page, 'ctl00_UserContentArea_BasicReportInput_yearDropDownList');
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_ReportCaller_rptRetriever', 'Generate Report'],
      ]);
    });
  });
});
