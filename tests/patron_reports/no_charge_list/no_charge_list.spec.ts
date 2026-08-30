import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Patron Reports > No Charge List (/POS/NoChargeListReport.aspx)
test.describe('POS - Patron Reports - No Charge List', () => {
  test.fixme('No Charge List - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
