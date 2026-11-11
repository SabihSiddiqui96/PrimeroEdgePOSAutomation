import { test, expect, Page } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import { expectButtons, expectCaptions, expectGridColumns, expectPageTitle, expectVisible } from '../../../utils/screen';
import { LOCAL_ONLY, LOCAL_ONLY_REASON, nextTestName, TEST_SITE_CODE, TEST_SITE_NAME } from '../../../utils/testData';
import { allGridRows, expectPaging, expectSorts, gridRows, pickSiteCode, postbackIdle, redraw, typeDate } from '../../../utils/webforms';

// POS > Patrons > Adults (/POS/ManageStaff.aspx)
const PATH = '/POS/ManageStaff.aspx';
const ID = 'ctl00_UserContentArea_ManageStaff1_';
const VIEW = 'ctl00_UserContentArea_ViewStaff1_';
const ADD = 'ctl00_UserContentArea_AddStaff1_';
const GRID = `#${ID}rgSearch_ctl00`;
const SITE_PICKER = { code: `${ID}ucAreaSiteSelector_rcbSiteCode`, site: `${ID}ucAreaSiteSelector_rcbSite_Input` };
const PERSON_TYPES = ['Adult', 'Guest', 'Teacher', 'Employee'];
// The Employee filter also lists Prog Adults.
const SHOWN_AS: Record<string, string[]> = { Employee: ['Employee', 'Prog Adult'] };

test.describe('POS - Patrons - Adults', () => {
  test('Adults: filters, person types, search, sort, paging, import, and every tab of an adult', async ({ page }) => {
    test.setTimeout(12 * 60_000);
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Adults/i);
    await expectPageTitle(page, 'Adults');

    await test.step('every site and person type, active adults, by ID, by default', async () => {
      await expectCaptions(page, ['Site Code', 'Site', 'ID', 'PIN', 'Last Name', 'First Name', 'Adult ID', 'Person Type', 'Status']);
      await expect(page.locator(`#${SITE_PICKER.code}_Input`)).toHaveValue('-- ALL --');
      await expect(page.locator(`#${ID}ddlPersonType_Input`)).toHaveValue('--ALL--');
      await expect(page.locator(`#${ID}ddlActive_Input`)).toHaveValue('Active');
      await expect(page.locator(`#${ID}rblStudentIdSSNPinStateId_0`)).toBeChecked();
      expect(await options(page, 'ddlPersonType')).toEqual([...PERSON_TYPES, '--ALL--']);
      expect(await options(page, 'ddlActive')).toEqual(['--ALL--', 'Active', 'Inactive']);
      await expectButtons(page, [
        [`${ID}btnApply`, 'Apply'],
        [`${ID}btnReset`, 'Reset'],
        [`${ID}btnImport`, 'Import'],
        [`${ID}btnAddNew`, 'Add ...'],
      ]);
    });

    const adults = await test.step('a site: only that site’s active adults', async () => {
      await pickSiteCode(page, TEST_SITE_CODE, SITE_PICKER);
      await apply(page);
      await expectGridColumns(page, GRID.slice(1), ['Adult ID', 'Last Name', 'First Name', 'Site', 'Person Type']);
      const rows = await allGridRows(page, GRID);
      expect(rows.length).toBeGreaterThan(1);
      for (const row of rows) {
        expect(row['Site']).toBe(TEST_SITE_NAME);
        expect([...PERSON_TYPES, ...SHOWN_AS.Employee]).toContain(row['Person Type']);
        expect(row['Adult ID']).not.toBe('');
      }
      return rows;
    });

    await test.step('paging and sorting every column', async () => {
      if (adults.length > (await gridRows(page, GRID)).length) await expectPaging(page, GRID);
      for (const column of ['Adult ID', 'Last Name', 'First Name', 'Person Type']) await expectSorts(page, GRID, column);
    });

    await test.step('each person type lists only that type, and together they make --ALL--', async () => {
      let sum = 0;
      for (const type of PERSON_TYPES) {
        await pick(page, 'ddlPersonType', type);
        await apply(page);
        const rows = await allGridRows(page, GRID).catch(() => []);
        for (const r of rows) expect(SHOWN_AS[type] ?? [type], type).toContain(r['Person Type']);
        sum += rows.length;
      }
      expect(sum).toBe(adults.length);
      await pick(page, 'ddlPersonType', '--ALL--');
    });

    await test.step('Status: Active and Inactive together make --ALL--', async () => {
      await pick(page, 'ddlActive', 'Inactive');
      await apply(page);
      const inactive = (await allGridRows(page, GRID).catch(() => [])).length;
      await pick(page, 'ddlActive', '--ALL--');
      await apply(page);
      expect((await allGridRows(page, GRID)).length).toBe(adults.length + inactive);
      await pick(page, 'ddlActive', 'Active');
    });

    const employee = adults.find((a) => SHOWN_AS.Employee.includes(a['Person Type']));
    const other = adults.find((a) => a['Person Type'] === 'Adult') ?? adults.find((a) => a['Person Type'] === 'Guest')!;
    await test.step('ID finds exactly that adult, names narrow the list, a made-up PIN finds nothing', async () => {
      await page.locator(`#${ID}txtStudentId`).fill(other['Adult ID']);
      await apply(page);
      expect(await gridRows(page, GRID)).toEqual([other]);
      await page.locator(`#${ID}txtStudentId`).fill('');
      await page.locator(`#${ID}txtLastName`).fill(other['Last Name']);
      await apply(page);
      const byLast = await allGridRows(page, GRID);
      expect(byLast.map((r) => r['Adult ID'])).toContain(other['Adult ID']);
      for (const r of byLast) expect(r['Last Name'].toLowerCase()).toContain(other['Last Name'].toLowerCase());
      await page.locator(`#${ID}txtLastName`).fill('');
      await page.locator(`#${ID}txtFirstName`).fill(other['First Name']);
      await apply(page);
      for (const r of await allGridRows(page, GRID)) expect(r['First Name'].toLowerCase()).toContain(other['First Name'].toLowerCase());
      await page.locator(`#${ID}txtFirstName`).fill('');
      await page.locator(`#${ID}rblStudentIdSSNPinStateId_1`).check();
      await postbackIdle(page);
      await page.locator(`#${ID}txtStudentId`).fill('999999999');
      await apply(page);
      await expect(page.locator(GRID)).toContainText('No records to display.');
    });

    await test.step('Reset puts every filter back', async () => {
      await page.locator(`#${ID}btnReset`).click();
      await postbackIdle(page);
      await expect(page.locator(`#${ID}txtStudentId`)).toHaveValue('');
      await expect(page.locator(`#${ID}rblStudentIdSSNPinStateId_0`)).toBeChecked();
      await expect(page.locator(`#${SITE_PICKER.code}_Input`)).toHaveValue('-- ALL --');
      await expect(page.locator(`#${ID}ddlActive_Input`)).toHaveValue('Active');
    });

    await test.step('an adult who isn’t an employee has no Employee Details tab', async () => {
      await openAdult(page, other['Adult ID']);
      await expect(page.locator(`#${VIEW}txtFirstName`)).toHaveValue(other['First Name']);
      await expect(page.locator(`#${VIEW}txtLastName`)).toHaveValue(other['Last Name']);
      await expect(page.locator(`#${VIEW}ddlSite option:checked`)).toHaveText(TEST_SITE_NAME);
      await expect(page.locator(`#${VIEW}ddlPersonType option:checked`)).toHaveText(other['Person Type']);
      for (const name of ['Particulars', 'Picture/Notes', 'Allergies/Restrictions', 'Notifications', 'History']) await expect(tab(page, name), name).toBeVisible();
      await expect(tab(page, 'Employee Details')).toHaveCount(0);
    });

    await test.step('an employee: Particulars, then every tab', async () => {
      if (!employee) {
        test.info().annotations.push({ type: 'not covered', description: 'no employee at the test site' });
        return;
      }
      await openAdult(page, employee!['Adult ID']);
      await expect(page.locator(`#${VIEW}ddlPersonType`), 'person type is fixed here').toBeDisabled();
      await expectButtons(page, [
        [`${VIEW}btnStaff`, 'Remove as Employee'],
        [`${VIEW}btnApply`, 'Save'],
        [`${VIEW}btnCancel`, 'Cancel'],
      ]);
      await expect(page.locator(`#${VIEW}txtPin`)).not.toHaveValue('');

      await openTab(page, 'Picture/Notes');
      await expectVisible(page, [`${VIEW}fileUploadImage`, `${VIEW}ucNotes_newCommentsTextBox`]);
      await expectButtons(page, [
        [`${VIEW}btnRemoveImage`, 'Remove'],
        [`${VIEW}ucPrintReport_rptRetriever`, 'Print'],
        [`${VIEW}ucNotes_AddButton`, 'Add Notes'],
      ]);

      await openTab(page, 'Employee Details');
      await expect(page.locator(`#${VIEW}ddlEmployeementtype option`)).not.toHaveCount(0);
      await expectVisible(page, [`${VIEW}txtHours`, `${VIEW}calHiredDate_dateInput`, `${VIEW}calTerminatedDate_dateInput`, `${VIEW}chkCanlogin`]);
      await expect(page.locator(`#${VIEW}ddltime option`)).toHaveText(['AM', 'PM']);

      await openTab(page, 'Allergies/Restrictions');
      for (const allergen of ['Egg', 'Fish', 'Milk', 'Peanuts', 'Soy', 'Tree Nuts', 'Wheat']) await expect(page.locator('#ctl00_page_content'), allergen).toContainText(allergen);
      await expectVisible(page, [`${VIEW}chkDonotAcceptChecks`, `${VIEW}chkCannotCharge`, `${VIEW}txtSpecialInstructions1`, `${VIEW}txtSpecialInstructions4`]);

      await openTab(page, 'Notifications');
      await expect(page.locator(`#${VIEW}ucLetterNotification_btnLetterNotificationApply`)).toBeDisabled();
      await expect(page.locator(`#${VIEW}ucLetterNotification_btnFormNotificationsApply`)).toBeEnabled();

      await openTab(page, 'History');
      await expect(page.locator('#ctl00_page_content')).toContainText(/made changes|No history/i);
    });

    await test.step('Import opens the data exchange wizard and Back returns', async () => {
      await openPosPage(page, PATH);
      await page.locator(`#${ID}btnImport`).click();
      await expect(page).toHaveURL(/DataExchange\/Wizard\.aspx/);
      for (const text of ['File Upload', 'Field Mapping', 'Field Definitions', 'Preview', 'Data Direction', 'Adult Import', 'Student Import', 'Allergen Import']) {
        await expect(page.locator('#ctl00_page_content'), text).toContainText(text);
      }
      await page.locator('[id$="ucWizardImportExport_lbtnBack"]').click();
      await expect(page).toHaveURL(/ManageStaff\.aspx/);
    });
  });

  test.fixme('Adults: Import from Adults starts on Adult Import and goes back to Adults', async ({ page }) => {
    await openPosPage(page, PATH);
    await page.locator(`#${ID}btnImport`).click();
    await expect(page.locator('[id$="ucWizardImportExport_rbDirection_0"]')).toBeChecked();
    await expect(page.locator('[id$="ucWizardImportExport_lbtnBack"]')).toHaveText(/Back to Adults/);
  });

  test.fixme('Adults: Add doesn’t offer --ALL-- as a person type', async ({ page }) => {
    await openPosPage(page, PATH);
    await page.locator(`#${ID}btnAddNew`).click();
    expect(await page.locator(`#${ADD}ddlPersonType option`).allInnerTexts()).not.toContain('--ALL--');
  });

  test('Adults: add an adult, find it, add a note, edit it and deactivate it', async ({ page }) => {
    test.skip(LOCAL_ONLY, LOCAL_ONLY_REASON);
    test.setTimeout(10 * 60_000);
    page.on('dialog', (d) => void d.accept());

    const name = await test.step('the next free SabihTesting name', async () => {
      await openPosPage(page, PATH);
      await page.locator(`#${ID}txtLastName`).fill('SabihTesting');
      await pick(page, 'ddlActive', '--ALL--');
      await apply(page);
      const rows = await allGridRows(page, GRID).catch(() => []);
      return nextTestName(rows.map((r) => r['Last Name']));
    });
    const adultId = `AD${Date.now().toString().slice(-7)}`;

    await test.step('Add: Next with nothing filled names the required fields', async () => {
      await page.locator(`#${ID}btnAddNew`).click();
      await expect(page).toHaveURL(/AddNewStaff\.aspx/);
      for (const step of ['Particulars', 'Picture', 'Confirmation']) await expect(page.locator('#ctl00_page_content'), step).toContainText(step);
      await expect(page.locator(`#${ADD}chkIsActive`)).toBeChecked();
      await page.locator(`#${ADD}btnParticularsNext`).click();
      for (const message of ['Enter First Name.', 'Enter Last Name', 'Select Person Type', 'Select Site.', 'Enter ID Number', 'Enter a Pin.']) {
        await expect(page.locator('body'), message).toContainText(message);
      }
      await expect(page.locator(`#${ADD}txtPin`), 'the PIN follows the ID').toBeDisabled();
    });

    await test.step('Particulars: name, birth date, site, person type and ID', async () => {
      await page.locator(`#${ADD}txtFirstName`).pressSequentially('Sabih');
      await page.locator(`#${ADD}txtLastName`).pressSequentially(name);
      await typeDate(page, `${ADD}calBirthDate_dateInput`, '1/15/1990');
      await page.locator(`#${ADD}ddlPersonType`).selectOption({ label: 'Adult' });
      await postbackIdle(page);
      await page.locator(`#${ADD}ddlSite`).selectOption({ label: TEST_SITE_NAME });
      await postbackIdle(page);
      const idBox = page.locator(`#${ADD}txtStudentId`);
      await idBox.click();
      await idBox.pressSequentially(adultId);
      await idBox.press('Tab');
      await postbackIdle(page);
      await page.locator(`#${ADD}btnParticularsNext`).click();
      await postbackIdle(page);
    });

    await test.step('Picture, then save', async () => {
      await expect(page.locator('#ctl00_page_content')).toContainText('Picture');
      const next = page.locator(`[id^="${ADD}"][value*="Next"], [id^="${ADD}"][value="Save"]`).locator('visible=true').first();
      await next.click();
      await postbackIdle(page);
      await expect(page.locator('#ctl00_page_content')).toContainText(/saved successfully/i);
    });

    await test.step('the list finds the new adult with what was entered', async () => {
      await openPosPage(page, PATH);
      await page.locator(`#${ID}txtStudentId`).fill(adultId);
      await apply(page);
      expect((await gridRows(page, GRID))[0]).toMatchObject({ 'Adult ID': adultId, 'Last Name': name, 'First Name': 'Sabih', Site: TEST_SITE_NAME, 'Person Type': 'Adult' });
    });

    await test.step('Particulars keep the birth date, and the PIN is the ID', async () => {
      await page.locator(GRID).getByRole('link', { name: adultId, exact: true }).click();
      await expect(page.locator(`#${VIEW}calBirthDate_dateInput`)).toHaveValue('1/15/1990');
      await expect(page.locator(`#${VIEW}txtPin`)).toHaveValue(adultId);
      await expect(tab(page, 'Employee Details')).toHaveCount(0);
    });

    await test.step('Picture/Notes: a note is listed', async () => {
      await openTab(page, 'Picture/Notes');
      await page.locator(`#${VIEW}ucNotes_newCommentsTextBox`).fill(name);
      await page.locator(`#${VIEW}ucNotes_AddButton`).click();
      await postbackIdle(page);
      await expect(page.locator('#ctl00_page_content')).toContainText(name);
    });

    await test.step('Particulars: a new first name saves and shows in the list', async () => {
      await openTab(page, 'Particulars');
      await page.locator(`#${VIEW}txtFirstName`).fill('SabihEdited');
      await page.locator(`#${VIEW}btnApply`).click();
      await postbackIdle(page);
      await openPosPage(page, PATH);
      await page.locator(`#${ID}txtStudentId`).fill(adultId);
      await apply(page);
      expect((await gridRows(page, GRID))[0]['First Name']).toBe('SabihEdited');
    });

    await test.step('History records the edit', async () => {
      await page.locator(GRID).getByRole('link', { name: adultId, exact: true }).click();
      await openTab(page, 'History');
      await expect(page.locator('#ctl00_page_content')).toContainText(/made changes/);
    });

    await test.step('Deactivate: the adult moves to Inactive', async () => {
      await openTab(page, 'Particulars');
      await page.locator(`#${VIEW}chkIsActive`).uncheck();
      await page.locator(`#${VIEW}btnApply`).click();
      await postbackIdle(page);
      await openPosPage(page, PATH);
      await page.locator(`#${ID}txtStudentId`).fill(adultId);
      await apply(page);
      await expect(page.locator(GRID)).toContainText('No records to display.');
      await pick(page, 'ddlActive', 'Inactive');
      await apply(page);
      expect((await gridRows(page, GRID))[0]['Adult ID']).toBe(adultId);
    });
  });
});

async function apply(page: Page): Promise<void> {
  const grid = page.locator(GRID);
  if (await grid.count()) await redraw(page, GRID, () => page.locator(`#${ID}btnApply`).click());
  else {
    await page.locator(`#${ID}btnApply`).click();
    await expect(grid).toBeVisible();
    await postbackIdle(page);
  }
}

async function options(page: Page, box: string): Promise<string[]> {
  await page.locator(`#${ID}${box}_Arrow`).click();
  const items = (await page.locator(`#${ID}${box}_DropDown li`).allInnerTexts()).map((o) => o.trim());
  await page.locator(`#${ID}${box}_Arrow`).click();
  return items;
}

async function pick(page: Page, box: string, value: string): Promise<void> {
  await page.locator(`#${ID}${box}_Arrow`).click();
  await page.locator(`#${ID}${box}_DropDown li`).filter({ hasText: new RegExp(`^${value}$`) }).click();
  await expect(page.locator(`#${ID}${box}_Input`)).toHaveValue(value);
  await postbackIdle(page);
}

async function openAdult(page: Page, adultId: string): Promise<void> {
  await openPosPage(page, PATH);
  await pickSiteCode(page, TEST_SITE_CODE, SITE_PICKER);
  await page.locator(`#${ID}txtStudentId`).fill(adultId);
  await apply(page);
  await page.locator(GRID).getByRole('link', { name: adultId, exact: true }).click();
  await expect(page).toHaveURL(/ViewStaff\.aspx\?PersonId=/);
}

function tab(page: Page, name: string) {
  return page.locator('.rtsLink, [role=tab]').filter({ hasText: new RegExp(`^\\s*${name.replace('/', '\\/')}\\s*$`) });
}

async function openTab(page: Page, name: string): Promise<void> {
  await tab(page, name).first().click();
  await postbackIdle(page);
}
