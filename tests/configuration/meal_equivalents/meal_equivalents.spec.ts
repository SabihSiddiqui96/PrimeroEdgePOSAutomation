import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  caption,
  expectButtons,
  expectCaptions,
  expectGridColumns,
  expectGridResolved,
  expectHasOptions,
  expectPageTitle,
} from '../../../utils/screen';

// POS > Configuration > Meal Equivalents (/POS/ManageMealEquivalents.aspx)
const PATH = '/POS/ManageMealEquivalents.aspx';
const CATEGORY_GRID = 'ctl00_UserContentArea_rgLabourHourCategory';
const HISTORY_GRID = 'ctl00_UserContentArea_rgCategoryHistory';

test.describe('POS - Configuration - Meal Equivalents', () => {
  test('Meal Equivalents screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Meal Equivalents/i);
    await expectPageTitle(page, 'Meal Equivalents / Labor Hour Categories');

    await test.step('tabs and year', async () => {
      await expectCaptions(page, ['Configuration', 'History', 'Year', 'Meal Equivalents']);
      await expectHasOptions(page, 'ctl00_UserContentArea_FiscalYearDropDownList');
    });

    await test.step('labor hour categories', async () => {
      // The seven rows carry district descriptions, several of them blank.
      await expectCaptions(page, ['Labor Hour Categories']);
      await expectGridColumns(page, CATEGORY_GRID, ['Description', 'Active']);
      await expectGridResolved(page, CATEGORY_GRID);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_ApplyButton', 'Apply'],
        ['ctl00_UserContentArea_EditButton', 'Edit'],
        ['ctl00_UserContentArea_btnEditLabourHourCategory', 'Edit'],
      ]);
    });
    await test.step('category history', async () => {
      // The history grid lives on its own tab and stays hidden until it is opened.
      await caption(page, 'History').click();
      await expect(page.locator(`#${HISTORY_GRID}`)).toBeVisible();
      await expectGridColumns(page, HISTORY_GRID, [
        'Category Name',
        'Category Description',
        'Old Value',
        'New Value',
        'Modified By',
        'Modified Date',
      ]);
      await expectGridResolved(page, HISTORY_GRID);
    });
  });
});
