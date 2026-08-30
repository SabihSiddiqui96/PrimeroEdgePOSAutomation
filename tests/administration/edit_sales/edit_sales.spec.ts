import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Administration > Edit Sales (/POS/EditManualSale.aspx)
test.describe('POS - Administration - Edit Sales', () => {
  test.fixme('Edit Sales - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
