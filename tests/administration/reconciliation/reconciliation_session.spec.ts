import { test, expect } from '@playwright/test';
import { expressPointInstalled } from '../../../utils/expresspoint/launch';
import { recordChargedSession } from '../../../utils/expresspoint/session';
import {
  apply,
  cents,
  newestSession,
  openReconciliation,
  selectSite,
  selectSiteCode,
  sessionRows,
  setDateRange,
  siteValue,
  sortNewestFirst,
  today,
} from './_reconciliation_page';

// POS > Administration > Reconciliation, checked against a session rung up on ExpressPoint.
test.describe('POS - Administration - Reconciliation - ExpressPoint session', () => {
  test.skip(!expressPointInstalled(), 'ExpressPoint desktop app is not installed on this machine');
  test.describe.configure({ timeout: 6 * 60_000 });

  test('a session closed on ExpressPoint shows its balances, status and over/under', async ({ page }) => {
    const session = await test.step('ExpressPoint: open service, charge a sale, close service', () =>
      recordChargedSession(),
    );
    test.info().annotations.push({ type: 'session', description: JSON.stringify(session) });

    // "103 - BLUEFIELD ELEMENTRY SCHOOL_CHILD CARE" -> code and site name.
    const [, siteCode, siteName] = session.site.match(/^(\S+)\s*-\s*(.+)$/) ?? [];
    expect(siteCode, `site code from "${session.site}"`).toBeTruthy();

    await test.step('Reconciliation: filter to the site and today', async () => {
      await openReconciliation(page);
      await selectSiteCode(page, siteCode);
      await expect.poll(() => siteValue(page), { message: 'site follows the site code' }).toMatch(
        new RegExp(`^${siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      );
      await selectSite(page, siteName);
      await setDateRange(page, today(), today());
      await apply(page);
      await sortNewestFirst(page);
    });

    await test.step('the session matches what ExpressPoint recorded', async () => {
      const rows = (await sessionRows(page)).filter((r) => r.terminal === session.terminal);
      const row = newestSession(rows);
      expect(row, `a session today on terminal ${session.terminal}`).toBeDefined();

      expect(row!.openingBalance, 'opening balance').toBe(session.openingBalance);
      expect(row!.closingBalance, 'closing balance').toBe(session.closingBalance);
      expect(row!.status, 'status').toBe('Closed');
      // A charged sale takes no cash, so over/under is closing minus opening.
      expect(cents(row!.overUnder), 'over/under').toBe(cents(session.closingBalance) - cents(session.openingBalance));
    });
  });
});
