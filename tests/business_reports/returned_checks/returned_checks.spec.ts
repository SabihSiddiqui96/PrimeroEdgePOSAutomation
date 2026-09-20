import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Business Reports > Returned Checks (/POS/ReturnCheckReport.aspx)
test.describe('POS - Business Reports - Returned Checks', () => {
  test.fixme('Returned Checks - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
