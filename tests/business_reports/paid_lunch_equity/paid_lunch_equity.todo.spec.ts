import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Business Reports > Paid Lunch Equity (/POS/PaidLunchEquityReport.aspx)
test.describe('POS - Business Reports - Paid Lunch Equity', () => {
  test.fixme('Paid Lunch Equity - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
