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

// POS > Bills > Print Bills (/POS/ExportSalesInvoice.aspx)
const PATH = '/POS/ExportSalesInvoice.aspx';

test.describe('POS - Bills - Print Bills', () => {
  test('Print Bills screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Print Bills/i);
    await expectPageTitle(page, 'Print Bills');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Type',
        'Invoice',
        'Past Due Bill',
        'Fiscal Year',
        'Period',
        'Criteria',
        'Patron Criteria',
        'Active',
        'Inactive',
        'Students',
        'Free',
        'Reduced',
        'Paid',
        'Adults',
        'Bills Criteria',
        'Outstanding Amount: >',
        'Credit Bills',
        'Bad Address Only',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_ucSalesInvoice_ucSearchCriteria_rtbnlistInvoiceTypes_0',
        'ctl00_UserContentArea_ucSalesInvoice_ucSearchCriteria_rtbnlistInvoiceTypes_1',
        'ctl00_UserContentArea_ucSalesInvoice_ucSearchCriteria_cboxActive',
        'ctl00_UserContentArea_ucSalesInvoice_ucSearchCriteria_cboxInactive',
        'ctl00_UserContentArea_ucSalesInvoice_ucSearchCriteria_cboxStudents',
        'ctl00_UserContentArea_ucSalesInvoice_ucSearchCriteria_cboxlistPriceType_0',
        'ctl00_UserContentArea_ucSalesInvoice_ucSearchCriteria_cboxlistPriceType_1',
        'ctl00_UserContentArea_ucSalesInvoice_ucSearchCriteria_cboxlistPriceType_2',
        'ctl00_UserContentArea_ucSalesInvoice_ucSearchCriteria_cboxAdults',
        'ctl00_UserContentArea_ucSalesInvoice_ucSearchCriteria_cboxIncludeCreditBills',
        'ctl00_UserContentArea_ucSalesInvoice_ucSearchCriteria_cboxIncludeBadAddress',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucSalesInvoice_ucSearchCriteria_txtInactiveLength',
        'ctl00_UserContentArea_ucSalesInvoice_ucSearchCriteria_txtOutstandingAmount',
      ]);
      await expectHasOptions(
        page,
        'ctl00_UserContentArea_ucSalesInvoice_ucSearchCriteria_ucFiscalYearPeriod_ddlFiscalYear',
      );
      await expectHasOptions(
        page,
        'ctl00_UserContentArea_ucSalesInvoice_ucSearchCriteria_ucFiscalYearPeriod_ddlPeriod',
      );
    });

    await test.step('actions', async () => {
      await expectButtons(page, [['ctl00_UserContentArea_ucSalesInvoice_btnApply', 'Apply']]);
    });
  });
});
