import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectHasOptions,
  expectPageTitle,
} from '../../../utils/screen';

// POS > Administration > Letter Templates (/POS/LetterTemplates.aspx)
const PATH = '/POS/LetterTemplates.aspx';

test.describe('POS - Administration - Letter Templates', () => {
  test('Letter Templates screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/Letter Templates/i);
    await expectPageTitle(page, 'Letter Templates');

    await test.step('letter type and language', async () => {
      await expectCaptions(page, ['Letter Type', 'Language']);
      await expectHasOptions(page, 'ctl00_UserContentArea_ucLetterTenplate_ddlLetterType');
      await expectHasOptions(page, 'ctl00_UserContentArea_ucLetterTenplate_ddlLanguage');
    });

    await test.step('actions', async () => {
      await expectButtons(page, [['ctl00_UserContentArea_ucLetterTenplate_btnApply', 'Apply']]);
    });
  });
});
