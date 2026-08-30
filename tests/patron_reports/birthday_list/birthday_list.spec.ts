import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Patron Reports > Birthday List (/POS/BirthDayList.aspx)
test.describe('POS - Patron Reports - Birthday List', () => {
  test.fixme('Birthday List - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
