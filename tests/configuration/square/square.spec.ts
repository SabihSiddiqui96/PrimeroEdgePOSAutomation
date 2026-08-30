import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Configuration > Square (/POS/Square.aspx)
test.describe('POS - Configuration - Square', () => {
  test.fixme('Square - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
