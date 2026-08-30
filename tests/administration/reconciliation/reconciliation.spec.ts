import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Administration > Reconciliation (/POS/Reconciliation.aspx)
test.describe('POS - Administration - Reconciliation', () => {
  test.fixme('Reconciliation - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
