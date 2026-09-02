import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectGridColumns,
  expectGridResolved,
  expectPageTitle,
} from '../../../utils/screen';

// POS > Administration > Edit Sales (/POS/EditManualSale.aspx)
const PATH = '/POS/EditManualSale.aspx';

test.describe('POS - Administration - Edit Sales', () => {
  test('Edit Sales screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/Edit Sales/i);
    await expectPageTitle(page, 'Edit Sales');

    await test.step('search filters', async () => {
      await expectCaptions(page, ['Site Code', 'Site', 'From', 'To']);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_calFromDate_dateInput',
        'ctl00_UserContentArea_calToDate_dateInput',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_btnApply', 'Apply'],
        ['ctl00_UserContentArea_ReportCaller1_rptRetriever', 'Print List'],
      ]);
    });

    await test.step('edit sales grid', async () => {
      await expectGridColumns(page, 'ctl00_UserContentArea_gridManualSale_ctl00', [
        'Date',
        'Site',
        'Terminal',
        'User',
        'Meal Type',
        'Menu Item',
        'Entry Type',
        'Edit',
      ]);
      await expectGridResolved(page, 'ctl00_UserContentArea_gridManualSale_ctl00');
    });
  });
});
