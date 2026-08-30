import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Orders > Order Preparation (/POS/ManageOnlineOrders.aspx)
test.describe('POS - Orders - Order Preparation', () => {
  test.fixme('Order Preparation - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
