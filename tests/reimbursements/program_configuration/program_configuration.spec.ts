import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  content,
  expectButtons,
  expectCaptions,
  expectFilled,
  expectGridColumns,
  expectGridResolved,
  expectHasOptions,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';

// POS > Reimbursements > Program Configuration (/POS/SiteProgramConfiguration.aspx)
const PATH = '/POS/SiteProgramConfiguration.aspx';

test.describe('POS - Reimbursements - Program Configuration', () => {
  test('Program Configuration screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Program Configuration/i);
    await expectPageTitle(page, 'Program Configuration');

    await test.step('filters and fields', async () => {
      await expectCaptions(page, [
        'Academic Year',
        'All Sites',
        'Active Sites',
        'Filter By Meal Type :',
      ]);

      // The configured/not-configured summary carries live site counts
      await expect(
        content(page)
          .getByText(/Not Configured:\s*\d+\s*Site\(s\)/)
          .first(),
        'site configuration summary',
      ).toBeVisible();
      await expectVisible(page, [
        'ctl00_UserContentArea_rbAllActiveSites_0',
        'ctl00_UserContentArea_rbAllActiveSites_1',
      ]);
      await expectFilled(page, [
        'ctl00_UserContentArea_ddlCopyAcademicYear_Input',
        'ctl00_UserContentArea_ddlFilterMeals_Input',
      ]);
      await expectHasOptions(page, 'ctl00_UserContentArea_academicYearDropDownList');
    });

    await test.step('actions', async () => {
      await expectButtons(page, [
        ['ctl00_UserContentArea_applyButton', 'Apply'],
        ['ctl00_UserContentArea_btnCopyConfiguration', 'Copy and Save'],
        ['ctl00_UserContentArea_btnEdit', 'Edit'],
        ['ctl00_UserContentArea_btnEditMealServices', 'Edit All *'],
      ]);
    });

    await test.step('grids', async () => {
      await expectGridColumns(page, 'ctl00_UserContentArea_districtProgramRadGrid_ctl00', [
        'Configure',
        'Program',
        'Classification',
      ]);
      await expectGridResolved(page, 'ctl00_UserContentArea_districtProgramRadGrid_ctl00');
    });
  });
});
