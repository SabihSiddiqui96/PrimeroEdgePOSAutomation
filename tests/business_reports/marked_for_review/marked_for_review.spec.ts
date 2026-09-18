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

// POS > Business Reports > Marked for Review (/POS/MarkedForReview.aspx)
const PATH = '/POS/MarkedForReview.aspx';

test.describe('POS - Business Reports - Marked for Review', () => {
  test('Marked for Review screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Marked for Review/i);
    await expectPageTitle(page, 'Marked for Review');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Site Code',
        'Site',
        'User',
        'Date Range',
        'Daily',
        'From:',
        'Monthly',
        'Month:',
        'Year:',
        'To:',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_BasicReportInput1_dailyRadioButton',
        'ctl00_UserContentArea_BasicReportInput1_monthlyRadioButton',
        'ctl00_UserContentArea_BasicReportInput1_dateRangeRadioButton',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_BasicReportInput1_dailyCalendarPopup_dateInput',
        'ctl00_UserContentArea_BasicReportInput1_fromCalendarPopup_dateInput',
        'ctl00_UserContentArea_BasicReportInput1_toCalendarPopup_dateInput',
      ]);
      await expectHasOptions(page, 'ctl00_UserContentArea_userDropDownList');
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
