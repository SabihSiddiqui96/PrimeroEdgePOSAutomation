import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectHasOptions,
  expectPageTitle,
} from '../../../utils/screen';

// POS > Daily Reports > Edit Check Worksheet (/POS/EditCheckWorksheet.aspx)
const PATH = '/POS/EditCheckWorksheet.aspx';

test.describe('POS - Daily Reports - Edit Check Worksheet', () => {
  test('Edit Check Worksheet screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Edit Check Worksheet/i);
    await expectPageTitle(page, 'Edit Check Worksheet');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Reporting Group',
        'Site Type',
        'Site Code',
        'Site',
        'Meal Type',
        'Month:',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucReportingGroupSelector_rcbReportingGroup_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteType_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_calMonth1_dateInput',
      ]);
      await expectHasOptions(page, 'ctl00_UserContentArea_mealTypeDropDownList');
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_ReportCaller1_rptRetriever', 'Generate Report'],
      ]);
    });
  });
});
