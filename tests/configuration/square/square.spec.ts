import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectGridColumns,
  expectGridResolved,
  expectHasOptions,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Configuration > Square (/POS/Square.aspx)
const PATH = '/POS/Square.aspx';
const GRID = 'ctl00_UserContentArea_gridPayments';

test.describe('POS - Configuration - Square', () => {
  test('Square screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Square/i);
    await expectPageTitle(page, 'Square');

    await test.step('filters', async () => {
      await expectCaptions(page, ['School', 'POS Terminal', 'Status']);
      await expectHasOptions(page, 'ctl00_UserContentArea_ddlSchool');
      await expectHasOptions(page, 'ctl00_UserContentArea_ddlStatus');
      // Terminal and Location only fill in once a school is chosen.
      await expectVisible(page, [
        'ctl00_UserContentArea_ddlTerminal',
        'ctl00_UserContentArea_ddlLocation',
      ]);
    });

    await test.step('add a terminal', async () => {
      await expectCaptions(page, [
        'Add New Square Terminal',
        'Square Location',
        'Square Terminal Name',
        'Authorization Actions',
      ]);
      await expectVisible(page, ['ctl00_UserContentArea_txtName']);
    });

    await test.step('terminals grid', async () => {
      await expectGridColumns(page, GRID, [
        'School',
        'POS Terminal',
        'Square Terminal Name',
        'Login Code',
        'Status',
        'Device ID',
        'Authorization',
      ]);
      await expectGridResolved(page, GRID);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_btnApply', 'Apply'],
        ['ctl00_UserContentArea_btnAdd', 'Add'],
        ['ctl00_UserContentArea_btn_newAuthorization', 'New Authorization'],
        ['ctl00_UserContentArea_btn_revokeAuthorization', 'Revoke Authorization'],
      ]);
    });
  });
});
