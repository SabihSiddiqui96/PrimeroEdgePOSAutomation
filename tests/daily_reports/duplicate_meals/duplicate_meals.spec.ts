import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Daily Reports > Duplicate Meals (/POS/DuplicateMealsReport.aspx)
test.describe('POS - Daily Reports - Duplicate Meals', () => {
  test.fixme('Duplicate Meals - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
