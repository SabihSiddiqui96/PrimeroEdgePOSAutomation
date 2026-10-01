import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectGridColumns,
  expectGridResolved,
  expectHasOptions,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Menu Items > Menu Items (/POS/ManageMenuItemsPrices.aspx)
const PATH = '/POS/ManageMenuItemsPrices.aspx';
const GRID = 'ctl00_UserContentArea_gridMenuItems';

test.describe('POS - Menu Items - Menu Items', () => {
  test('Menu Items screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Menu Items/i);
    await expectPageTitle(page, 'Menu Items');

    await test.step('filters', async () => {
      await expectCaptions(page, ['Category', 'Meal Type', 'Item Description', 'Menu Items']);
      await expectHasOptions(page, 'ctl00_UserContentArea_ddlMenuItemCategory');
      await expectHasOptions(page, 'ctl00_UserContentArea_ddlMealType');
      await expectVisible(page, [
        'ctl00_UserContentArea_txtItemDescription',
        'ctl00_UserContentArea_chkIsVendable',
        'ctl00_UserContentArea_chkMealsOnly',
        'ctl00_UserContentArea_chkItemsWithNoPricing',
        'ctl00_UserContentArea_chkIsOrderableFilter',
        'ctl00_UserContentArea_chkMpMenuItems',
      ]);
    });

    await test.step('items grid', async () => {
      // Rows are the district's own menu items, so only the columns are checked.
      await expectGridColumns(page, GRID, [
        'Item Description',
        'Button Description',
        'Category',
        'Used on Menu Grid(s)',
        'Is Meal',
        'Orderable',
        'Stock Item',
        'MP Menu Item',
      ]);
      await expectGridResolved(page, GRID);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_btnApply', 'Apply'],
        ['ctl00_UserContentArea_btnAdd', 'Add ...'],
        ['ctl00_UserContentArea_btnVendingExport', 'Export Vending ...'],
      ]);
    });
  });
});
