import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Reimbursements > Program Configuration (/POS/SiteProgramConfiguration.aspx)
test.describe('POS - Reimbursements - Program Configuration', () => {
  test.fixme('Program Configuration - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
