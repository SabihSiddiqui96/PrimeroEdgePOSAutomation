import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Management > POS Periods (/POS/ManagePOSPeriods.aspx)
const PATH = '/POS/ManagePOSPeriods.aspx';

test.describe('POS - Management - POS Periods', () => {
  test('POS Periods screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - POS Periods/i);
    await expectPageTitle(page, 'POS Periods');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Period Type',
        'Fiscal Year',
        'Period',
        'Status',
        'Site Code',
        'Site',
        'Show Current Status Only',
      ]);
      await expectVisible(page, ['ctl00_UserContentArea_cboxCurrentStatusOnly']);
      await expectFilled(page, [
        'ctl00_UserContentArea_PeriodTypeDropDownList_Input',
        'ctl00_UserContentArea_FiscalYearDropDownList_Input',
        'ctl00_UserContentArea_PeriodDropDownList_Input',
        'ctl00_UserContentArea_StatusDropDownList_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_GetPeriodsButton', 'Get Periods'],
        ['ctl00_UserContentArea_rcPeriodHistory_rptRetriever', 'Generate Report'],
      ]);
    });
  });
});
