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

// POS > Administration > Special Roster (/POS/SpecialRoster.aspx)
const PATH = '/POS/SpecialRoster.aspx';

test.describe('POS - Administration - Special Roster', () => {
  test('Special Roster screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/Special Roster/i);
    await expectPageTitle(page, 'Special Roster');

    await test.step('site filters', async () => {
      await expectCaptions(page, ['Site Code', 'Site']);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_btnApply', 'Apply'],
        ['ctl00_UserContentArea_btnAdd', 'Add ...'],
      ]);
    });

    await test.step('special roster grid', async () => {
      await expectGridColumns(page, 'ctl00_UserContentArea_gridSpecialRoster_ctl00', [
        'Region',
        'School Name',
        'Roster Name',
      ]);
      await expectGridResolved(page, 'ctl00_UserContentArea_gridSpecialRoster_ctl00');
    });
  });
});
