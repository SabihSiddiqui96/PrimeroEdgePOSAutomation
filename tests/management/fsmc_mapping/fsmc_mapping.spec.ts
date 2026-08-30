import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Management > FSMC Mapping (/System/ManagementMapping.aspx)
test.describe('POS - Management - FSMC Mapping', () => {
  test.fixme('FSMC Mapping - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
