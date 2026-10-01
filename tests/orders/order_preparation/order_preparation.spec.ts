import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectGridResolved,
  expectHasOptions,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Orders > Order Preparation (/POS/ManageOnlineOrders.aspx)
const PATH = '/POS/ManageOnlineOrders.aspx';
const GRID = 'ctl00_UserContentArea_rgIndividualOrders';

test.describe('POS - Orders - Order Preparation', () => {
  test('Order Preparation screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Order Preparation/i);
    await expectPageTitle(page, 'Order Preparation');

    await test.step('filters', async () => {
      await expectCaptions(page, [
        'Site Code',
        'Site',
        'Meal Type',
        'Fulfillment Type',
        'Serving Location',
        'Order Status',
        'Fulfill On',
        'Daily',
        'From:',
        'Monthly',
        'Month:',
        'Year:',
        'Date Range',
        'To:',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_ucBasicReportInput_dailyCalendarPopup_dateInput',
        'ctl00_UserContentArea_ucBasicReportInput_fromCalendarPopup_dateInput',
        'ctl00_UserContentArea_ucBasicReportInput_toCalendarPopup_dateInput',
      ]);
      await expectHasOptions(page, 'ctl00_UserContentArea_ucBasicReportInput_monthlyDropDownList');
      await expectHasOptions(page, 'ctl00_UserContentArea_ucBasicReportInput_yearDropDownList');
    });

    await test.step('order views', async () => {
      await expectCaptions(page, [
        'Orders',
        'Bulk Orders',
        'Order/Item Summary',
        'Bundled Orders Only',
        'Change Order Status',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_ucBasicReportInput_dailyRadioButton',
        'ctl00_UserContentArea_ucBasicReportInput_monthlyRadioButton',
        'ctl00_UserContentArea_ucBasicReportInput_dateRangeRadioButton',
        'ctl00_UserContentArea_rdbIndividualOrders',
        'ctl00_UserContentArea_rdbBulkOrders',
        'ctl00_UserContentArea_rdbOrderSummary',
        'ctl00_UserContentArea_rdbBundledOnly',
      ]);
      await expectGridResolved(page, GRID);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_btnApply', 'Apply'],
        ['ctl00_UserContentArea_btnExport', 'Export'],
        ['ctl00_UserContentArea_btnUpdate', 'Save'],
      ]);
    });
  });
});
