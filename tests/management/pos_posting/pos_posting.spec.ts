import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Management > POS Posting (/POS/POSPosting.aspx)
test.describe('POS - Management - POS Posting', () => {
  test.fixme('POS Posting - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
