import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Menu Items > Categories (/POS/ManageMenuItemCategory.aspx)
test.describe('POS - Menu Items - Categories', () => {
  test.fixme('Categories - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
