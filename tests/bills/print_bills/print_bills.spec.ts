import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Bills > Print Bills (/POS/ExportSalesInvoice.aspx)
test.describe('POS - Bills - Print Bills', () => {
  test.fixme('Print Bills - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
