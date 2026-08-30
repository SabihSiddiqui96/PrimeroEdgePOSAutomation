import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Management > Balance Import (/DataExchange/BalanceImport.aspx)
test.describe('POS - Management - Balance Import', () => {
  test.fixme('Balance Import - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
