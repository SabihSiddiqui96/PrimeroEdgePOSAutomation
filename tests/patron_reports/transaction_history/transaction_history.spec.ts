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

// POS > Patron Reports > Transaction History (/POS/TransactionHistoryReport.aspx)
const PATH = '/POS/TransactionHistoryReport.aspx';

test.describe('POS - Patron Reports - Transaction History', () => {
  test('Transaction History screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Transaction History/i);
    await expectPageTitle(page, 'Transaction History');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Show Transaction Details',
        'Date Range',
        'Daily',
        'From:',
        'Monthly',
        'Month:',
        'Year:',
        'To:',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_ucStudentLookUp_txtStudentID',
        'ctl00_UserContentArea_transactioDetailCheckBox',
        'ctl00_UserContentArea_dailyRadioButton',
        'ctl00_UserContentArea_monthlyRadioButton',
        'ctl00_UserContentArea_dateRangeRadioButton',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_dailyCalendarPopup_dateInput',
        'ctl00_UserContentArea_fromCalendarPopup_dateInput',
        'ctl00_UserContentArea_toCalendarPopup_dateInput',
      ]);
      await expectHasOptions(page, 'ctl00_UserContentArea_monthlyDropDownList');
      await expectHasOptions(page, 'ctl00_UserContentArea_yearDropDownList');
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_ucStudentLookUp_btnStudentID', 'Look Up ...'],
        ['ctl00_UserContentArea_btnPrincipal', 'Principal ...'],
        ['ctl00_UserContentArea_ReportCaller1_rptRetriever', 'Generate Report'],
      ]);
    });
  });
});
