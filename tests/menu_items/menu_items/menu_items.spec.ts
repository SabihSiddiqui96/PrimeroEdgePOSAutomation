import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Menu Items > Menu Items (/POS/ManageMenuItemsPrices.aspx)
test.describe('POS - Menu Items - Menu Items', () => {
  test.fixme('Menu Items - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
