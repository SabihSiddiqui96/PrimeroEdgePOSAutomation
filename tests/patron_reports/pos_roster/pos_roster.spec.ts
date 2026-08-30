import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Patron Reports > POS Roster (/POS/StudentRoster.aspx)
test.describe('POS - Patron Reports - POS Roster', () => {
  test.fixme('POS Roster - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
