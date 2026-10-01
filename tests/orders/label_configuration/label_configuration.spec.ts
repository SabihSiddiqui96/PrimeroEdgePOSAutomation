import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Orders > Label Configuration (/POS/OrdLabelConfiguration.aspx)
const PATH = '/POS/OrdLabelConfiguration.aspx';

test.describe('POS - Orders - Label Configuration', () => {
  test('Label Configuration screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Label Configuration/i);
    await expectPageTitle(page, 'Label Configuration');

    await test.step('template fields', async () => {
      await expectCaptions(page, [
        'Site Code',
        'Site',
        'Label Template Status',
        'Label Template',
        'Is Active',
        'Label Width (Pixels)',
        'Label Height (Pixels)',
        'Label Dimensions',
        'Label Content',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_rbtnNeworUpdate_0',
        'ctl00_UserContentArea_rbtnNeworUpdate_1',
        'ctl00_UserContentArea_chkLabelStatus',
        'ctl00_UserContentArea_rblFormType_0',
        'ctl00_UserContentArea_rblFormType_1',
        'ctl00_UserContentArea_txtTemplateName',
        'ctl00_UserContentArea_rtbLabelWidth',
        'ctl00_UserContentArea_rtbLabelHeight',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_btnAddNewLabel', 'Add Field'],
        ['ctl00_UserContentArea_btnSave', 'Save'],
        ['ctl00_UserContentArea_btnCancel', 'Cancel'],
      ]);
    });
  });
});
