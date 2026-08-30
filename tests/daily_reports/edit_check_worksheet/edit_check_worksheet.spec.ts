import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Daily Reports > Edit Check Worksheet (/POS/EditCheckWorksheet.aspx)
test.describe('POS - Daily Reports - Edit Check Worksheet', () => {
  test.fixme('Edit Check Worksheet - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
