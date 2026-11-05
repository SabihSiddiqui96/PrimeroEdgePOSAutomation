import { test, expect, Frame, Locator, Page } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectGridColumns,
  expectCaptions,
  expectFilled,
  expectHasOptions,
  expectOptions,
  expectPageTitle,
  expectVisible,
} from '../../../utils/screen';
import { dialogFrame } from '../../../utils/dialog';
import { TEST_SITE_CODE, usDate } from '../../../utils/testData';
import { allGridRows, expectPaging, expectSorts, gridTotal, pickSiteCode, redraw, typeDate } from '../../../utils/webforms';

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
      await apply(page);
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

    const yearRows = await test.step('Pages, page size, and sorting by each column', async () => {
      await expectGridColumns(page, `${ID}RadGridEditCheck_ctl00`, ['Site', 'Date', 'Meal Type', 'Eligibility', 'Reason', 'Resolved', 'Options']);
      const every = await allGridRows(page, GRID);
      await redraw(page, GRID, () => page.locator(`${GRID} .rgPageFirst`).first().click());
      if (counts.all > (await rows(page)).length) await expectPaging(page, GRID);
      await expectSorts(page, GRID, 'Date', 'date');
      await expectSorts(page, GRID, 'Site');
      await expectSorts(page, GRID, 'Meal Type');
      await expectSorts(page, GRID, 'Eligibility');
      return every;
    });

    await test.step('Options: both patron reports open for the check’s site and day', async () => {
      // Site 103's reports fail on QA; that is covered by the fixme test below.
      expect(yearRows.some((r) => r['Site'] !== TEST_SITE_CODE), 'a check on another site').toBe(true);
      let index = (await rows(page)).findIndex((r) => r.site !== TEST_SITE_CODE);
      if (index < 0) {
        await redraw(page, GRID, () => page.locator(`${GRID} > thead`).getByRole('link', { name: 'Site', exact: true }).click());
        index = (await rows(page)).findIndex((r) => r.site !== TEST_SITE_CODE);
      }
      const row = page.locator(`${GRID} > tbody > tr.rgRow, ${GRID} > tbody > tr.rgAltRow`).nth(index);
      const date = (await rows(page))[index].date;
      for (const id of ['ReportCaller_rptRetriever', 'ReportCallerAllStudents_rptRetriever']) {
        const text = await reportText(page, row.locator(`input[id$="${id}"]`));
        expect(text, id).toContain('Patron Participation');
        expect(text, id).toContain(`Date: ${padded(date)}`);
        expect(text, id).toMatch(/Patron Count: \d+/);
      }
    });

    await test.step('Reason shows the counts behind the check', async () => {
      const first = (await rows(page))[0];
      await page.locator(`${GRID} > tbody > tr`).first().locator('a[id$="hlReason"]').click();
      const frame = await dialog(page, /EditCheckReason\.aspx/);
      const text = (await frame.locator('body').innerText()).replace(/\s+/g, ' ');
      expect(text).toContain(`Date: ${padded(first.date)} `);
      expect(text).toMatch(new RegExp(`Site: ${first.site} - `));
      expect(text).toContain(`Reason: ${first.reason}`);
      const [, approved, count, percent, factor] = (text.match(new RegExp(`${first.eligibility} (\\d+) (\\d+) ([\\d.]+) ([\\d.]+)`)) ?? []).map(Number);
      expect(approved, 'approved / count / % / factor row').toBeDefined();
      // With nothing approved the % has no meaning and shows 0.00.
      expect(percent, 'count as a % of approved').toBeCloseTo(approved ? (count / approved) * 100 : 0, 1);
      if (/Exceeds approved count/.test(first.reason)) expect(count, 'count over approved').toBeGreaterThan(approved);
      if (/Exceeds attendance factor/.test(first.reason)) expect(percent, '% over the attendance factor').toBeGreaterThan(factor);
      await frame.locator('#ctl00_btnClose').click();
      await expect(page.locator('.RadWindow').locator('visible=true')).toHaveCount(0);
    });

    await test.step('Comments: adding one to an unresolved check resolves it today', async () => {
      if (counts.unresolved === 0) {
        test.info().annotations.push({ type: 'note', description: 'no unresolved check left to resolve' });
        return;
      }
      await showResolved(page, 'Unresolved');
      const target = (await rows(page))[0];
      const frame = await openComments(page, 0);
      await expect(frame.locator('body')).toContainText(`Date: ${padded(target.date)}`);
      await frame.locator('#ctl00_PopupContent_tbComments').fill(COMMENT);
      await frame.locator('#ctl00_PopupContent_btnAddComment').click();
      await expect(page.locator('.RadWindow').locator('visible=true')).toHaveCount(0);

      await apply(page);
      expect(await gridTotal(page, GRID), 'one fewer unresolved').toBe(counts.unresolved - 1);
      expect(await showResolved(page, 'Resolved'), 'one more resolved').toBe(counts.resolved + 1);
      const today = new Date();
      const resolvedToday = new RegExp(`^Resolved on 0?${today.getMonth() + 1}/0?${today.getDate()}/${today.getFullYear()} `);
      const match = (await allGridRows(page, GRID)).filter((r) => r['Site'] === target.site && r['Date'] === target.date && r['Meal Type'] === target.mealType && r['Eligibility'] === target.eligibility);
      expect(match, 'the check is now listed as resolved').toHaveLength(1);
      await redraw(page, GRID, () => page.locator(`${GRID} .rgPageFirst`).first().click()).catch(() => undefined);
      const titles = await page.locator(`${GRID} img[id$="imgResolved"]`).evaluateAll((imgs) => imgs.map((i) => i.getAttribute('title') ?? ''));
      expect(titles.some((t) => resolvedToday.test(t)), 'a check resolved today').toBe(true);
      await showResolved(page, 'All');
    });

    await test.step('Comments: history shows who and when; an empty comment is refused', async () => {

      await showResolved(page, 'Resolved');
      // The filter can lag the redraw; wait until the rows really are the resolved ones.
      await expect.poll(async () => (await rows(page))[0]?.resolvedTitle ?? '', { message: 'resolved rows shown' }).toMatch(/^Resolved on/);
      const resolved = await rows(page);
      expect(resolved.length, 'a resolved check').toBeGreaterThan(0);
      const frame = await openComments(page, 0);
      const text = (await frame.locator('body').innerText()).replace(/\s+/g, ' ');
      expect(text).toContain(`Date: ${padded(resolved[0].date)}`);
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
      await apply(page);
      const narrowed = await rows(page);
      expect(narrowed.length).toBeGreaterThan(0);
      for (const row of narrowed) expect(row.site).toBe(site);
      expect(await gridTotal(page, GRID)).toBeLessThanOrEqual(counts.all);
    });

    await test.step('Daily lists only that day; Monthly only that month', async () => {
      const siteRows = await allGridRows(page, GRID);
      const day = siteRows[0]['Date'];
      const [m, d, y] = day.split('/').map(Number);
      await page.locator(`#${INPUT}dailyRadioButton`).check();
      await typeDate(page, `${INPUT}dailyCalendarPopup_dateInput`, `${m}/${d}/${y}`);
      await apply(page);
      const daily = await allGridRows(page, GRID);
      for (const r of daily) expect(r['Date'], 'daily').toBe(day);
      expect(daily.length).toBe(siteRows.filter((r) => r['Date'] === day).length);

      await page.locator(`#${INPUT}monthlyRadioButton`).check();
      await page.locator(`#${INPUT}monthlyDropDownList`).selectOption(String(m));
      await page.locator(`#${INPUT}yearDropDownList`).selectOption(String(y));
      await apply(page);
      const monthly = await allGridRows(page, GRID);
      const inMonth = (r: Record<string, string>) => r['Date'].startsWith(`${String(m).padStart(2, '0')}/`) && r['Date'].endsWith(`/${y}`);
      for (const r of monthly) expect(inMonth(r), `${r['Date']} in ${m}/${y}`).toBe(true);
      // The 12-month list can start mid-month, so it may hold fewer.
      expect(monthly.length).toBeGreaterThanOrEqual(siteRows.filter(inMonth).length);
    });

    await test.step('Date Range: a From over a year back pulls To in to one year', async () => {
      await page.locator(`#${INPUT}dateRangeRadioButton`).check();
      const from = new Date();
      from.setFullYear(from.getFullYear() - 2);
      await typeDate(page, `${INPUT}fromCalendarPopup_dateInput`, usDate(from));
      const to = new Date(from);
      to.setFullYear(to.getFullYear() + 1);
      await expect(page.locator(`#${INPUT}toCalendarPopup_dateInput`)).toHaveValue(usDate(to));
    });
  });

  // QA: both patron reports fail for site 103 (dsRPT_POS_PatronParticipation query error).
  test.fixme('Edit Checks: patron reports open for a check on the test site', async ({ page }) => {
    await openPosPage(page, PATH);
    await page.locator(`#${INPUT}dateRangeRadioButton`).check();
    const from = new Date();
    from.setDate(from.getDate() - 364);
    await typeDate(page, `${INPUT}fromCalendarPopup_dateInput`, usDate(from));
    await pickSiteCode(page, TEST_SITE_CODE);
    await apply(page);
    const row = page.locator(`${GRID} > tbody > tr.rgRow, ${GRID} > tbody > tr.rgAltRow`).first();
    for (const id of ['ReportCaller_rptRetriever', 'ReportCallerAllStudents_rptRetriever']) {
      const text = await reportText(page, row.locator(`input[id$="${id}"]`));
      expect(text, id).not.toContain('An error has occurred during report processing');
      expect(text, id).toContain('Patron Participation');
    }
  });
});

/** Open a report from a row button and read it once it has rendered or failed. */
async function reportText(page: Page, button: Locator): Promise<string> {
  const popup = page.context().waitForEvent('page');
  await button.click();
  const report = await popup;
  const text = async () => (await report.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
  await expect.poll(text, { message: 'report rendered', timeout: 60_000 }).toMatch(/Patron Count:|error has occurred/);
  const body = await text();
  await report.close();
  return body;
}

async function showResolved(page: Page, which: keyof typeof RESOLVED): Promise<number> {
  const radio = page.locator(`#${ID}RBLResolvedType_${RESOLVED[which]}`);
  if (!(await radio.isChecked())) {
    // The grid updates in place; wait for the filter's postback.
    const applied = page
      .waitForResponse((r) => r.request().method() === 'POST' && /ManageEditCheck\.aspx/i.test(r.url()))
      .then(() => page.waitForRequest(/UpdateBenchmark/, { timeout: 60_000 }));
    await radio.check();
    await applied;
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

/** Dialogs and reports print dates as 08/11/2026; the grid may print 8/11/2026. */
function padded(date: string): string {
  return date.replace(/\b(\d)\//g, '0$1/');
}

async function apply(page: Page): Promise<void> {
  await redraw(page, GRID, () => page.locator(`#${ID}btnApply`).click());
}
