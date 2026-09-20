import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Configuration > Default Restrictions (/POS/ManageDefaultRestriction.aspx)
test.describe('POS - Configuration - Default Restrictions', () => {
  test.fixme('Default Restrictions - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
