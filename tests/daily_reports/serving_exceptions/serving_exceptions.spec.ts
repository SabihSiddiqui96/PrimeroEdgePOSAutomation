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

// POS > Daily Reports > Serving Exceptions (/POS/ServingStatusVariance.aspx)
const PATH = '/POS/ServingStatusVariance.aspx';

test.describe('POS - Daily Reports - Serving Exceptions', () => {
  test('Serving Exceptions screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Serving Exceptions/i);
    await expectPageTitle(page, 'Serving Exceptions');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Report',
        'Duplicate Meals',
        'Eligibility Variance',
        'Site Code',
        'Site',
        'Meal Type',
        'Year',
        'Period',
        'Price Type',
        'Free',
        'Reduced',
        'Paid',
        'Report Options',
        'All',
        'Resolved',
        'Unresolved',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_rblReport_0',
        'ctl00_UserContentArea_rblReport_1',
        'ctl00_UserContentArea_chkblPriceType_0',
        'ctl00_UserContentArea_chkblPriceType_1',
        'ctl00_UserContentArea_chkblPriceType_2',
        'ctl00_UserContentArea_ReportOptionRadioButtonList_0',
        'ctl00_UserContentArea_ReportOptionRadioButtonList_1',
        'ctl00_UserContentArea_ReportOptionRadioButtonList_2',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
      ]);
      await expectHasOptions(page, 'ctl00_UserContentArea_mealTypeDropDownList');
      await expectHasOptions(page, 'ctl00_UserContentArea_ucFiscalYearPeriod_ddlFiscalYear');
      await expectHasOptions(page, 'ctl00_UserContentArea_ucFiscalYearPeriod_ddlPeriod');
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_ReportCaller1_rptRetriever', 'Generate Report'],
      ]);
    });
  });
});
