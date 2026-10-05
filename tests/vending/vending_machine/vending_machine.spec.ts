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

// POS > Vending > Vending Machine (/POS/VendingMachine.aspx)
const PATH = '/POS/VendingMachine.aspx';
const GRID = 'ctl00_UserContentArea_rgVendingDetails';

test.describe('POS - Vending - Vending Machine', () => {
  test('Vending Machine screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Vending Machine/i);
    await expectPageTitle(page, 'Vending Machine');

    await test.step('filters', async () => {
      await expectCaptions(page, ['Site Code', 'Site']);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
      ]);
    });

    await test.step('sites grid', async () => {
      // Rows are the district's own sites, so only the column is checked.
      await expectGridColumns(page, GRID, ['Site Name']);
      await expectGridResolved(page, GRID);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_btnApply', 'Apply'],
        ['ctl00_UserContentArea_btnSiteExport', 'Export Site ...'],
        ['ctl00_UserContentArea_btnExportTerminal', 'Export Terminal ...'],
      ]);
    });
  });
});
