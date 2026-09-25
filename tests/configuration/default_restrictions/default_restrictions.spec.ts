import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Configuration > Default Restrictions (/POS/ManageDefaultRestriction.aspx)
const PATH = '/POS/ManageDefaultRestriction.aspx';

test.describe('POS - Configuration - Default Restrictions', () => {
  test('Default Restrictions screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Default Restrictions/i);
    await expectPageTitle(page, 'Default Restrictions');

    await test.step('daily restrictions', async () => {
      await expectCaptions(page, [
        'Daily Restrictions',
        'Maximum number of restricted items allowed per day:',
      ]);
      await expectVisible(page, ['ctl00_UserContentArea_txtAllowedItems']);
    });

    await test.step('categorical restrictions', async () => {
      await expectCaptions(page, ['Categorical Restrictions', 'Category List']);
      // The list is the district's own categories, so only its first entry is checked.
      await expectVisible(page, ['ctl00_UserContentArea_chklCategoryList_0']);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_btnApply', 'Apply'],
        ['ctl00_UserContentArea_btnCategoryApply', 'Apply'],
      ]);
    });
  });
});
