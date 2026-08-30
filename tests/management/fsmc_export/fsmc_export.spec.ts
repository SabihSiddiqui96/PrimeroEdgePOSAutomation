import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Management > FSMC Export (/POS/VendorExport.aspx)
test.describe('POS - Management - FSMC Export', () => {
  test.fixme('FSMC Export - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
