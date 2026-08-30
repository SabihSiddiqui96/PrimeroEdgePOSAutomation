import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Daily Reports > ADA - ADP Report (/POS/ADAADPReport.aspx)
test.describe('POS - Daily Reports - ADA - ADP Report', () => {
  test.fixme('ADA - ADP Report - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
