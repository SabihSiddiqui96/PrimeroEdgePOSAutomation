import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Administration > View Session (/POS/ViewSession.aspx)
test.describe('POS - Administration - View Session', () => {
  test.fixme('View Session - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
