import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Daily Reports > Meal Count (/POS/MealCountBySchool.aspx)
test.describe('POS - Daily Reports - Meal Count', () => {
  test.fixme('Meal Count - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
