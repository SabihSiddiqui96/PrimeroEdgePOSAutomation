import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Patron Reports > Special Account (/POS/SpecialAccountReport.aspx)
test.describe('POS - Patron Reports - Special Account', () => {
  test.fixme('Special Account - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
