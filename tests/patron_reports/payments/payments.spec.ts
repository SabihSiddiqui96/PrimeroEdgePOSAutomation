import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Patron Reports > Payments (/POS/PrePaymentReport.aspx)
test.describe('POS - Patron Reports - Payments', () => {
  test.fixme('Payments - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
