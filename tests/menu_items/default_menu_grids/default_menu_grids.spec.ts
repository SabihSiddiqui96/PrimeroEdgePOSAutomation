import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Menu Items > Default Menu Grids (/POS/ManageDefaultKeyMaps.aspx)
test.describe('POS - Menu Items - Default Menu Grids', () => {
  test.fixme('Default Menu Grids - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
