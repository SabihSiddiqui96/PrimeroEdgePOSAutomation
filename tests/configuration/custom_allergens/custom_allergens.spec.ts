import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Configuration > Custom Allergens (/MenuPlanning/ManageAllergens.aspx?IsPOS=1)
test.describe('POS - Configuration - Custom Allergens', () => {
  test.fixme('Custom Allergens - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
