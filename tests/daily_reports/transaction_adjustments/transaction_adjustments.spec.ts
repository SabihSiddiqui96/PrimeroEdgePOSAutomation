import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Daily Reports > Transaction Adjustments (/POS/TransactionAdjustmentsReport.aspx)
test.describe('POS - Daily Reports - Transaction Adjustments', () => {
  test.fixme('Transaction Adjustments - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
