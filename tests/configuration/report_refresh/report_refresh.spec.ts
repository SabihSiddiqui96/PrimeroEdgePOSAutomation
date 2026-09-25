import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectPageTitle,
} from '../../../utils/screen';

// POS > Configuration > Report Refresh (/POS/POSRollups.aspx)
const PATH = '/POS/POSRollups.aspx';

test.describe('POS - Configuration - Report Refresh', () => {
  test('Report Refresh screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Report Refresh/i);
    await expectPageTitle(page, 'Report Refresh');

    await test.step('date range', async () => {
      await expectCaptions(page, ['From', 'To']);
      await expectFilled(page, [
        'ctl00_UserContentArea_calFromDate_dateInput',
        'ctl00_UserContentArea_calToDate_dateInput',
      ]);
    });

    await test.step('last run', async () => {
      // Only the labels: the run's status, dates and user change on every refresh.
      await expectCaptions(page, [
        'History',
        'Last Report Refresh ran on:',
        'Last Report Refresh Completed at:',
        'Date range:',
        'Status:',
        'User:',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [['ctl00_UserContentArea_btnRefreshReports', 'Refresh Reports']]);
    });
  });
});
