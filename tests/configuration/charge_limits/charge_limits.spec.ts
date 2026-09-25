import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectGridResolved,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Configuration > Charge Limits (/POS/ManageChargeLimits.aspx)
const PATH = '/POS/ManageChargeLimits.aspx';
const GRID = 'ctl00_UserContentArea_rgSiteBasedChargeGrid';

test.describe('POS - Configuration - Charge Limits', () => {
  test('Charge Limits screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Charge Limits/i);
    await expectPageTitle(page, 'Charge Limits');

    await test.step('bulk apply fields', async () => {
      await expectCaptions(page, [
        'Bulk Apply (Select below to Apply)',
        'Free',
        'Reduced',
        'Paid',
        'Staff',
        'Visitor',
        'Prog Adult',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_txtFreeMeal',
        'ctl00_UserContentArea_txtReducedMeal',
        'ctl00_UserContentArea_txtPaidMeal',
        'ctl00_UserContentArea_txtStaffMeal',
        'ctl00_UserContentArea_txtVisitorMeal',
        'ctl00_UserContentArea_txtProgAdultMeal',
        'ctl00_UserContentArea_txtFreeALaCarte',
        'ctl00_UserContentArea_txtReducedALaCarte',
        'ctl00_UserContentArea_txtPaidALaCarte',
        'ctl00_UserContentArea_txtStaffALaCarte',
        'ctl00_UserContentArea_txtVisitorALaCarte',
        'ctl00_UserContentArea_txtProgAdultALaCarte',
      ]);
    });

    await test.step('site grid', async () => {
      // Rows are the district's sites and their amounts, so only the headings count.
      await expectCaptions(page, [
        'School Name',
        'Free(Meal / ALC)',
        'Reduced(Meal / ALC)',
        'Paid(Meal / ALC)',
        'Staff(Meal / ALC)',
        'Visitor(Meal / ALC)',
        'Prog Adult(Meal / ALC)',
      ]);
      await expectGridResolved(page, GRID);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [['ctl00_UserContentArea_btnApplyTo', 'Apply To Selected']]);
    });
  });
});
