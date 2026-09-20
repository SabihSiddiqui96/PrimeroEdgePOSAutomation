import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Orders > Label Configuration (/POS/OrdLabelConfiguration.aspx)
test.describe('POS - Orders - Label Configuration', () => {
  test.fixme('Label Configuration - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
