import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Configuration > Custom Allergens (/MenuPlanning/ManageAllergens.aspx)
const PATH = '/MenuPlanning/ManageAllergens.aspx';

test.describe('POS - Configuration - Custom Allergens', () => {
  test('Custom Allergens screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Custom Allergens/i);
    await expectPageTitle(page, 'Custom Allergens');

    await test.step('fields', async () => {
      await expectCaptions(page, [
        'Add Custom Allergen',
        'Data Source',
        'Allergen Description',
        'Allergen Disclaimer',
        'Add Custom Allergen to System',
        'Standard Allergen',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_ucAllergenDataSource_ddlDataSources_Input',
        'ctl00_UserContentArea_rcbAllergens_Input',
        'ctl00_UserContentArea_txtAllergenDescription',
        'ctl00_UserContentArea_txtAllergenDisclaimer',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_btnAdd', 'Add'],
        ['ctl00_UserContentArea_btnDisclaimerEdit', 'Edit'],
        ['ctl00_UserContentArea_btnAddSystemAllergen', 'Add'],
      ]);
    });
  });
});
