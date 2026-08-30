import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Daily Reports > Activity (/POS/ActivityInput.aspx)
test.describe('POS - Daily Reports - Activity', () => {
  test.fixme('Activity - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
