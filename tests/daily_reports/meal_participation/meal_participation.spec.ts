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

// POS > Daily Reports > Meal Participation (/POS/ReportMealParticipation.aspx)
const PATH = '/POS/ReportMealParticipation.aspx';

test.describe('POS - Daily Reports - Meal Participation', () => {
  test('Meal Participation screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Meal Participation/i);
    await expectPageTitle(page, 'Meal Participation');

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
        'Programs',
        'Report Type',
        'Summary',
        'Detailed',
        'Report Options',
        'Meal Count',
        'Percentage',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_BasicReportInput1_dailyRadioButton',
        'ctl00_UserContentArea_BasicReportInput1_monthlyRadioButton',
        'ctl00_UserContentArea_BasicReportInput1_dateRangeRadioButton',
        'ctl00_UserContentArea_ReportTypeRadioButtonList_0',
        'ctl00_UserContentArea_ReportTypeRadioButtonList_1',
        'ctl00_UserContentArea_ReportOptionRadioButtonList_0',
        'ctl00_UserContentArea_ReportOptionRadioButtonList_1',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucReportingGroupSelector_rcbReportingGroup_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_BasicReportInput1_dailyCalendarPopup_dateInput',
        'ctl00_UserContentArea_BasicReportInput1_fromCalendarPopup_dateInput',
        'ctl00_UserContentArea_BasicReportInput1_toCalendarPopup_dateInput',
        'ctl00_UserContentArea_MealTypeDropDownList_rcbMealTypes_Input',
      ]);
      await expectHasOptions(page, 'ctl00_UserContentArea_BasicReportInput1_monthlyDropDownList');
      await expectHasOptions(page, 'ctl00_UserContentArea_BasicReportInput1_yearDropDownList');
      await expectHasOptions(page, 'ctl00_UserContentArea_ddlProgram');
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_ReportCaller1_rptRetriever', 'Generate Report'],
      ]);
    });
  });
});
