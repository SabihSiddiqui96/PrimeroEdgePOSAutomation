import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Bills > Quick Payments (/POS/MakePaymentLight.aspx)
test.describe('POS - Bills - Quick Payments', () => {
  test.fixme('Quick Payments - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
