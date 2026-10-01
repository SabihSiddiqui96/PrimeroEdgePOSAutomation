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

// POS > Menu Items > Default Menu Grids (/POS/ManageDefaultKeyMaps.aspx)
const PATH = '/POS/ManageDefaultKeyMaps.aspx';
const GRID = 'ctl00_UserContentArea_gridDefaultKeyMaps';

test.describe('POS - Menu Items - Default Menu Grids', () => {
  test('Default Menu Grids screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Default Menu Grids/i);
    await expectPageTitle(page, 'Default Menu Grids');

    await test.step('filters', async () => {
      await expectCaptions(page, ['Site Type', 'Meal Type', 'Day', 'Default Menu Grids']);
      await expectHasOptions(page, 'ctl00_UserContentArea_ddlSchoolType');
      await expectHasOptions(page, 'ctl00_UserContentArea_ddlMealType');
      await expectHasOptions(page, 'ctl00_UserContentArea_ddlDay');
    });

    await test.step('grids list', async () => {
      await expectGridColumns(page, GRID, ['Menu Grid', 'Site Type', 'Meal Type', 'Day']);
      await expectGridResolved(page, GRID);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_btnApply', 'Apply'],
        ['ctl00_UserContentArea_btnAdd', 'Add ...'],
      ]);
    });
  });
});
