import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectGridColumns,
  expectGridResolved,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Menu Items > Categories (/POS/ManageMenuItemCategory.aspx)
const PATH = '/POS/ManageMenuItemCategory.aspx';
const CATEGORIES_GRID = 'ctl00_UserContentArea_MenuItemCategory_rgMenuItemCategories';

test.describe('POS - Menu Items - Categories', () => {
  test('Categories screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Categories/i);
    await expectPageTitle(page, 'Categories');

    await test.step('add a category', async () => {
      await expectCaptions(page, ['POS Categories', 'Category Description', 'Display Order']);
      await expectVisible(page, [
        'ctl00_UserContentArea_MenuItemCategory_txtDescription',
        'ctl00_UserContentArea_MenuItemCategory_txtDisplayOrder',
        'ctl00_UserContentArea_MenuItemCategory_chkDoNotDisplay',
      ]);
      await expectButtons(page, [['ctl00_UserContentArea_MenuItemCategory_btnAdd', 'Add']]);
    });

    await test.step('categories grid', async () => {
      // Rows are the district's own categories, so only the columns are checked.
      await expectGridColumns(page, CATEGORIES_GRID, [
        'Description',
        'Display Order',
        "Don't Display",
      ]);
      await expectGridResolved(page, CATEGORIES_GRID);
    });
  });
});
