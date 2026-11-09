import { test, expect } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import { expectButtons, expectCaptions, expectGridColumns, expectGridResolved, expectHasOptions, expectPageTitle } from '../../../utils/screen';
import { TEST_SITE_CODE, TEST_SITE_NAME } from '../../../utils/testData';
import { gridRows } from '../../../utils/webforms';

// POS > Administration > View Session (/POS/ViewSession.aspx)
const PATH = '/POS/ViewSession.aspx';
const ID = 'ctl00_UserContentArea_';
const SALES = `#${ID}gridSales_ctl00`;
const PAYMENTS = `#${ID}gridPayments_ctl00`;
const SUMMARY = ['Cashier', 'Opening Balance', 'Opening Session Date/Time', 'Meals Served', 'Total Cash', 'Total Checks', 'Total Cards', 'Total Sales'];

test.describe('POS - Administration - View Session', () => {
  test('View Session: schools, their terminals, the session summary and both grids', async ({ page }) => {
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/View Session/i);
    await expectPageTitle(page, 'View Session');

    await test.step('every school, sorted, with the first one’s terminals loaded', async () => {
      await expectCaptions(page, ['School', 'Terminal', 'Sales', 'Payments', ...SUMMARY]);
      await expectHasOptions(page, `${ID}ddlSchool`);
      await expectHasOptions(page, `${ID}ddlTerminal`);
      const schools = (await page.locator(`#${ID}ddlSchool option`).allInnerTexts()).map((s) => s.trim());
      expect(schools, 'schools in name order').toEqual([...schools].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
      expect(schools.map((s) => s.toLowerCase())).toContain(TEST_SITE_NAME.toLowerCase());
      await expectButtons(page, [[`${ID}btnApply`, 'Apply']]);
      await expectGridColumns(page, SALES.slice(1), ['Student Name', 'Meal Type', 'Type', 'Amount']);
      await expectGridColumns(page, PAYMENTS.slice(1), ['Student Name', 'Payment', 'Amount', 'Check Number', 'Card Number']);
      await expectGridResolved(page, SALES.slice(1));
      await expectGridResolved(page, PAYMENTS.slice(1));
    });

    const terminals = await test.step('picking a school loads only that school’s terminals', async () => {
      const before = await page.locator(`#${ID}ddlTerminal option`).allInnerTexts();
      const school = page.locator(`#${ID}ddlSchool`);
      const label = (await school.locator('option').allInnerTexts()).find((o) => o.trim().toLowerCase() === TEST_SITE_NAME.toLowerCase())!;
      await school.selectOption({ label });
      await expect.poll(async () => page.locator(`#${ID}ddlTerminal option`).allInnerTexts(), { message: 'terminals reload' }).not.toEqual(before);
      const after = (await page.locator(`#${ID}ddlTerminal option`).allInnerTexts()).map((t) => t.trim());
      expect(after.length).toBeGreaterThan(1);
      expect(after.filter((t) => new RegExp(`[-_]${TEST_SITE_CODE}$`).test(t)).length, 'the school’s own terminals').toBeGreaterThan(after.length / 2);
      return after;
    });

    await test.step('a terminal with no open session shows an empty summary and no sales or payments', async () => {
      const terminal = terminals.find((t) => new RegExp(`^SITE_\\d+_${TEST_SITE_CODE}$`).test(t)) ?? terminals[0];
      await page.locator(`#${ID}ddlTerminal`).selectOption({ label: terminal });
      await page.locator(`#${ID}btnApply`).click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator(`#${ID}ddlTerminal option:checked`)).toHaveText(terminal);
      await expect(page.locator(`#${ID}ddlSchool option:checked`)).toHaveText(new RegExp(`^${TEST_SITE_NAME}$`, 'i'));
      const text = (await page.locator('#ctl00_page_content').innerText()).replace(/\s+/g, ' ');
      if (/Opening Balance \$/.test(text)) {
        test.info().annotations.push({ type: 'open session', description: `${terminal} has a session open; the empty case wasn't checked` });
        return;
      }
      expect(await gridRows(page, SALES)).toEqual([]);
      expect(await gridRows(page, PAYMENTS)).toEqual([]);
      await expect(page.locator(SALES)).toContainText('No records to display.');
      await expect(page.locator(PAYMENTS)).toContainText('No records to display.');
    });
  });
});
