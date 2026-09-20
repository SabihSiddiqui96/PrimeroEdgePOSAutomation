import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Business Reports > Site Revenue (/POS/SchoolRevenue.aspx)
test.describe('POS - Business Reports - Site Revenue', () => {
  test.fixme('Site Revenue - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
