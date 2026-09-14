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

// POS > Reimbursements > Reimbursement Claims (/POS/ManageReimbursementClaims.aspx)
const PATH = '/POS/ManageReimbursementClaims.aspx';

test.describe('POS - Reimbursements - Reimbursement Claims', () => {
  test('Reimbursement Claims screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Reimbursement Claims/i);
    await expectPageTitle(page, 'Reimbursement Claims');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'By Period (View, Submit and Export)',
        'By Period Range (View Only)',
        'Year',
        'Period',
      ]);
      await expectVisible(page, [
        'ctl00_UserContentArea_rblClaimOptions_0',
        'ctl00_UserContentArea_rblClaimOptions_1',
      ]);
      await expectHasOptions(page, 'ctl00_UserContentArea_academicYearDropDownList');
      await expectHasOptions(page, 'ctl00_UserContentArea_periodDropDownList');
    });

    await test.step('actions', async () => {
      await expectButtons(page, [['ctl00_UserContentArea_applyButton', 'Apply']]);
    });

    await test.step('grids', async () => {
      await expectGridColumns(page, 'ctl00_UserContentArea_claimsRadGrid_ctl00', [
        'ClaimId',
        'dISTRICT',
        'Academic Year',
        'Month',
        'SNP Amount',
        'SSO Amount',
        'Generated On',
        'Submitted',
        'Received',
        'Reports',
      ]);
      await expectGridResolved(page, 'ctl00_UserContentArea_claimsRadGrid_ctl00');
    });
  });
});
