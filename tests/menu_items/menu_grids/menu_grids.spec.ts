import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectGridColumns,
  expectGridResolved,
  expectHasOptions,
  expectPageTitle,
} from '../../../utils/screen';

// POS > Menu Items > Menu Grids (/POS/ManageKeyMaps.aspx)
const PATH = '/POS/ManageKeyMaps.aspx';
const GRID = 'ctl00_UserContentArea_gridKeyMaps';

test.describe('POS - Menu Items - Menu Grids', () => {
  test('Menu Grids screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Menu Grids/i);
    await expectPageTitle(page, 'Menu Grids');

    await test.step('filters', async () => {
      await expectCaptions(page, ['Site Type', 'Meal Type', 'Menus Grids']);
      await expectHasOptions(page, 'ctl00_UserContentArea_ddlSchoolType');
      await expectHasOptions(page, 'ctl00_UserContentArea_ddlMealType');
    });

    await test.step('grids list', async () => {
      await expectGridColumns(page, GRID, [
        'Menu Grid Name',
        'Site Type',
        'Meal Type',
        'Days Allowed',
        'Meal Combo',
        'Orderable',
      ]);
      await expectGridResolved(page, GRID);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_btnApply', 'Apply'],
        ['ctl00_UserContentArea_btnAddNew', 'Add ...'],
        ['ctl00_UserContentArea_btnCopyMenu', 'Copy Menu'],
      ]);
    });
  });
});
