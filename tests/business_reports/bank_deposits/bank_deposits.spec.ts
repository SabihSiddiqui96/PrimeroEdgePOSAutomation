import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Business Reports > Bank Deposits (/POS/BankDeposits.aspx)
test.describe('POS - Business Reports - Bank Deposits', () => {
  test.fixme('Bank Deposits - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
