import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Patrons > Accounts (/POS/Accounts.aspx)
test.describe('POS - Patrons - Accounts', () => {
  test.fixme('Accounts - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
