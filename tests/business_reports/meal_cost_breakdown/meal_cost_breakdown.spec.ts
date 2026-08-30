import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Business Reports > Meal Cost Breakdown (/POS/MealCostBreakdownReport.aspx)
test.describe('POS - Business Reports - Meal Cost Breakdown', () => {
  test.fixme('Meal Cost Breakdown - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
