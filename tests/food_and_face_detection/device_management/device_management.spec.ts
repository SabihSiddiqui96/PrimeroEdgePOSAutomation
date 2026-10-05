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

// POS > Food & Face Detection > Device Management (/POS/ManageDevice.aspx)
const PATH = '/POS/ManageDevice.aspx';
const GRID = 'ctl00_UserContentArea_rgdevice';

test.describe('POS - Food & Face Detection - Device Management', () => {
  test('Device Management screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Device Management/i);
    await expectPageTitle(page, 'Device Management');

    await test.step('add a device', async () => {
      await expectCaptions(page, [
        'Add Edge Device',
        'School',
        'Terminal',
        'Serial Number',
        'Alias/Name',
        'Description/Comment',
      ]);
      await expectHasOptions(page, 'ctl00_UserContentArea_ddlschool');
      await expectVisible(page, [
        'ctl00_UserContentArea_ddlTerminal',
        'ctl00_UserContentArea_txtsearialno',
        'ctl00_UserContentArea_txtname',
        'ctl00_UserContentArea_txtcomment',
      ]);
      await expectButtons(page, [['ctl00_UserContentArea_btnadd', 'Add']]);
    });

    await test.step('devices grid', async () => {
      // Rows are the district's registered devices, so only the columns are checked.
      await expectCaptions(page, ['Edge Devices']);
      await expectGridColumns(page, GRID, [
        'School',
        'Terminal',
        'Serial Number',
        'Name',
        'Registered',
        'Comments',
        'Device Mode',
        'Status',
      ]);
      await expectGridResolved(page, GRID);
    });
  });
});
