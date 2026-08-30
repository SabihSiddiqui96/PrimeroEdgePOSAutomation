import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Patrons > Students (/POS/ManageStudents.aspx)
test.describe('POS - Patrons - Students', () => {
  test.fixme('Students - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
