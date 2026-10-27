import { test, expect, Frame, Page } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectHasOptions,
  expectOptions,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';
import { dialogFrame } from '../../../utils/dialog';
import { usDate } from '../../../utils/testData';
import { gridTotal, redraw, typeDate } from '../../../utils/webforms';

// POS > Administration > Edit Checks (/POS/ManageEditCheck.aspx) Month names are the one list
const PATH = '/POS/ManageEditCheck.aspx';
const ID = 'ctl00_UserContentArea_';
const INPUT = `${ID}ucBasicReportInput_`;
const GRID = `#${ID}RadGridEditCheck_ctl00`;
const COMMENT = 'Sabih-automation testing';
const RESOLVED = { All: 0, Resolved: 1, Unresolved: 2 } as const;

test.describe('POS - Administration - Edit Checks', () => {
  test('Edit Checks: date modes, resolved filter, reasons, comments and site filter', async ({ page }) => {
    test.setTimeout(5 * 60_000);
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/Edit Checks/i);
    await expectPageTitle(page, 'Edit Checks');

    await test.step('site filters', async () => {
      await expectCaptions(page, ['Site Code', 'Site']);
      await expectFilled(page, [`${ID}ucAreaSiteSelector_rcbSiteCode_Input`, `${ID}ucAreaSiteSelector_rcbSite_Input`]);
    });

    await test.step('date modes: defaults, and only the chosen mode is editable', async () => {
      await expectCaptions(page, ['Date Range', 'Daily', 'Monthly', 'Month:', 'Year:', 'From:', 'To:']);
      await expectVisible(page, [`${INPUT}dailyRadioButton`, `${INPUT}monthlyRadioButton`, `${INPUT}dateRangeRadioButton`]);
      await expectFilled(page, [`${INPUT}dailyCalendarPopup_dateInput`, `${INPUT}fromCalendarPopup_dateInput`, `${INPUT}toCalendarPopup_dateInput`]);
      await expectHasOptions(page, `${INPUT}yearDropDownList`);
      await expectOptions(page, `${INPUT}monthlyDropDownList`, [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ]);

      const now = new Date();
      await expect(page.locator(`#${INPUT}dailyRadioButton`)).toBeChecked();
      await expect(page.locator(`#${INPUT}dailyCalendarPopup_dateInput`)).toHaveValue(usDate(now));
      await expect(page.locator(`#${INPUT}monthlyDropDownList`)).toHaveValue(String(now.getMonth() + 1));
      await expect(page.locator(`#${INPUT}yearDropDownList`)).toHaveValue(String(now.getFullYear()));
      await expect(page.locator(`#${INPUT}fromCalendarPopup_dateInput`)).toHaveValue(usDate(new Date(now.getFullYear(), now.getMonth(), 1)));
      await expect(page.locator(`#${INPUT}toCalendarPopup_dateInput`)).toHaveValue(usDate(now));

      const editable = { daily: ['dailyCalendarPopup_dateInput'], monthly: ['monthlyDropDownList', 'yearDropDownList'], dateRange: ['fromCalendarPopup_dateInput', 'toCalendarPopup_dateInput'] };
      for (const mode of ['monthly', 'dateRange', 'daily'] as const) {
        await page.locator(`#${INPUT}${mode}RadioButton`).check();
        for (const [other, fields] of Object.entries(editable)) {
          for (const field of fields) {
            const control = page.locator(`#${INPUT}${field}`);
            if (other === mode) await expect(control, `${mode}: ${field}`).toBeEnabled();
            else await expect(control, `${mode}: ${field}`).toBeDisabled();
          }
        }
      }
    });

    await expectCaptions(page, ['All', 'Resolved', 'Unresolved']);
    await expectButtons(page, [[`${ID}btnApply`, 'Apply']]);

    const counts = await test.step('last 12 months: All is Resolved plus Unresolved', async () => {
      await page.locator(`#${INPUT}dateRangeRadioButton`).check();
      const from = new Date();
      from.setDate(from.getDate() - 364);
      await typeDate(page, `${INPUT}fromCalendarPopup_dateInput`, usDate(from));
      await redraw(page, GRID, () => page.locator(`#${ID}btnApply`).click());
      const all = await gridTotal(page, GRID);
      expect(all, 'edit checks in the last 12 months').toBeGreaterThan(0);
      const resolved = await showResolved(page, 'Resolved');
      for (const row of await rows(page)) expect(row.resolvedTitle, `${row.site} ${row.date} ${row.mealType}`).toMatch(/^Resolved on \d+\/\d+\/\d{4} /);
      const unresolved = await showResolved(page, 'Unresolved');
      for (const row of await rows(page)) expect(row.resolvedTitle, `${row.site} ${row.date} ${row.mealType}`).toBe('');
      expect(resolved + unresolved, 'All = Resolved + Unresolved').toBe(all);
      await showResolved(page, 'All');
      return { all, resolved, unresolved };
    });

    await test.step('Reason shows the counts behind the check', async () => {
      const first = (await rows(page))[0];
      await page.locator(`${GRID} > tbody > tr`).first().locator('a[id$="hlReason"]').click();
      const frame = await dialog(page, /EditCheckReason\.aspx/);
      const text = (await frame.locator('body').innerText()).replace(/\s+/g, ' ');
      expect(text).toContain(`Date: ${first.date} `);
      expect(text).toMatch(new RegExp(`Site: ${first.site} - `));
      expect(text).toContain(`Reason: ${first.reason}`);
      const [, approved, count, percent] = text.match(new RegExp(`${first.eligibility} (\\d+) (\\d+) ([\\d.]+) [\\d.]+`)) ?? [];
      expect(approved, 'approved / count / % row').toBeDefined();
      expect(Number(percent), 'count as a % of approved').toBeCloseTo((Number(count) / Number(approved)) * 100, 1);
      await frame.locator('#ctl00_btnClose').click();
      await expect(page.locator('.RadWindow').locator('visible=true')).toHaveCount(0);
    });

    await test.step('Comments: required, and adding one resolves the check', async () => {
      if (counts.resolved === 0) {
        // Nothing resolved yet: resolve one so there is a history to check.
        await showResolved(page, 'Unresolved');
        const frame = await openComments(page, 0);
        await frame.locator('#ctl00_PopupContent_tbComments').fill(COMMENT);
        await frame.locator('#ctl00_PopupContent_btnAddComment').click();
        await expect(page.locator('.RadWindow').locator('visible=true')).toHaveCount(0);
      }

      await showResolved(page, 'Resolved');
      // The filter can lag the redraw; wait until the rows really are the resolved ones.
      await expect.poll(async () => (await rows(page))[0]?.resolvedTitle ?? '', { message: 'resolved rows shown' }).toMatch(/^Resolved on/);
      const resolved = await rows(page);
      expect(resolved.length, 'a resolved check').toBeGreaterThan(0);
      const frame = await openComments(page, 0);
      const text = (await frame.locator('body').innerText()).replace(/\s+/g, ' ');
      expect(text).toContain(`Date: ${resolved[0].date}`);
      expect(text, 'who commented and when').toMatch(/Comment History \S.* \d+\/\d+\/\d{4} \d+:\d{2}:\d{2} [AP]M \S/);
      await frame.locator('#ctl00_PopupContent_btnAddComment').click();
      await expect(frame.locator('body'), 'an empty comment is refused').toContainText('Please enter a comment!');
      await frame.locator('#ctl00_btnClose').click();
      await expect(page.locator('.RadWindow').locator('visible=true')).toHaveCount(0);
      await showResolved(page, 'All');
    });

    await test.step('Site filter narrows the list to that site', async () => {
      const site = (await rows(page))[0].site;
      await page.locator(`#${ID}ucAreaSiteSelector_rcbSiteCode_Arrow`).click();
      await page.locator(`#${ID}ucAreaSiteSelector_rcbSiteCode_DropDown li`).filter({ hasText: new RegExp(`^${site}$`) }).click();
      await expect(page.locator(`#${ID}ucAreaSiteSelector_rcbSiteCode_Input`)).toHaveValue(site);
      // Picking a code reloads the Site box; Apply before that runs the old filter.
      await expect(page.locator(`#${ID}ucAreaSiteSelector_rcbSite_Input`)).not.toHaveValue(/ALL/);
      await page.waitForLoadState('networkidle');
      await redraw(page, GRID, () => page.locator(`#${ID}btnApply`).click());
      const narrowed = await rows(page);
      expect(narrowed.length).toBeGreaterThan(0);
      for (const row of narrowed) expect(row.site).toBe(site);
      expect(await gridTotal(page, GRID)).toBeLessThanOrEqual(counts.all);
    });
  });
});

async function showResolved(page: Page, which: keyof typeof RESOLVED): Promise<number> {
  const radio = page.locator(`#${ID}RBLResolvedType_${RESOLVED[which]}`);
  if (!(await radio.isChecked())) {
    await radio.check();
    await page.waitForLoadState('networkidle');
    // The grid isn't always swapped out, so wait for the rows to match the filter instead.
    if (which !== 'All') {
      await expect
        .poll(async () => (await rows(page)).every((r) => (r.resolvedTitle !== '') === (which === 'Resolved')), { message: `${which} rows shown` })
        .toBe(true);
    }
  }
  return gridTotal(page, GRID);
}

async function rows(page: Page) {
  return page.locator(`${GRID} > tbody > tr.rgRow, ${GRID} > tbody > tr.rgAltRow`).evaluateAll((trs) =>
    trs.map((tr) => {
      const cell = (i: number) => (tr.children[i] as HTMLElement).innerText.replace(/HeaderText/g, '').trim();
      return {
        site: cell(0),
        date: cell(1),
        mealType: cell(2),
        eligibility: cell(3),
        reason: cell(4),
        resolvedTitle: tr.children[5].querySelector('img')?.getAttribute('title') ?? '',
      };
    }),
  );
}

async function openComments(page: Page, index: number): Promise<Frame> {
  const icon = page.locator(`${GRID} > tbody > tr`).nth(index).locator('input[id$="imgBtnComment"]');
  // The window is reused, so wait for the one opened for this row's check.
  const [, query] = (await icon.getAttribute('onclick'))!.match(/EditCheckComments\.aspx\?(Id=\d+&Date=[^ &']+)/)!;
  await icon.click();
  return dialog(page, new RegExp(escapeRegExp(`EditCheckComments.aspx?${query}`)));
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

async function dialog(page: Page, url: RegExp): Promise<Frame> {
  const frame = await dialogFrame(page, url);
  await expect(frame.locator('#ctl00_btnClose')).toBeVisible();
  return frame;
}
