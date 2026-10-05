import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';

// POS > Orders > Order Fulfillment (/POS/OrderFulfillment.aspx)
// Angular rather than WebForms: no ctl00_ ids, and no #ctl00_page_content to
// scope to, so the shared screen helpers do not apply here.
const PATH = '/POS/OrderFulfillment.aspx';

test.describe('POS - Orders - Order Fulfillment', () => {
  test('Order Fulfillment screen', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Order Fulfillment/i);

    await test.step('filters', async () => {
      for (const label of ['Site', 'Meal Type', 'Fulfillment']) {
        await expect(
          page.getByText(label, { exact: true }).locator('visible=true').first(),
          `label "${label}"`,
        ).toBeVisible();
      }
    });

    await test.step('actions', async () => {
      // The generated mat- ids are positional, so these go by their captions.
      for (const name of ['Today', 'Select Dates', 'Reset', 'Load Orders']) {
        await expect(
          page.getByRole('button', { name, exact: true }),
          `button "${name}"`,
        ).toBeVisible();
      }
    });
  });
});
