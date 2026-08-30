import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Patrons > Adults (/POS/ManageStaff.aspx)
test.describe('POS - Patrons - Adults', () => {
  test.fixme('Adults - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
