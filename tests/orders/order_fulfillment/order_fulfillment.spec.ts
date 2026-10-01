import { test } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';

// POS > Orders > Order Fulfillment (/POS/OrderFulfillment.aspx)
// Answers 200 but the Angular page renders only intermittently in a browser.
const PATH = '/POS/OrderFulfillment.aspx';

test.describe('POS - Orders - Order Fulfillment', () => {
  test.fixme('Order Fulfillment screen', async ({ page }) => {
    await openPosPage(page, PATH);
  });
});
