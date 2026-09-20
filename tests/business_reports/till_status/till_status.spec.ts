import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Business Reports > Till Status (/POS/TillStatusReport.aspx)
test.describe('POS - Business Reports - Till Status', () => {
  test.fixme('Till Status - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
