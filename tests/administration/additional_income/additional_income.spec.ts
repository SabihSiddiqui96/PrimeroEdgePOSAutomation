import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Administration > Additional Income (/POS/POSAdditionalIncome.aspx)
test.describe('POS - Administration - Additional Income', () => {
  test.fixme('Additional Income - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
