import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectHasOptions,
  expectPageTitle,
} from '../../../utils/screen';

// POS > Configuration > Terminals (/POS/ManageTerminals.aspx)
const PATH = '/POS/ManageTerminals.aspx';

test.describe('POS - Configuration - Terminals', () => {
  test('Terminals screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Terminals/i);
    await expectPageTitle(page, 'Terminals');

    await test.step('filters', async () => {
      await expectCaptions(page, ['Site Code', 'Site', 'Terminal Type', 'Terminals']);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
      ]);
      await expectHasOptions(page, 'ctl00_UserContentArea_ddlTerminalType');
    });

    await test.step('actions', async () => {
      await expectButtons(page, [['ctl00_UserContentArea_btnApply', 'Apply']]);
    });
  });
});
