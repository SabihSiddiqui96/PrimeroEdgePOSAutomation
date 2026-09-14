import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import { expectPageTitle } from '../../../utils/screen';

// POS > Reimbursements > Special Assistance Programs (/POS/ManageProgram.aspx)
const PATH = '/POS/ManageProgram.aspx';

test.describe('POS - Reimbursements - Special Assistance Programs', () => {
  test('Special Assistance Programs screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Special Assistance Programs/i);
    await expectPageTitle(page, 'Special Assistance Programs');
  });
});
