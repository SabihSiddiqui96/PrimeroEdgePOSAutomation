import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Daily Reports > Patron Participation (/POS/StudentParticipationReport.aspx)
test.describe('POS - Daily Reports - Patron Participation', () => {
  test.fixme('Patron Participation - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
