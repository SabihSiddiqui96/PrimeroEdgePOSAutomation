import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Configuration > Planned Entrees Config (/POS/PlannedEntreesConfig.aspx)
test.describe('POS - Configuration - Planned Entrees Config', () => {
  test.fixme('Planned Entrees Config - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
