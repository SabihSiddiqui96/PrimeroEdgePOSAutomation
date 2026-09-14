import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Bills > NACHA Configuration (/POS/ManageNachaDetails.aspx)
const PATH = '/POS/ManageNachaDetails.aspx';

test.describe('POS - Bills - NACHA Configuration', () => {
  test('NACHA Configuration screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - NACHA Configuration/i);
    await expectPageTitle(page, 'NACHA Configuration');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Immediate Destination',
        'Immediate Origin',
        'Immediate Destination Name',
        'Immediate Origin Name',
        'Company Identification',
        'Company Entry Description',
        'Bank Routing Number',
        'Bank Account Number',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_ImmDestTextBox',
        'ctl00_UserContentArea_ImmOrgTextBox',
        'ctl00_UserContentArea_ImmDestNameTextBox',
        'ctl00_UserContentArea_ImmOrgNameTextBox',
        'ctl00_UserContentArea_CompanyIdentTextBox',
        'ctl00_UserContentArea_CompanyEntDescTextBox',
        'ctl00_UserContentArea_BnkRoutingNumTextBox',
        'ctl00_UserContentArea_BnkAccountNumTextBox',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_SaveNACHADetailsButton', 'Save NACHA Details'],
      ]);
    });
  });
});
