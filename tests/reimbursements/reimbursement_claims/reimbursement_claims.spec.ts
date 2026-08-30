import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Reimbursements > Reimbursement Claims (/POS/ManageReimbursementClaims.aspx)
test.describe('POS - Reimbursements - Reimbursement Claims', () => {
  test.fixme('Reimbursement Claims - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
