import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Configuration > Charge Limits (/POS/ManageChargeLimits.aspx)
test.describe('POS - Configuration - Charge Limits', () => {
  test.fixme('Charge Limits - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
