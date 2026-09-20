import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Configuration > Homerooms (/System/ManageHomeRoom.aspx)
test.describe('POS - Configuration - Homerooms', () => {
  test.fixme('Homerooms - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
