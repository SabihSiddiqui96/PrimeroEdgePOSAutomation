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

// POS > Patron Reports > Special Account (/POS/SpecialAccountReport.aspx)
const PATH = '/POS/SpecialAccountReport.aspx';

test.describe('POS - Patron Reports - Special Account', () => {
  test('Special Account screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Special Account/i);
    await expectPageTitle(page, 'Special Account');

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
        'Patron Type',
        'Principal',
        'New Student',
        'Visitor',
        'Staff',
        'Program Adult',
        'Report Type',
        'Summary',
        'Detailed',
        'Report Options',
        'Include Current Balance',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_BasicReportInput1_dailyRadioButton',
        'ctl00_UserContentArea_BasicReportInput1_monthlyRadioButton',
        'ctl00_UserContentArea_BasicReportInput1_dateRangeRadioButton',
        'ctl00_UserContentArea_rblpatrontype_0',
        'ctl00_UserContentArea_rblpatrontype_1',
        'ctl00_UserContentArea_rblpatrontype_2',
        'ctl00_UserContentArea_rblpatrontype_3',
        'ctl00_UserContentArea_rblpatrontype_4',
        'ctl00_UserContentArea_rblReportType_0',
        'ctl00_UserContentArea_rblReportType_1',
        'ctl00_UserContentArea_chkCurrentBalance',
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
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_ReportCaller1_rptRetriever', 'Generate Report'],
      ]);
    });
  });
});
