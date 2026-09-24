import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectCaptions,
  expectGridColumns,
  expectGridResolved,
  expectPageTitle,
} from '../../../utils/screen';

// POS > Management > Meal Types (/POS/ManageSiteMealTypes.aspx)
const PATH = '/POS/ManageSiteMealTypes.aspx';
const GRID = 'ctl00_UserContentArea_rgMealTypes';

test.describe('POS - Management - Meal Types', () => {
  test('Meal Types screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Meal Types/i);
    await expectPageTitle(page, 'Meal Types');

    await test.step('sections', async () => {
      await expectCaptions(page, ['Meal Types', 'Meal Timings']);
    });

    await test.step('meal types grid', async () => {
      // Rows are the district's own meal types, so only the columns are asserted.
      await expectGridColumns(page, GRID, ['Meal Type', 'Reimbursable']);
      await expectGridResolved(page, GRID);
    });
  });
});
