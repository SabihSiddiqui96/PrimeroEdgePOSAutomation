import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Administration > Reminders (/POS/PrintReminders.aspx)
const PATH = '/POS/PrintReminders.aspx';

test.describe('POS - Administration - Reminders', () => {
  test('Reminders screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/Reminders/i);
    await expectPageTitle(page, 'Reminders');

    await test.step('site filters', async () => {
      await expectCaptions(page, ['Site Code', 'Site', 'HomeRoom']);
      await expectFilled(page, [
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSiteCode_Input',
        'ctl00_UserContentArea_ucAreaSiteSelector_rcbSite_Input',
        'ctl00_UserContentArea_ucGradeSelector_rcbGrades_Input',
        'ctl00_UserContentArea_ddlHomeRoom_Input',
      ]);
    });

    await test.step('patron criteria', async () => {
      await expectCaptions(page, [
        'Patron Criteria',
        'Students',
        'Active',
        'Inactive',
        'Free',
        'Reduced',
        'Paid',
        'Staff',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_rbStudent',
        'ctl00_UserContentArea_cboxStudentActive',
        'ctl00_UserContentArea_cboxStudentInactive',
        'ctl00_UserContentArea_chkStudentPriceTypeList_0',
        'ctl00_UserContentArea_chkStudentPriceTypeList_1',
        'ctl00_UserContentArea_chkStudentPriceTypeList_2',
        'ctl00_UserContentArea_rbStaff',
      ]);
    });

    await test.step('site criteria', async () => {
      await expectCaptions(page, ['Site Criteria', 'Exclude CEP/Provision II Sites']);
      await expectVisible(page, ['ctl00_UserContentArea_chkCEP']);
    });

    await test.step('balance criteria', async () => {
      await expectCaptions(page, [
        'Balance Criteria',
        'Below',
        'Between',
        'Above',
        'All Balances',
        'Balance Below:',
        'Exclude $0.00',
        'Exclude No Charge',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_rdlBalance_0',
        'ctl00_UserContentArea_rdlBalance_1',
        'ctl00_UserContentArea_rdlBalance_2',
        'ctl00_UserContentArea_rdlBalance_3',
        'ctl00_UserContentArea_excludeZeroCheckBox',
        'ctl00_UserContentArea_excludeNoChargeCheckBox',
      ]);
      await expectFilled(page, ['ctl00_UserContentArea_txtBalanceBelow1']);
    });

    await test.step('print criteria', async () => {
      await expectCaptions(page, ['Print Criteria', 'Single', 'Multiple (3)']);
      await expectVisible(page, [
        'ctl00_UserContentArea_radioButtonStandardReminder',
        'ctl00_UserContentArea_radioButtonMultipleReminder',
      ]);
    });

    await test.step('actions', async () => {
      await expectButtons(page, [['ctl00_UserContentArea_btnApply', 'Apply']]);
    });
  });
});
