import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Business Reports > Cash Collection (/POS/CashCollection.aspx)
test.describe('POS - Business Reports - Cash Collection', () => {
  test.fixme('Cash Collection - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
