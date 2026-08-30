import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Bills > Generate Bills (/pos/GenerateSalesInvoice.aspx)
test.describe('POS - Bills - Generate Bills', () => {
  test.fixme('Generate Bills - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
