import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectGridColumns,
  expectHasOptions,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Administration > Record Sales (/POS/ManualSaleBulkEntry.aspx)
//
// Record Sales lands on a real site, terminal and session date, all of which
// are district data - the spec checks they are populated, not what they say.
const PATH = '/POS/ManualSaleBulkEntry.aspx';

test.describe('POS - Administration - Record Sales', () => {
  test('Record Sales screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/Record Sales/i);
    await expectPageTitle(page, 'Record Sales');

    await test.step('session filters', async () => {
      await expectCaptions(page, ['Site Code', 'Site', 'Terminal', 'Session Date', 'Meal Type']);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_calSessionDate_dateInput',
      ]);
      await expectHasOptions(page, 'ctl00_UserContentArea_ddlTerminal');
      await expectHasOptions(page, 'ctl00_UserContentArea_ddlMealType');
    });

    await test.step('meal menu', async () => {
      await expectCaptions(page, ['Meal Menu', 'Meal', 'A La Carte']);
      await expectVisible(page, [
        'ctl00_UserContentArea_rbMealItem_0',
        'ctl00_UserContentArea_rbMealItem_1',
        'ctl00_UserContentArea_ddlMenuItem_Input',
      ]);
    });

    await test.step('entry method', async () => {
      await expectCaptions(page, ['Entry Method', 'Summary', 'Quick', 'Meals Only', 'Detailed']);
      await expectVisible(page, [
        'ctl00_UserContentArea_rbEntryType_0',
        'ctl00_UserContentArea_rbEntryType_1',
        'ctl00_UserContentArea_rbEntryType_2',
        'ctl00_UserContentArea_rbEntryType_3',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_btnApply', 'Apply'],
        ['ctl00_UserContentArea_btnBulkSales', 'Multiple Meals'],
      ]);
    });

    await test.step('detailed sale grid', async () => {
      await expectGridColumns(page, 'ctl00_UserContentArea_gridDetailedSale_ctl00', [
        'ID / PIN',
        'Name',
        'Grade',
        'Homeroom',
        'Balance',
        'Had Meal',
        'A La Carte',
        'Payment',
        'Check #',
        'Card #',
      ]);
    });
  });
});
