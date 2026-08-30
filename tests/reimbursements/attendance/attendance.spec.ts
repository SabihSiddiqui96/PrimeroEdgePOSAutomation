import { test } from '@playwright/test';
import { openPointOfService } from '../../../utils/pos';

// POS > Reimbursements > Attendance (/POS/ManageAttendanceFactor.aspx)
test.describe('POS - Reimbursements - Attendance', () => {
  test.fixme('Attendance - specs to be written', async ({ page }) => {
    await openPointOfService(page);
  });
});
