import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Configuration > Terminals (/POS/ManageTerminals.aspx)
test.describe('POS - Configuration - Terminals', () => {
  test.fixme('Terminals - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
