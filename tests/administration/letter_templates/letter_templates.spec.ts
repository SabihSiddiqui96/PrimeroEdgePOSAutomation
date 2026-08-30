import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Administration > Letter Templates (/POS/LetterTemplates.aspx)
test.describe('POS - Administration - Letter Templates', () => {
  test.fixme('Letter Templates - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
