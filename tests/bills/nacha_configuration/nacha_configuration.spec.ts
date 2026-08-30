import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Bills > NACHA Configuration (/POS/ManageNachaDetails.aspx)
test.describe('POS - Bills - NACHA Configuration', () => {
  test.fixme('NACHA Configuration - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
