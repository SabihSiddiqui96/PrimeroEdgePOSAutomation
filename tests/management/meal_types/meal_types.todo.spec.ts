import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Management > Meal Types (/POS/ManageSiteMealTypes.aspx)
test.describe('POS - Management - Meal Types', () => {
  test.fixme('Meal Types - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
