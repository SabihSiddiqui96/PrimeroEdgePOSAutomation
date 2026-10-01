import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Orders > Order Review (/POS/ReviewOrders.aspx)
const PATH = '/POS/ReviewOrders.aspx';

test.describe('POS - Orders - Order Review', () => {
  test('Order Review screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Order Review/i);
    await expectPageTitle(page, 'Order Review');

    await test.step('filters', async () => {
      await expectCaptions(page, [
        'Site Code',
        'Site',
        'Meal Type',
        'Fulfillment Type',
        'Serving Location',
        'Fulfill On:',
        'Bundled Orders Only',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_dailyCalendarPopup_dateInput',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_rcbMealTypes_Input',
        'ctl00_UserContentArea_rcbFulfillmentTypes_Input',
        'ctl00_UserContentArea_rcbServingLocation_Input',
        'ctl00_UserContentArea_rdbBundeledOrders',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [['ctl00_UserContentArea_btnApply', 'Apply']]);
    });
  });
});
