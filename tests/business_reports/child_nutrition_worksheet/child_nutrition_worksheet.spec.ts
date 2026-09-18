import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectPageTitle,
} from '../../../utils/screen';

// POS > Business Reports > Child Nutrition Worksheet (/POS/ChildNutritionWorksheet.aspx)
const PATH = '/POS/ChildNutritionWorksheet.aspx';

test.describe('POS - Business Reports - Child Nutrition Worksheet', () => {
  test('Child Nutrition Worksheet screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Child Nutrition Worksheet/i);
    await expectPageTitle(page, 'Child Nutrition Worksheet');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, ['Month:']);
      await expectFilled(page, ['ctl00_UserContentArea_calMonth1_dateInput']);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_ReportCaller1_rptRetriever', 'Generate Report'],
      ]);
    });
  });
});
