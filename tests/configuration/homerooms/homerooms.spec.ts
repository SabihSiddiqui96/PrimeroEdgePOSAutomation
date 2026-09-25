import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectGridColumns,
  expectGridResolved,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Configuration > Homerooms (/System/ManageHomeRoom.aspx)
const PATH = '/System/ManageHomeRoom.aspx';
const GRID = 'ctl00_UserContentArea_gridSearch';

test.describe('POS - Configuration - Homerooms', () => {
  test('Homerooms screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Homerooms/i);
    await expectPageTitle(page, 'Homerooms');

    await test.step('filters', async () => {
      await expectCaptions(page, ['Site Code', 'Site', 'Homeroom']);
      await expectVisible(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_ucGradeSelector_rcbGrades_Input',
      ]);
    });

    await test.step('results grid', async () => {
      await expectGridColumns(page, GRID, ['Homeroom', 'Site', 'Grade']);
      await expectGridResolved(page, GRID);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [['ctl00_UserContentArea_btnApply', 'Apply']]);
    });
  });
});
