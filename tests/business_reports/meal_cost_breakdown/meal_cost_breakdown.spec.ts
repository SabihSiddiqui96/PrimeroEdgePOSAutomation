import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectHasOptions,
  expectPageTitle,
} from '../../../utils/screen';

// POS > Business Reports > Meal Cost Breakdown (/POS/MealCostBreakdownReport.aspx)
const PATH = '/POS/MealCostBreakdownReport.aspx';

test.describe('POS - Business Reports - Meal Cost Breakdown', () => {
  test('Meal Cost Breakdown screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Meal Cost Breakdown/i);
    await expectPageTitle(page, 'Meal Cost Breakdown');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, ['Site', 'Period']);
      await expectHasOptions(
        page,
        'ctl00_UserContentArea_RegionSiteTypeSiteSelector_imSiteDropDownList',
      );
      await expectHasOptions(page, 'ctl00_UserContentArea_PeriodDropDownList');
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_mealCountReportCaller_rptRetriever', 'Generate Report'],
      ]);
    });
  });
});
