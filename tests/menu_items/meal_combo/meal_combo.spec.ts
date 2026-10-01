import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import { expectButtons, expectCaptions, expectPageTitle } from '../../../utils/screen';

// POS > Menu Items > Meal Combo (/POS/MealCombo.aspx)
const PATH = '/POS/MealCombo.aspx';

test.describe('POS - Menu Items - Meal Combo', () => {
  test('Meal Combo screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Meal Combo/i);
    await expectPageTitle(page, 'Meal Combo');

    await test.step('sections', async () => {
      // Component names and contribution values are the district's own setup.
      await expectCaptions(page, [
        'Menu Item',
        'Contributions',
        'Component Groups',
        'Components',
        'Contribution Values',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_btnEdit', 'Edit'],
        ['ctl00_UserContentArea_btnMealComboContributionEdit', 'Edit'],
        ['ctl00_UserContentArea_btnComponentGroupEdit', 'Edit'],
      ]);
    });
  });
});
