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

// POS > Business Reports > Billing Summary (/POS/SalesInvoiceReport.aspx)
const PATH = '/POS/SalesInvoiceReport.aspx';

test.describe('POS - Business Reports - Billing Summary', () => {
  test('Billing Summary screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Billing Summary/i);
    await expectPageTitle(page, 'Billing Summary');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Site Code',
        'Site',
        'Fiscal Year',
        'Period',
        'Invoice Options',
        'All Invoices',
        'Outstanding Invoices',
        'Patron Options',
        'Students',
        'Adults',
        'All',
        'Report Option',
        'Order by Homeroom',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_RadioButtonList1_0',
        'ctl00_UserContentArea_RadioButtonList1_1',
        'ctl00_UserContentArea_studentRadioButton',
        'ctl00_UserContentArea_adultRadioButton',
        'ctl00_UserContentArea_allRadioButton',
        'ctl00_UserContentArea_OrderCheckBox',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
      ]);
      await expectHasOptions(page, 'ctl00_UserContentArea_ucFiscalYearPeriod_ddlFiscalYear');
      await expectHasOptions(page, 'ctl00_UserContentArea_ucFiscalYearPeriod_ddlPeriod');
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_ReportCaller1_rptRetriever', 'Generate Report'],
      ]);
    });
  });
});
