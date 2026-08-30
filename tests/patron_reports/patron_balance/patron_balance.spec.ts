import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Patron Reports > Patron Balance (/POS/StudentBalanceReport.aspx)
test.describe('POS - Patron Reports - Patron Balance', () => {
  test.fixme('Patron Balance - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
