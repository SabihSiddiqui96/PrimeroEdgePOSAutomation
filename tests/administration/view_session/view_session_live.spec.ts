import { test, expect, Page } from '@playwright/test';
import { expressPointInstalled } from '../../../utils/expresspoint/launch';
import { DEFAULT_PATRON_ID, OpenSession, recordChargedSession } from '../../../utils/expresspoint/session';
import { openPosPage } from '../../../utils/pos';
import { gridRows, money } from '../../../utils/webforms';

// POS > Administration > View Session, watching a session that is open on ExpressPoint.
const PATH = '/POS/ViewSession.aspx';
const ID = 'ctl00_UserContentArea_';

test.describe('POS - Administration - View Session - live ExpressPoint session', () => {
  test.skip(!expressPointInstalled(), 'ExpressPoint desktop app is not installed on this machine');
  test.describe.configure({ timeout: 8 * 60_000 });

  test('an open ExpressPoint session shows its cashier, opening balance and sale', async ({ page }) => {
    let live: OpenSession | undefined;
    const session = await test.step('ExpressPoint: open service and charge a sale; check the website before closing', () =>
      recordChargedSession(undefined, undefined, async (open) => {
        live = open;
        await test.step('View Session: the open session on this terminal', () => checkOpenSession(page, open));
      }),
    );
    test.info().annotations.push({ type: 'session', description: JSON.stringify(session) });
    expect(live, 'checked while open').toBeDefined();

    await test.step('after close, the terminal has no open session to show', async () => {
      await showTerminal(page, session.site, session.terminal);
      expect(await gridRows(page, `#${ID}gridSales_ctl00`)).toEqual([]);
    });
  });
});

/** "103 - BLUEFIELD ELEMENTRY SCHOOL_CHILD CARE" -> the site name. */
function siteName(site: string): string {
  return site.replace(/^\S+\s*-\s*/, '');
}

async function showTerminal(page: Page, site: string, terminal: string): Promise<void> {
  await openPosPage(page, PATH);
  const school = page.locator(`#${ID}ddlSchool`);
  const label = (await school.locator('option').allInnerTexts()).find((o) => o.trim().toLowerCase() === siteName(site).toLowerCase());
  expect(label, `${siteName(site)} in School`).toBeDefined();
  await school.selectOption({ label: label! });
  // The school reloads its terminals.
  await expect(page.locator(`#${ID}ddlTerminal option`, { hasText: terminal })).toHaveCount(1);
  await page.locator(`#${ID}ddlTerminal`).selectOption({ label: terminal });
  await page.locator(`#${ID}btnApply`).click();
  await page.waitForLoadState('networkidle');
}

async function checkOpenSession(page: Page, open: OpenSession): Promise<void> {
  // ExpressPoint sends the session and sale to the server shortly after they happen.
  let text = '';
  await expect
    .poll(
      async () => {
        await showTerminal(page, open.site, open.terminal);
        text = (await page.locator('#ctl00_page_content').innerText()).replace(/\s+/g, ' ');
        return text.includes(`Opening Balance ${open.openingBalance}`) && /DEBIT/.test(text);
      },
      { message: 'session and sale reach the server', timeout: 120_000, intervals: [5_000, 10_000] },
    )
    .toBe(true);
  const sale = money(Math.round(Number(open.sale.total) * 100));
  expect(text).toContain(`Opening Balance ${open.openingBalance}`);
  expect(text).toContain(`Total Sales ${sale}`);
  const sales = await gridRows(page, `#${ID}gridSales_ctl00`);
  expect(sales).toHaveLength(1);
  expect(sales[0]).toMatchObject({ Type: 'DEBIT', Amount: sale });
  expect(await gridRows(page, `#${ID}gridPayments_ctl00`), 'a charge takes no payment').toEqual([]);
  expect(text, `patron ${DEFAULT_PATRON_ID}'s sale`).toMatch(/PAID\s*,\s*Sabih/i);
}
