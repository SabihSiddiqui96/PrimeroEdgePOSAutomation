import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectHasOptions,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Bills > Generate Bills (/pos/GenerateSalesInvoice.aspx)
const PATH = '/pos/GenerateSalesInvoice.aspx';

test.describe('POS - Bills - Generate Bills', () => {
  test('Generate Bills screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Generate Bills/i);
    await expectPageTitle(page, 'Generate Bills');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Site Code',
        'Site',
        'Fiscal Year',
        'Period',
        'Status:',
        'Seniors Only',
      ]);
      await expectVisible(page, ['ctl00_UserContentArea_cboxSeniorsOnly']);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
      ]);
      await expectHasOptions(page, 'ctl00_UserContentArea_ucFiscalYearPeriod_ddlFiscalYear');
      await expectHasOptions(page, 'ctl00_UserContentArea_ucFiscalYearPeriod_ddlPeriod');
      await expectHasOptions(page, 'ctl00_UserContentArea_ddlStatus');
    });

    await test.step('actions', async () => {
      await expectButtons(page, [['ctl00_UserContentArea_btnApply', 'Apply']]);
    });
  });
});
