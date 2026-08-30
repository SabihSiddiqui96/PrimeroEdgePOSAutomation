import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Reimbursements > Combo Claims (/POS/ComboClaim.aspx)
test.describe('POS - Reimbursements - Combo Claims', () => {
  test.fixme('Combo Claims - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
