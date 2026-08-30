import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Administration > Serving Exceptions (/POS/DuplicateMeal.aspx)
test.describe('POS - Administration - Serving Exceptions', () => {
  test.fixme('Serving Exceptions - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
