import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Menu Items > Menu Grids (/POS/ManageKeyMaps.aspx)
test.describe('POS - Menu Items - Menu Grids', () => {
  test.fixme('Menu Grids - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
