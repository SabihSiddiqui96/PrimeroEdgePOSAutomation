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

// POS > Daily Reports > Patron Participation (/POS/StudentParticipationReport.aspx)
const PATH = '/POS/StudentParticipationReport.aspx';

test.describe('POS - Daily Reports - Patron Participation', () => {
  test('Patron Participation screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Patron Participation/i);
    await expectPageTitle(page, 'Patron Participation');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Report',
        'Participation',
        'Non-Participation',
        'Reporting Group',
        'Site Code',
        'Site',
        'Homeroom',
        'Meal Type',
        'Menu Item',
        'Date Range',
        'Daily',
        'From:',
        'Monthly',
        'Month:',
        'Year:',
        'To:',
        'Eligibility',
        'Free',
        'Staff',
        'Reduced',
        'Visitor',
        'Paid',
        'Prog Adult',
        'Report Type',
        'Meals',
        'A La Carte',
        'Second Meals',
        'Serving Site',
        'All Patrons',
        'Away Patrons Only',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_rblReport_0',
        'ctl00_UserContentArea_rblReport_1',
        'ctl00_UserContentArea_BasicReportInput1_dailyRadioButton',
        'ctl00_UserContentArea_BasicReportInput1_monthlyRadioButton',
        'ctl00_UserContentArea_BasicReportInput1_dateRangeRadioButton',
        'ctl00_UserContentArea_chkblPriceType_0',
        'ctl00_UserContentArea_chkblPriceType_3',
        'ctl00_UserContentArea_chkblPriceType_1',
        'ctl00_UserContentArea_chkblPriceType_4',
        'ctl00_UserContentArea_chkblPriceType_2',
        'ctl00_UserContentArea_chkblPriceType_5',
        'ctl00_UserContentArea_chkMeals',
        'ctl00_UserContentArea_chkAlaCart',
        'ctl00_UserContentArea_chkSecondMeals',
        'ctl00_UserContentArea_rbtnServSite',
        'ctl00_UserContentArea_rbtnSerSiteList_0',
        'ctl00_UserContentArea_rbtnSerSiteList_1',
        'ctl00_UserContentArea_rbtnSerSiteList_2',
        'ctl00_UserContentArea_cboxCheck',
        'ctl00_UserContentArea_priceTypeReasoncheckedListBox_0',
        'ctl00_UserContentArea_priceTypeReasoncheckedListBox_9',
        'ctl00_UserContentArea_priceTypeReasoncheckedListBox_18',
        'ctl00_UserContentArea_priceTypeReasoncheckedListBox_1',
        'ctl00_UserContentArea_priceTypeReasoncheckedListBox_10',
        'ctl00_UserContentArea_priceTypeReasoncheckedListBox_19',
        'ctl00_UserContentArea_priceTypeReasoncheckedListBox_2',
        'ctl00_UserContentArea_priceTypeReasoncheckedListBox_11',
        'ctl00_UserContentArea_priceTypeReasoncheckedListBox_20',
        'ctl00_UserContentArea_priceTypeReasoncheckedListBox_3',
        'ctl00_UserContentArea_priceTypeReasoncheckedListBox_12',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucReportingGroupSelector_rcbReportingGroup_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_ucGradeSelector_rcbGrades_Input',
        'ctl00_UserContentArea_BasicReportInput1_dailyCalendarPopup_dateInput',
        'ctl00_UserContentArea_BasicReportInput1_fromCalendarPopup_dateInput',
        'ctl00_UserContentArea_BasicReportInput1_toCalendarPopup_dateInput',
      ]);
      await expectHasOptions(page, 'ctl00_UserContentArea_ddlHomeRoom');
      await expectHasOptions(page, 'ctl00_UserContentArea_mealTypeDropDownList');
      await expectHasOptions(page, 'ctl00_UserContentArea_menuItemDropDownList');
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
