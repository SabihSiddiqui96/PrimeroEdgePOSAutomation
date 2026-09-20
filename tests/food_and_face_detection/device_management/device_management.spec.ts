import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Food & Face Detection > Device Management (/POS/ManageDevice.aspx)
test.describe('POS - Food & Face Detection - Device Management', () => {
  test.fixme('Device Management - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
