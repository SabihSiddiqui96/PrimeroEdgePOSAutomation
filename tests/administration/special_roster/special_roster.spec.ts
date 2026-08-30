import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Administration > Special Roster (/POS/SpecialRoster.aspx)
test.describe('POS - Administration - Special Roster', () => {
  test.fixme('Special Roster - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
