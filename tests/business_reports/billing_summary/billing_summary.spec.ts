import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Business Reports > Billing Summary (/POS/SalesInvoiceReport.aspx)
test.describe('POS - Business Reports - Billing Summary', () => {
  test.fixme('Billing Summary - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
