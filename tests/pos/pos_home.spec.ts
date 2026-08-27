import { test, expect } from '@playwright/test';
import { openPointOfService, POS_SECTIONS, districtSelector } from '../../utils/pos';
import { getDistrictName, getPosHomePath } from '../../utils/baseUrl';

test.describe('POS - Home', () => {
  test('Point of Service opens from the dashboard and shows every section', async ({ page }) => {
    const pos = await openPointOfService(page);

    await expect(pos).toHaveURL(new RegExp(getPosHomePath().replace(/\//g, '\\/'), 'i'));
    await expect(pos).toHaveTitle(/POS Home/i);

    for (const section of POS_SECTIONS) {
      await expect(
        pos.getByText(section, { exact: true }).first(),
        `"${section}" is listed on POS Home`,
      ).toBeVisible();
    }
  });

  test('POS Home loads against the configured district', async ({ page }) => {
    const pos = await openPointOfService(page);

    await expect(districtSelector(pos)).toContainText(new RegExp(getDistrictName(), 'i'));
  });
});
