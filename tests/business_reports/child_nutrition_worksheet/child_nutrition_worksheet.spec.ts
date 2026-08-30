import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Business Reports > Child Nutrition Worksheet (/POS/ChildNutritionWorksheet.aspx)
test.describe('POS - Business Reports - Child Nutrition Worksheet', () => {
  test.fixme('Child Nutrition Worksheet - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
