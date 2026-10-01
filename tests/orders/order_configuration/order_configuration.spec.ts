import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  caption,
  expectButtons,
  expectCaptions,
  expectGridColumns,
  expectGridResolved,
  expectPageTitle,
} from '../../../utils/screen';

// POS > Orders > Order Configuration (/POS/OrderConfiguration.aspx)
const PATH = '/POS/OrderConfiguration.aspx';
const SITES_GRID = 'ctl00_UserContentArea_rgSitesConfiguration';

test.describe('POS - Orders - Order Configuration', () => {
  test('Order Configuration screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Order Configuration/i);
    await expectPageTitle(page, 'Order Configuration');

    await test.step('tabs', async () => {
      await expectCaptions(page, [
        'General',
        'Meal Types',
        'Sites',
        'Zones',
        'Pick Up Windows',
        'Online Ordering',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_btnSaveConfiguration', 'Save'],
        ['ctl00_UserContentArea_btnCancelConfiguration', 'Cancel'],
      ]);
    });
    await test.step('sites grid', async () => {
      // The grid sits on the Sites tab and has no size until that tab is opened.
      await caption(page, 'Sites').click();
      await expect(page.locator(`#${SITES_GRID}`)).toBeVisible();
      // One row per site, each with its own checkboxes, so only columns are checked.
      await expectGridColumns(page, SITES_GRID, [
        'Site',
        'Meal Types',
        'Items',
        'Groups',
        'Fulfillment',
      ]);
      await expectGridResolved(page, SITES_GRID);
    });
  });
});
