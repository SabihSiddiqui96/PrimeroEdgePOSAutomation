import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Configuration > Report Refresh (/POS/POSRollups.aspx)
test.describe('POS - Configuration - Report Refresh', () => {
  test.fixme('Report Refresh - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
