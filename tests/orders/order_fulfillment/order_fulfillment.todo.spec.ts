import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Orders > Order Fulfillment (/POS/OrderFulfillment.aspx)
test.describe('POS - Orders - Order Fulfillment', () => {
  test.fixme('Order Fulfillment - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
