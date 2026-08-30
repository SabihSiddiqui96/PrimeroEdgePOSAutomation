import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Bills > Lockbox Import (/DataExchange/PaymentsImport.aspx)
test.describe('POS - Bills - Lockbox Import', () => {
  test.fixme('Lockbox Import - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
