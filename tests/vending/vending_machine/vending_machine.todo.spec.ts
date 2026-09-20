import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Vending > Vending Machine (/POS/VendingMachine.aspx)
test.describe('POS - Vending - Vending Machine', () => {
  test.fixme('Vending Machine - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
