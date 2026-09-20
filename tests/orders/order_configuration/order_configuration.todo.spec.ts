import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Orders > Order Configuration (/POS/OrderConfiguration.aspx)
test.describe('POS - Orders - Order Configuration', () => {
  test.fixme('Order Configuration - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
