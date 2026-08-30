import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Patrons > Merge Patrons (/System/MergeStudents.aspx)
test.describe('POS - Patrons - Merge Patrons', () => {
  test.fixme('Merge Patrons - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
