import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Configuration > Meal Equivalents (/POS/ManageMealEquivalents.aspx)
test.describe('POS - Configuration - Meal Equivalents', () => {
  test.fixme('Meal Equivalents - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
