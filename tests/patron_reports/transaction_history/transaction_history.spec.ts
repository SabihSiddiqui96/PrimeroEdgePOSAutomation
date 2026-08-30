import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Patron Reports > Transaction History (/POS/TransactionHistoryReport.aspx)
test.describe('POS - Patron Reports - Transaction History', () => {
  test.fixme('Transaction History - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
