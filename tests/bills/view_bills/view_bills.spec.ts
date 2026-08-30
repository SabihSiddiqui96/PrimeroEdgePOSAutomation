import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Bills > View Bills (/POS/StudentSalesInvoices.aspx)
test.describe('POS - Bills - View Bills', () => {
  test.fixme('View Bills - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
