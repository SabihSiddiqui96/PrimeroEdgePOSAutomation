import { test, expect, Frame, Page } from '@playwright/test';
import * as fs from 'fs';
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
import { expectPaging, expectSorts, gridRows, gridTotal, redraw } from '../../../utils/webforms';
import { nextTestName, TEST_PATRON_ID, TEST_RECORD, TEST_SITE_CODE, TEST_SITE_NAME } from '../../../utils/testData';

// POS > Administration > Special Roster (/POS/SpecialRoster.aspx)
const PATH = '/POS/SpecialRoster.aspx';
const ID = 'ctl00_UserContentArea_';
const LIST = `#${ID}gridSpecialRoster_ctl00`;
const STUDENTS = `#${ID}gridSpecialRosterStudentList_ctl00`;

test.describe('POS - Administration - Special Roster', () => {
  test('Special Roster: list, add, lookup, students, print, export, cancel, rename and delete', async ({ page }) => {
    test.setTimeout(10 * 60_000);
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

    await test.step('every site: pages, page size and sorting by each column', async () => {
      await expect(field(page, 'ucAreaSiteSelector_rcbSiteCode_Input')).toHaveValue(/ALL/);
      for (const row of await gridRows(page, LIST)) expect(row['Region'], row['Roster Name']).not.toBe('');
      await expectPaging(page, LIST);
      await expectSorts(page, LIST, 'Roster Name');
      await expectSorts(page, LIST, 'School Name');
      await expectSorts(page, LIST, 'Region');
    });

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

      await test.step('Lookup: OK needs a pick; every search field narrows the list; Cancel adds nothing', async () => {
        await button(page, 'btnAdd').click();
        const lookup = await dialog(page, /POSLookup\.aspx/);
        const grid = `#${ID}gridSearch_ctl00`;
        await expect(button(lookup, 'btnOK'), 'nothing picked yet').toBeDisabled();
        await expect(field(lookup, 'rblStudentIdSSNPinStateId_0'), 'ID/SSN by default').toBeChecked();
        await expect(field(lookup, 'ddlActive_Input')).toHaveValue('Active');

        await search(lookup);
        expect(await gridTotal(lookup, grid), 'a blank search lists every active patron').toBeGreaterThan(10);

        await type(lookup, 'txtStudentID', TEST_PATRON_ID);
        const [patron] = await search(lookup);
        expect(patron, 'the test patron').toBeDefined();
        expect(patron['Student ID/SSN']).toBe(TEST_PATRON_ID);
        expect(patron['Site Name']).toBe(TEST_SITE_NAME);
        // Names show as "Last, First Middle"; First name matches the first name only.
        const [last, given] = patron['Name'].split(',').map((x) => x.trim());
        const first = given.split(' ')[0];
        await type(lookup, 'txtStudentID', '');

        await type(lookup, 'txtLastName', last);
        for (const r of await search(lookup)) expect(r['Name'].toLowerCase(), 'last name search').toMatch(new RegExp(`^${last.toLowerCase()},`));
        await type(lookup, 'txtFirstName', first);
        const both = await search(lookup);
        expect(both.map((r) => r['Student ID/SSN'])).toContain(TEST_PATRON_ID);
        for (const r of both) expect(r['Name']).toMatch(new RegExp(`^${last}, ${first}\\b`, 'i'));

        const [m, d, y] = patron['Birth Date'].split('/');
        const birth = `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${y}`;
        await type(lookup, 'txtBirthDate', birth);
        expect((await search(lookup)).map((r) => r['Student ID/SSN']), 'with the birth date').toContain(TEST_PATRON_ID);
        await type(lookup, 'txtBirthDate', '', '__/__/____');

        await pickCombo(lookup, 'ddlActive', 'Inactive');
        expect((await search(lookup)).map((r) => r['Student ID/SSN']), 'an active patron is not under Inactive').not.toContain(TEST_PATRON_ID);
        await pickCombo(lookup, 'ddlActive', 'Active');

        if (patron['Grade']) {
          await pickCombo(lookup, 'ddlGrade', patron['Grade']);
          expect((await search(lookup)).map((r) => r['Student ID/SSN']), `grade ${patron['Grade']}`).toContain(TEST_PATRON_ID);
          await pickCombo(lookup, 'ddlGrade', '--ALL--');
        }

        await type(lookup, 'txtLastName', '');
        await type(lookup, 'txtFirstName', '');
        expect((await search(lookup)).length, 'cleared boxes search everyone again').toBeGreaterThan(1);
        const all = lookup.locator(`${grid} input[id$="headerChkbox"]`);
        const boxes = lookup.locator(`${grid} input[id$="chkSelect"]`);
        await all.check();
        for (const box of await boxes.all()) await expect(box).toBeChecked();
        await expect(button(lookup, 'btnOK')).toBeEnabled();
        await all.uncheck();
        for (const box of await boxes.all()) await expect(box).not.toBeChecked();
        await expect(button(lookup, 'btnOK')).toBeDisabled();

        await boxes.first().check();
        await button(lookup, 'btnCancel').click();
        await expectNoDialog(page);
        await expect(page.locator(STUDENTS), 'Cancel adds nobody').toContainText('No records to display.');
      });

      await test.step('Add students: look up the patron and add them', async () => {
        await button(page, 'btnAdd').click();
        const lookup = await dialog(page, /POSLookup\.aspx/);
        await type(lookup, 'txtStudentID', TEST_PATRON_ID);
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

      await test.step('Export: Word, Excel, PDF and CSV each download', async () => {
        const formats: [string, RegExp][] = [['Word', /\.docx?$/i], ['Excel', /\.xlsx?$/i], ['PDF', /\.pdf$/i], ['CSV (comma delimited)', /\.csv$/i]];
        for (const [format, extension] of formats) {
          await page.locator('[id$="toggleExportList"]').first().click();
          const download = page.waitForEvent('download', { timeout: 60_000 });
          await page.getByRole('link', { name: format, exact: true }).click();
          const file = await download;
          expect(file.suggestedFilename(), format).toMatch(extension);
          expect((await fs.promises.stat((await file.path())!)).size, `${format} has content`).toBeGreaterThan(0);
        }
      });

      await test.step('Cancel throws away an unsaved rename', async () => {
        await field(page, 'txtSpecialRosterName').fill(`${name} unsaved`);
        await button(page, 'btnCancl').click();
        await expect(page).toHaveURL(/SpecialRoster\.aspx/);
        await showSite(page);
        const names = (await listed(page)).map((r) => r.name);
        expect(names).toContain(name);
        expect(names).not.toContain(`${name} unsaved`);
        await rosterLink(page, name).click();
        expect((await students(page)).map((r) => r.ID)).toEqual([TEST_PATRON_ID]);
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

/** Type into a lookup box; a plain fill skips the control's own state. */
async function type(lookup: Frame, id: string, text: string, shown = text): Promise<void> {
  const box = field(lookup, id);
  // The date mask can swallow the first key after focus; type again if so.
  for (let attempt = 1; ; attempt++) {
    await box.click();
    await box.press('Control+A');
    await box.press('Delete');
    await box.press('Home');
    if (text) await box.pressSequentially(text, { delay: 60 });
    await box.press('Tab');
    if ((await box.inputValue()) === shown || attempt === 3) break;
  }
  await expect(box).toHaveValue(shown);
}

/** Run the lookup search and read its results. */
async function search(lookup: Frame): Promise<Record<string, string>[]> {
  const grid = `#${ID}gridSearch_ctl00`;
  // The grid updates in place; UpdateBenchmark fires once it has.
  const page = lookup.page();
  const applied = page
    .waitForResponse((r) => r.request().method() === 'POST' && /POSLookup\.aspx/i.test(r.url()) && /btnSearch/.test(r.request().postData() ?? ''))
    .then(() => page.waitForRequest(/UpdateBenchmark/, { timeout: 60_000 }));
  await button(lookup, 'btnSearch').click();
  await applied;
  return gridRows(lookup, grid);
}

/** Pick a lookup combo box item by its text. */
async function pickCombo(scope: Frame, id: string, item: string): Promise<void> {
  await scope.locator(`#${ID}${id}_Arrow`).click();
  await scope.locator(`#${ID}${id}_DropDown li`).filter({ hasText: new RegExp(`^\\s*${item}\\s*$`) }).first().click();
  // Grade values come padded with spaces ("4         ").
  await expect.poll(async () => (await scope.locator(`#${ID}${id}_Input`).inputValue()).trim()).toBe(item);
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
