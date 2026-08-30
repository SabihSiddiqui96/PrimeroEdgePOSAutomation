import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Business Reports > Additional Income (/POS/RptAdditionalIncome.aspx)
test.describe('POS - Business Reports - Additional Income', () => {
  test.fixme('Additional Income - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
