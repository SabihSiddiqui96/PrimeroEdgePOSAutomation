import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Daily Reports > Edit Check (/POS/EditCheckInput.aspx)
test.describe('POS - Daily Reports - Edit Check', () => {
  test.fixme('Edit Check - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
