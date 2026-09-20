import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Menu Items > Meal Combo (/POS/MealCombo.aspx)
test.describe('POS - Menu Items - Meal Combo', () => {
  test.fixme('Meal Combo - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
