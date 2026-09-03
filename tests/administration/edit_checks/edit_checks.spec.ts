import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectHasOptions,
  expectOptions,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Administration > Edit Checks (/POS/ManageEditCheck.aspx)
//
// Month names are the one list asserted in full: they are an application
// constant. The year dropdown rolls forward every January, so it is only
// checked for offering years at all.
//
// Daily, Monthly and Date Range are mutually exclusive, and this only checks
// that all three are present and pre-filled. Which one is active, and that
// switching between them enables the right inputs, is behaviour rather than
// screen shape - it belongs with the functional pass.
const PATH = '/POS/ManageEditCheck.aspx';

test.describe('POS - Administration - Edit Checks', () => {
  test('Edit Checks screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/Edit Checks/i);
    await expectPageTitle(page, 'Edit Checks');

    await test.step('site filters', async () => {
      await expectCaptions(page, ['Site Code', 'Site']);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
      ]);
    });

    await test.step('date range modes', async () => {
      await expectCaptions(page, [
        'Date Range',
        'Daily',
        'Monthly',
        'Month:',
        'Year:',
        'From:',
        'To:',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_ucBasicReportInput_dailyRadioButton',
        'ctl00_UserContentArea_ucBasicReportInput_monthlyRadioButton',
        'ctl00_UserContentArea_ucBasicReportInput_dateRangeRadioButton',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucBasicReportInput_dailyCalendarPopup_dateInput',
        'ctl00_UserContentArea_ucBasicReportInput_fromCalendarPopup_dateInput',
        'ctl00_UserContentArea_ucBasicReportInput_toCalendarPopup_dateInput',
      ]);
      await expectHasOptions(page, 'ctl00_UserContentArea_ucBasicReportInput_yearDropDownList');
      await expectOptions(page, 'ctl00_UserContentArea_ucBasicReportInput_monthlyDropDownList', [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ]);
    });

    await test.step('resolved filter', async () => {
      await expectCaptions(page, ['All', 'Resolved', 'Unresolved']);
      await expectVisible(page, [
        'ctl00_UserContentArea_RBLResolvedType_0',
        'ctl00_UserContentArea_RBLResolvedType_1',
        'ctl00_UserContentArea_RBLResolvedType_2',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [['ctl00_UserContentArea_btnApply', 'Apply']]);
    });
  });
});
