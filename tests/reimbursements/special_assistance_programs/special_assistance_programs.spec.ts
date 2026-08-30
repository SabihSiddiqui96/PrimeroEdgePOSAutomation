import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Reimbursements > Special Assistance Programs (/POS/ManageProgram.aspx)
test.describe('POS - Reimbursements - Special Assistance Programs', () => {
  test.fixme('Special Assistance Programs - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
