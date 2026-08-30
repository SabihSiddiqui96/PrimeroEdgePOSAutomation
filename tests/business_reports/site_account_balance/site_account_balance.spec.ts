import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Business Reports > Site Account Balance (/POS/SchoolAccountBalanceReport.aspx)
test.describe('POS - Business Reports - Site Account Balance', () => {
  test.fixme('Site Account Balance - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
