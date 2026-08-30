import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Daily Reports > Session Transactions (/POS/SessionTransactionsReport.aspx)
test.describe('POS - Daily Reports - Session Transactions', () => {
  test.fixme('Session Transactions - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
