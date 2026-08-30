import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Administration > Deposit Slip (/POS/DepositSlip.aspx)
test.describe('POS - Administration - Deposit Slip', () => {
  test.fixme('Deposit Slip - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
