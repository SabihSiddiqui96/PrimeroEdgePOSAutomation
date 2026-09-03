import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectGridColumns,
  expectGridResolved,
  expectPageTitle,
} from '../../../utils/screen';

// POS > Administration > Additional Income (/POS/POSAdditionalIncome.aspx)
const PATH = '/POS/POSAdditionalIncome.aspx';

test.describe('POS - Administration - Additional Income', () => {
  test('Additional Income screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/Additional Income/i);
    await expectPageTitle(page, 'Additional Income');

    await test.step('search filters', async () => {
      await expectCaptions(page, ['Site Code', 'Site', 'From', 'To']);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_fromCalendarPopup_dateInput',
        'ctl00_UserContentArea_toCalendarPopup_dateInput',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_btnApply', 'Apply'],
        ['ctl00_UserContentArea_btnAdd', 'Add...'],
      ]);
    });

    await test.step('additional income grid', async () => {
      await expectGridColumns(page, 'ctl00_UserContentArea_RadGridAdditionalIncome_ctl00', [
        'Site',
        'Amount',
        'Entry Date',
        'Entered By',
      ]);
      await expectGridResolved(page, 'ctl00_UserContentArea_RadGridAdditionalIncome_ctl00');
    });
  });
});
