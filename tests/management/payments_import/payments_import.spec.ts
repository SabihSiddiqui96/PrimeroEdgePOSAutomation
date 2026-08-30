import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Management > Payments Import (/DataExchange/PaymentsImportV1.aspx)
test.describe('POS - Management - Payments Import', () => {
  test.fixme('Payments Import - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
