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

// POS > Daily Reports > Menu Item Sales (/POS/MenuItemSales.aspx)
const PATH = '/POS/MenuItemSales.aspx';

test.describe('POS - Daily Reports - Menu Item Sales', () => {
  test('Menu Item Sales screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Menu Item Sales/i);
    await expectPageTitle(page, 'Menu Item Sales');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Reporting Group',
        'Site Code',
        'Site',
        'Terminal',
        'Meal Type',
        'Menu Item',
        'Meals Only',
        'A La Carte Only',
        'Transaction Type',
        'Date Range',
        'Daily',
        'From:',
        'Monthly',
        'Month:',
        'Year:',
        'To:',
        'Report Options',
        'Daily Summary',
        'Item Summary',
        'District',
        'Site Type',
        'Grade',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_chkMealsOnly',
        'ctl00_UserContentArea_chkAlacarteOnly',
        'ctl00_UserContentArea_BasicReportInput1_dailyRadioButton',
        'ctl00_UserContentArea_BasicReportInput1_monthlyRadioButton',
        'ctl00_UserContentArea_BasicReportInput1_dateRangeRadioButton',
        'ctl00_UserContentArea_rbtnchkDailySummary',
        'ctl00_UserContentArea_rbtnItemSummary',
        'ctl00_UserContentArea_chkDistrict',
        'ctl00_UserContentArea_chkSiteType',
        'ctl00_UserContentArea_chkGrade',
        'ctl00_UserContentArea_chkTerminal',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucReportingGroupSelector_rcbReportingGroup_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_ucGradeSelector_rcbGrades_Input',
        'ctl00_UserContentArea_TerminalDropDownList_rcbTerminals_Input',
        'ctl00_UserContentArea_mealTypeDropDownList_Input',
        'ctl00_UserContentArea_menuItemDropDownList_Input',
        'ctl00_UserContentArea_transactionTypeDropDownList_Input',
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
