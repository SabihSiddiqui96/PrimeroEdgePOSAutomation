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

// POS > Business Reports > Bank Deposits (/POS/BankDeposits.aspx)
const PATH = '/POS/BankDeposits.aspx';

test.describe('POS - Business Reports - Bank Deposits', () => {
  test('Bank Deposits screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Bank Deposits/i);
    await expectPageTitle(page, 'Bank Deposits');

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
        'Report Options',
        'Summary',
        'Detailed',
        'Deposit Date',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_BasicReportInput1_dailyRadioButton',
        'ctl00_UserContentArea_BasicReportInput1_monthlyRadioButton',
        'ctl00_UserContentArea_BasicReportInput1_dateRangeRadioButton',
        'ctl00_UserContentArea_rblRptType_0',
        'ctl00_UserContentArea_rblRptType_1',
        'ctl00_UserContentArea_rblGroupby_0',
        'ctl00_UserContentArea_rblGroupby_1',
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
