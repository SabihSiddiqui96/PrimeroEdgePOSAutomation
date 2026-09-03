import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectGridColumns,
  expectGridResolved,
  expectHasOptions,
  expectPageTitle,
} from '../../../utils/screen';

// POS > Administration > View Session (/POS/ViewSession.aspx)
const PATH = '/POS/ViewSession.aspx';

test.describe('POS - Administration - View Session', () => {
  test('View Session screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/View Session/i);
    await expectPageTitle(page, 'View Session');

    await test.step('school and terminal filters', async () => {
      await expectCaptions(page, ['School', 'Terminal']);
      await expectHasOptions(page, 'ctl00_UserContentArea_ddlSchool');
      await expectHasOptions(page, 'ctl00_UserContentArea_ddlTerminal');
    });

    await test.step('actions', async () => {
      await expectButtons(page, [['ctl00_UserContentArea_btnApply', 'Apply']]);
    });

    await test.step('sales and payments grids', async () => {
      await expectGridColumns(page, 'ctl00_UserContentArea_gridSales_ctl00', [
        'Student Name',
        'Meal Type',
        'Type',
        'Amount',
      ]);
      await expectGridColumns(page, 'ctl00_UserContentArea_gridPayments_ctl00', [
        'Student Name',
        'Payment',
        'Amount',
        'Check Number',
        'Card Number',
      ]);
      await expectGridResolved(page, 'ctl00_UserContentArea_gridSales_ctl00');
      await expectGridResolved(page, 'ctl00_UserContentArea_gridPayments_ctl00');
    });
  });
});
