import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Daily Reports > Menu Item Sales (/POS/MenuItemSales.aspx)
test.describe('POS - Daily Reports - Menu Item Sales', () => {
  test.fixme('Menu Item Sales - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
