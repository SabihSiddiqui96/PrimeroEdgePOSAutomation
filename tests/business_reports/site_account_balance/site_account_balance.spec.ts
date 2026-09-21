import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Business Reports > Site Account Balance (/POS/SchoolAccountBalanceReport.aspx)
const PATH = '/POS/SchoolAccountBalanceReport.aspx';

test.describe('POS - Business Reports - Site Account Balance', () => {
  test('Site Account Balance screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Site Account Balance/i);
    await expectPageTitle(page, 'Site Account Balance');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, ['Site Code', 'Site', 'Date']);
      await expectVisible(page, ['ctl00_UserContentArea_chbxIncludeSpecialPerson']);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_ApprovalCalendarPopup_dateInput',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_ReportCaller1_rptRetriever', 'Generate Report'],
      ]);
    });
  });
});
