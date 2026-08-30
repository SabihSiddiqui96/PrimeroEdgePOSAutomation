import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Business Reports > Marked for Review (/POS/MarkedForReview.aspx)
test.describe('POS - Business Reports - Marked for Review', () => {
  test.fixme('Marked for Review - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
