import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectCaptions,
  expectGridColumns,
  expectGridResolved,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Configuration > Planned Entrees Config (/POS/PlannedEntreesConfig.aspx)
const PATH = '/POS/PlannedEntreesConfig.aspx';
const GRID = 'ctl00_UserContentArea_rgLinkedMenuItems';

test.describe('POS - Configuration - Planned Entrees Config', () => {
  test('Planned Entrees Config screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Planned Entrees Config/i);
    await expectPageTitle(page, 'Planned Entrees Config');

    await test.step('sections', async () => {
      await expectCaptions(page, [
        'Planned Entrees',
        'Display Order Priority',
        'Dynamic Menu',
        'Linked Menu Items',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_rblDisplayOrderPriority_0',
        'ctl00_UserContentArea_rblDisplayOrderPriority_1',
        // Caption flips to Turn Off once the feature is on, so only presence is checked.
        'ctl00_UserContentArea_btnTurnOnPlannedEntrees',
      ]);
    });

    await test.step('linked menu items grid', async () => {
      await expectGridColumns(page, GRID, [
        'POS Menu Item Name',
        'Menu Planning Item Name',
        "On Today's Plan?",
        'Secondary Link?',
      ]);
      await expectGridResolved(page, GRID);
    });
  });
});
