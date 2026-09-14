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

// POS > Bills > View Bills (/POS/StudentSalesInvoices.aspx)
const PATH = '/POS/StudentSalesInvoices.aspx';

test.describe('POS - Bills - View Bills', () => {
  test('View Bills screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - View Bills/i);
    await expectPageTitle(page, 'View Bills');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'By Site',
        'By Student',
        'By Invoice #',
        'Site Code',
        'Site',
        'Type',
        'Invoice',
        'Past Due Bill',
        'Fiscal Year',
        'Period',
        'Criteria',
        'All',
        'Apply Filters',
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
        'ctl00_UserContentArea_rbtnCriteria_0',
        'ctl00_UserContentArea_rbtnCriteria_1',
        'ctl00_UserContentArea_rbtnCriteria_2',
        'ctl00_UserContentArea_ucSearchCriteria_rtbnlistInvoiceTypes_0',
        'ctl00_UserContentArea_ucSearchCriteria_rtbnlistInvoiceTypes_1',
        'ctl00_UserContentArea_ucSearchCriteria_rbtnAll',
        'ctl00_UserContentArea_ucSearchCriteria_rbtnFilters',
        'ctl00_UserContentArea_ucSearchCriteria_cboxActive',
        'ctl00_UserContentArea_ucSearchCriteria_cboxInactive',
        'ctl00_UserContentArea_ucSearchCriteria_cboxStudents',
        'ctl00_UserContentArea_ucSearchCriteria_cboxlistPriceType_0',
        'ctl00_UserContentArea_ucSearchCriteria_cboxlistPriceType_1',
        'ctl00_UserContentArea_ucSearchCriteria_cboxlistPriceType_2',
        'ctl00_UserContentArea_ucSearchCriteria_cboxAdults',
        'ctl00_UserContentArea_ucSearchCriteria_cboxIncludeCreditBills',
        'ctl00_UserContentArea_ucSearchCriteria_cboxIncludeBadAddress',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_ucGradeSelector_rcbGrades_Input',
        'ctl00_UserContentArea_ucSearchCriteria_txtInactiveLength',
        'ctl00_UserContentArea_ucSearchCriteria_txtOutstandingAmount',
      ]);
      await expectHasOptions(
        page,
        'ctl00_UserContentArea_ucSearchCriteria_ucFiscalYearPeriod_ddlFiscalYear',
      );
      await expectHasOptions(
        page,
        'ctl00_UserContentArea_ucSearchCriteria_ucFiscalYearPeriod_ddlPeriod',
      );
    });

    await test.step('actions', async () => {
      await expectButtons(page, [['ctl00_UserContentArea_btnApply', 'Apply']]);
    });
  });
});
