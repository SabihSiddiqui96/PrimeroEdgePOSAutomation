import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Business Reports > Suspicious Transactions (/POS/SuspiciousTransactionReport.aspx)
test.describe('POS - Business Reports - Suspicious Transactions', () => {
  test.fixme('Suspicious Transactions - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
