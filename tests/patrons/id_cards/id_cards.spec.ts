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

// POS > Patrons > ID Cards (/POS/PrintIDCards.aspx)
const PATH = '/POS/PrintIDCards.aspx';

test.describe('POS - Patrons - ID Cards', () => {
  test('ID Cards screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - ID Cards/i);
    await expectPageTitle(page, 'ID Cards');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Site Code',
        'Site',
        'Homeroom',
        'Special Roster',
        'Generate By',
        'Bulk',
        'Individual',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_SearchByRadioButtonList_0',
        'ctl00_UserContentArea_SearchByRadioButtonList_1',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_ucGradeSelector_rcbGrades_Input',
        'ctl00_UserContentArea_ddlHomeRoom_Input',
      ]);
      await expectHasOptions(page, 'ctl00_UserContentArea_ddlSpecialRoster');
    });

    await test.step('actions', async () => {
      await expectButtons(page, [['ctl00_UserContentArea_btnGenerateList', 'Generate ID Card(s)']]);
    });
  });
});
