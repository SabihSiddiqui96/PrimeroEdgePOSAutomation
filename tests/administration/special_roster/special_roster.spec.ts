import { test, expect, Frame, Page } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import {
  expectButtons,
  expectCaptions,
  expectFilled,
  expectGridColumns,
  expectGridResolved,
  expectPageTitle,
} from '../../../utils/screen';
import { dialogFrame as dialog, expectNoDialog } from '../../../utils/dialog';
import { redraw } from '../../../utils/webforms';
import { nextTestName, TEST_PATRON_ID, TEST_RECORD, TEST_SITE_CODE, TEST_SITE_NAME } from '../../../utils/testData';

// POS > Administration > Special Roster (/POS/SpecialRoster.aspx)
const PATH = '/POS/SpecialRoster.aspx';
const ID = 'ctl00_UserContentArea_';
const LIST = `#${ID}gridSpecialRoster_ctl00`;
const STUDENTS = `#${ID}gridSpecialRosterStudentList_ctl00`;

test.describe('POS - Administration - Special Roster', () => {
  test('Special Roster: add, students, print, rename and delete', async ({ page }) => {
    test.setTimeout(6 * 60_000);
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/Special Roster/i);
    await expectPageTitle(page, 'Special Roster');
    await expectCaptions(page, ['Site Code', 'Site']);
    await expectFilled(page, [`${ID}ucAreaSiteSelector_rcbSiteCode_Input`, `${ID}ucAreaSiteSelector_rcbSite_Input`]);
    await expectButtons(page, [
      [`${ID}btnApply`, 'Apply'],
      [`${ID}btnAdd`, 'Add ...'],
    ]);
    await expectGridColumns(page, `${ID}gridSpecialRoster_ctl00`, ['Region', 'School Name', 'Roster Name']);
    await expectGridResolved(page, `${ID}gridSpecialRoster_ctl00`);

    let name = '';
    try {
      name = await test.step('the site filter lists only that site’s rosters', async () => {
        await showSite(page);
        await removeTestRosters(page);
        const rosters = await listed(page);
        for (const r of rosters) expect(r.school.toLowerCase(), r.name).toBe(TEST_SITE_NAME.toLowerCase());
        return nextTestName(rosters.map((r) => r.name));
      });

      await test.step('Add: name required, then the roster is listed under its site', async () => {
        const add = await openAdd(page);
        await button(add, 'btnApply').click();
        await expect(add.locator('body')).toContainText('Please enter a Special Roster Name.');
        await field(add, 'txtRosterName').fill(name);
        await field(add, 'ddlSchoolName').selectOption({ label: TEST_SITE_NAME });
        await button(add, 'btnApply').click();
        await expectNoDialog(page);
        await redraw(page, LIST, () => button(page, 'btnApply').click());
        expect((await listed(page)).map((r) => r.name)).toContain(name);
      });

      await test.step('Add: a name already used at the site is refused', async () => {
        const add = await openAdd(page);
        await field(add, 'txtRosterName').fill(name);
        await field(add, 'ddlSchoolName').selectOption({ label: TEST_SITE_NAME });
        await button(add, 'btnApply').click();
        await expect(add.locator('body')).toContainText('Looks like that Roster name is taken. Please select a unique Roster Name and try again.');
        await button(add, 'btnCancel').click();
        await expectNoDialog(page);
        await redraw(page, LIST, () => button(page, 'btnApply').click());
        expect((await listed(page)).filter((r) => r.name === name)).toHaveLength(1);
      });

      await test.step('Open: the roster starts empty', async () => {
        await rosterLink(page, name).click();
        await expect(field(page, 'txtSpecialRosterName')).toHaveValue(name);
        await expect(field(page, 'ddlSchoolName').locator('option:checked')).toHaveText(TEST_SITE_NAME);
        await expect(page.locator(STUDENTS)).toContainText('No records to display.');
        await expectButtons(page, [
          [`${ID}btnAdd`, 'Add ...'],
          [`${ID}ReportCaller1_rptRetriever`, 'Print'],
          [`${ID}btnCancl`, 'Cancel'],
          [`${ID}btnApply`, 'Save'],
        ]);
      });

      await test.step('Add students: look up the patron and add them', async () => {
        await button(page, 'btnAdd').click();
        const lookup = await dialog(page, /POSLookup\.aspx/);
        await field(lookup, 'txtStudentID').fill(TEST_PATRON_ID);
        await button(lookup, 'btnSearch').click();
        const result = lookup.locator(`#${ID}gridSearch_ctl00 > tbody > tr`).filter({ hasText: TEST_PATRON_ID }).first();
        await expect(result).toContainText(TEST_SITE_NAME);
        await result.locator('input[type="checkbox"]').check();
        await button(lookup, 'btnOK').click();
        await expectNoDialog(page);
        // The grid refreshes a moment after the lookup closes.
        await expect.poll(async () => (await students(page)).length, { message: 'student added' }).toBe(1);
        const rows = await students(page);
        expect(rows[0]).toMatchObject({ ID: TEST_PATRON_ID, Site: TEST_SITE_NAME });
      });

      const student = await test.step('Save keeps the student', async () => {
        await button(page, 'btnApply').click();
        await page.locator(`#${ID}hplBackRoaster`).click();
        await showSite(page);
        await rosterLink(page, name).click();
        const rows = await students(page);
        expect(rows.map((r) => r.ID)).toEqual([TEST_PATRON_ID]);
        return rows[0];
      });

      await test.step('Print lists the roster and its student', async () => {
        const popup = page.context().waitForEvent('page');
        await button(page, 'ReportCaller1_rptRetriever').click();
        const report = await popup;
        const text = async () => (await report.locator('body').innerText()).replace(/\s+/g, ' ');
        await expect.poll(text, { message: 'roster report', timeout: 60_000 }).toContain(`Special Roster Name : ${name}`);
        const body = await text();
        expect(body).toContain(TEST_SITE_NAME);
        expect(body).toContain(`${student.Name} ${student.Grade} ${TEST_PATRON_ID}`);
        await report.close();
      });

      await test.step('Remove asks first; confirming takes the student off', async () => {
        const remove = page.locator(`${STUDENTS} input[id$="imgDelete"]`).first();
        page.once('dialog', (d) => d.dismiss());
        await remove.click();
        expect(await students(page)).toHaveLength(1);
        page.once('dialog', async (d) => {
          expect(d.message()).toBe('Are you sure you want to remove this student from the Roster?');
          await d.accept();
        });
        await remove.click();
        await expect(page.locator(STUDENTS)).toContainText('No records to display.');
      });

      const renamed = await test.step('Rename and save', async () => {
        const newName = nextTestName([name]);
        await field(page, 'txtSpecialRosterName').fill(newName);
        await button(page, 'btnApply').click();
        await page.locator(`#${ID}hplBackRoaster`).click();
        await showSite(page);
        const names = (await listed(page)).map((r) => r.name);
        expect(names).toContain(newName);
        expect(names).not.toContain(name);
        return newName;
      });
      name = renamed;

      await test.step('Delete from the list', async () => {
        page.once('dialog', (d) => d.accept());
        await page.locator(`${LIST} > tbody > tr`).filter({ has: page.getByRole('link', { name, exact: true }) }).locator('input[id$="imgDelete"]').click();
        await expect(rosterLink(page, name)).toHaveCount(0);
        await redraw(page, LIST, () => button(page, 'btnApply').click());
        expect((await listed(page)).map((r) => r.name)).not.toContain(name);
      });
    } finally {
      await showSite(page).then(() => removeTestRosters(page)).catch(() => undefined);
    }
  });
});

function field(scope: Page | Frame, id: string) {
  return scope.locator(`#${ID}${id}`);
}

function button(scope: Page | Frame, id: string) {
  return scope.locator(`#${ID}${id}`);
}

function rosterLink(page: Page, name: string) {
  return page.locator(LIST).getByRole('link', { name, exact: true });
}

async function openAdd(page: Page): Promise<Frame> {
  await button(page, 'btnAdd').click();
  const add = await dialog(page, /AddSpecialRoster\.aspx/);
  await expect(field(add, 'txtRosterName')).toBeVisible();
  return add;
}

/** Filter the list to the test site. */
async function showSite(page: Page): Promise<void> {
  if (!/SpecialRoster\.aspx/i.test(page.url())) await openPosPage(page, PATH);
  await page.locator(`#${ID}ucAreaSiteSelector_rcbSiteCode_Arrow`).click();
  await page.locator(`#${ID}ucAreaSiteSelector_rcbSiteCode_DropDown li`).filter({ hasText: new RegExp(`^${TEST_SITE_CODE}$`) }).click();
  // Picking a code reloads the Site box; Apply before that runs the old filter.
  await expect(field(page, 'ucAreaSiteSelector_rcbSite_Input')).toHaveValue(new RegExp(`^${TEST_SITE_NAME}$`, 'i'));
  await page.waitForLoadState('networkidle');
  await redraw(page, LIST, () => button(page, 'btnApply').click());
}

async function listed(page: Page) {
  const rows = page.locator(`${LIST} > tbody > tr.rgRow, ${LIST} > tbody > tr.rgAltRow`);
  const out: { school: string; name: string }[] = [];
  for (const row of await rows.all()) {
    out.push({
      school: (await row.locator('> td').nth(1).innerText()).trim(),
      name: (await row.locator('> td').nth(2).innerText()).trim(),
    });
  }
  return out;
}

async function students(page: Page): Promise<Record<string, string>[]> {
  return page.locator(STUDENTS).evaluate((grid) => {
    const headers = Array.from(grid.querySelectorAll(':scope > thead > tr > th')).map((th) => (th as HTMLElement).innerText.trim());
    return Array.from(grid.querySelectorAll(':scope > tbody > tr.rgRow, :scope > tbody > tr.rgAltRow')).map((tr) =>
      Object.fromEntries(headers.map((h, i) => [h, (tr.children[i] as HTMLElement)?.innerText.trim() ?? ''])),
    );
  });
}

async function removeTestRosters(page: Page): Promise<void> {
  for (const r of (await listed(page)).filter((x) => TEST_RECORD.test(x.name))) {
    page.once('dialog', (d) => d.accept());
    await page.locator(`${LIST} > tbody > tr`).filter({ has: page.getByRole('link', { name: r.name, exact: true }) }).locator('input[id$="imgDelete"]').click();
    await expect(rosterLink(page, r.name)).toHaveCount(0);
  }
}
