import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Management > POS Periods (/POS/ManagePOSPeriods.aspx)
test.describe('POS - Management - POS Periods', () => {
  test.fixme('POS Periods - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
