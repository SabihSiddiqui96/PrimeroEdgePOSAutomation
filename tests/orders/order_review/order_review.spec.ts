import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Orders > Order Review (/POS/ReviewOrders.aspx)
test.describe('POS - Orders - Order Review', () => {
  test.fixme('Order Review - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
