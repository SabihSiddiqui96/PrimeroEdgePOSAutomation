import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Business Reports > Revenue (/POS/Revenue.aspx)
test.describe('POS - Business Reports - Revenue', () => {
  test.fixme('Revenue - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
