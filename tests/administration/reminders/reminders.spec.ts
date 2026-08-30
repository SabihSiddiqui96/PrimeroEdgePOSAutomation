import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Administration > Reminders (/POS/PrintReminders.aspx)
test.describe('POS - Administration - Reminders', () => {
  test.fixme('Reminders - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
