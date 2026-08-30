import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Daily Reports > Serving Exceptions (/POS/ServingStatusVariance.aspx)
test.describe('POS - Daily Reports - Serving Exceptions', () => {
  test.fixme('Serving Exceptions - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
