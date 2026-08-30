import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Administration > Edit Checks (/POS/ManageEditCheck.aspx)
test.describe('POS - Administration - Edit Checks', () => {
  test.fixme('Edit Checks - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
