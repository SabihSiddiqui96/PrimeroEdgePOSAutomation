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

// POS > Patron Reports > Birthday List (/POS/BirthDayList.aspx)
const PATH = '/POS/BirthDayList.aspx';

test.describe('POS - Patron Reports - Birthday List', () => {
  test('Birthday List screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Birthday List/i);
    await expectPageTitle(page, 'Birthday List');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Site Type',
        'Site Code',
        'Site',
        'Date Range',
        'Monthly',
        'Month:',
        'From:',
        'To:',
        'Report Type',
        'Alphabetical',
        'Birth Date',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_monthlyRadioButton',
        'ctl00_UserContentArea_dateRangeRadioButton',
        'ctl00_UserContentArea_rblReportoption_0',
        'ctl00_UserContentArea_rblReportoption_1',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteType_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_fromCalendarPopup_dateInput',
        'ctl00_UserContentArea_toCalendarPopup_dateInput',
      ]);
      await expectHasOptions(page, 'ctl00_UserContentArea_monthlyDropDownList');
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_ReportCaller1_rptRetriever', 'Generate Report'],
      ]);
    });
  });
});
