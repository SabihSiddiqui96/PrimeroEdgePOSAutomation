import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Bills > Payments Import (/DataExchange/FloridaPaymentsImport.aspx)
test.describe('POS - Bills - Payments Import', () => {
  test.fixme('Payments Import - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
