import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Administration > Record Sales (/POS/ManualSaleBulkEntry.aspx)
test.describe('POS - Administration - Record Sales', () => {
  test.fixme('Record Sales - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
