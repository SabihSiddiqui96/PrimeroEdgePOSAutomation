import { test } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';

// POS > Management > FSMC Export (/POS/VendorExport.aspx)
// QA has no Management Settings for this district, so the screen never renders.
const PATH = '/POS/VendorExport.aspx';

test.describe('POS - Management - FSMC Export', () => {
  test.fixme('FSMC Export screen', async ({ page }) => {
    await openPosPage(page, PATH);
  });
});
