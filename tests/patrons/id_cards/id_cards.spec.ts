import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Patrons > ID Cards (/POS/PrintIDCards.aspx)
test.describe('POS - Patrons - ID Cards', () => {
  test.fixme('ID Cards - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
