import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Management > Meals Per Labor Hour (/POS/MealPerLaborHourReport.aspx)
test.describe('POS - Management - Meals Per Labor Hour', () => {
  test.fixme('Meals Per Labor Hour - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
