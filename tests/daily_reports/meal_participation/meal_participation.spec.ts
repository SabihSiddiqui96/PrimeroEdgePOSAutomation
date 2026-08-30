import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Daily Reports > Meal Participation (/POS/ReportMealParticipation.aspx)
test.describe('POS - Daily Reports - Meal Participation', () => {
  test.fixme('Meal Participation - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
