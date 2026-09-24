import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectPageTitle,
} from '../../../utils/screen';

// POS > Management > POS Posting (/POS/POSPosting.aspx)
const PATH = '/POS/POSPosting.aspx';

test.describe('POS - Management - POS Posting', () => {
  test('POS Posting screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - POS Posting/i);
    await expectPageTitle(page, 'POS Posting');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, ['Site Code', 'Site', 'Fiscal Year:']);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_ucFiscalYearRegionSelector_rdCmbxFiscalYearRegion_Input',
        'ctl00_UserContentArea_ucFiscalYearRegionSelector_rdCmbxPeriod_Input',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [['ctl00_UserContentArea_ApplyButton', 'Apply']]);
    });
  });
});
