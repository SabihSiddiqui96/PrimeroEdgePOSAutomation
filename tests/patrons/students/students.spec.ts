import { test, expect, Page } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import { expectButtons, expectCaptions, expectGridColumns, expectPageTitle, expectVisible } from '../../../utils/screen';
import { LOCAL_ONLY, LOCAL_ONLY_REASON, nextTestName, TEST_SITE_CODE, TEST_SITE_NAME } from '../../../utils/testData';
import { allGridRows, expectPaging, expectSorts, gridRows, gridTotal, pickSiteCode, postbackIdle, redraw, typeDate } from '../../../utils/webforms';

// POS > Patrons > Students (/POS/ManageStudents.aspx)
const PATH = '/POS/ManageStudents.aspx';
const ID = 'ctl00_UserContentArea_ManageStudents1_';
const VIEW = 'ctl00_UserContentArea_ViewStudents_';
const ADD = 'ctl00_UserContentArea_addStudent_';
const GRID = `#${ID}gridSearch_ctl00`;
const SITE_PICKER = { code: `${ID}ucAreaSiteSelector_rcbSiteCode`, site: `${ID}ucAreaSiteSelector_rcbSite_Input` };
const TABS = ['Particulars', 'Demographics', 'Household', 'Eligibility', 'Income Survey', 'Picture/Notes', 'Image/Documents', 'Allergies/Restrictions', 'Enrollment', 'Notifications', 'History'];
const COLUMNS = ['Student ID', 'Last Name', 'First Name', 'Preferred Name', 'Site', 'Grade', 'Birth Date', 'Eligibility', 'Status', 'Balance'];

test.describe('POS - Patrons - Students', () => {
  test('Students: filters, search, sort, paging, export, reset, and every tab of a student', async ({ page }) => {
    test.setTimeout(12 * 60_000);
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - Students/i);
    await expectPageTitle(page, 'Students');

    await test.step('every site and grade, any birth date, active students, by ID, by default', async () => {
      await expectCaptions(page, ['Site Code', 'Site', 'ID Only', 'PIN', 'State ID', 'Last Name', 'First Name', 'Preferred Name', 'Status']);
      await expectVisible(page, [`${ID}ucGradeSelector_rcbGrades_Input`, `${ID}txtBirthDate`]);
      await expect(page.locator(`#${SITE_PICKER.code}_Input`)).toHaveValue('-- ALL --');
      await expect(page.locator(`#${ID}ucGradeSelector_rcbGrades_Input`)).toHaveValue('--ALL--');
      await expect(page.locator(`#${ID}txtBirthDate`)).toHaveValue('__/__/____');
      await expect(page.locator(`#${ID}ddlActive_Input`)).toHaveValue('Active');
      await expect(page.locator(`#${ID}rblStudentIdSSNPinStateId_0`)).toBeChecked();
      await expect(await statusOptions(page)).toEqual(['--ALL--', 'Active', 'Inactive']);
      await expectButtons(page, [
        [`${ID}btnApply`, 'Apply'],
        [`${ID}btnReset`, 'Reset'],
        [`${ID}btnExport`, 'Export'],
        [`${ID}btnAddNew`, 'Add ...'],
      ]);
    });

    const students = await test.step('a site: only that site’s active students', async () => {
      await pickSiteCode(page, TEST_SITE_CODE, SITE_PICKER);
      await apply(page);
      await expectGridColumns(page, GRID.slice(1), COLUMNS);
      const rows = await allGridRows(page, GRID);
      expect(rows.length).toBeGreaterThan(1);
      for (const row of rows) {
        expect(row['Site']).toBe(TEST_SITE_NAME);
        expect(row['Status']).toBe('Active');
        expect(row['Student ID']).not.toBe('');
        expect(row['Balance']).toMatch(/^-?\$[\d,]+\.\d{2}$/);
      }
      return rows;
    });

    await test.step('paging and sorting', async () => {
      await redraw(page, GRID, () => page.locator(`#${ID}btnApply`).click());
      if ((await gridTotal(page, GRID)) > (await gridRows(page, GRID)).length) await expectPaging(page, GRID);
      await expectSorts(page, GRID, 'Last Name');
      await expectSorts(page, GRID, 'First Name');
      await expectSorts(page, GRID, 'Grade');
      await expectSorts(page, GRID, 'Birth Date');
      await expectSorts(page, GRID, 'Balance', 'money');
    });

    await test.step('Status: Active and Inactive together make --ALL--', async () => {
      const count = async (status: string) => {
        await pickStatus(page, status);
        await apply(page);
        const rows = await allGridRows(page, GRID);
        if (status !== '--ALL--') for (const r of rows) expect(r['Status'], status).toBe(status);
        return rows.length;
      };
      const active = students.length;
      const inactive = await count('Inactive');
      expect(await count('--ALL--')).toBe(active + inactive);
      await pickStatus(page, 'Active');
    });

    const student = students.find((s) => s['Preferred Name'] === '' && s['Grade'] !== '') ?? students[0];
    await test.step('ID Only finds exactly that student', async () => {
      await page.locator(`#${ID}txtStudentId`).fill(student['Student ID']);
      await apply(page);
      expect(await gridRows(page, GRID)).toEqual([student]);
    });

    await test.step('PIN and State ID search the same box another way', async () => {
      await page.locator(`#${ID}rblStudentIdSSNPinStateId_1`).check();
      await postbackIdle(page);
      await apply(page);
      for (const row of await gridRows(page, GRID)) expect(row['Site']).toBe(TEST_SITE_NAME);
      await page.locator(`#${ID}rblStudentIdSSNPinStateId_2`).check();
      await postbackIdle(page);
      await page.locator(`#${ID}txtStudentId`).fill('999999999');
      await apply(page);
      await expect(page.locator(GRID)).toContainText('No records to display.');
      await page.locator(`#${ID}rblStudentIdSSNPinStateId_0`).check();
      await postbackIdle(page);
      await page.locator(`#${ID}txtStudentId`).fill('');
    });

    await test.step('last and first name narrow the list', async () => {
      await page.locator(`#${ID}txtLastName`).fill(student['Last Name']);
      await apply(page);
      const byLast = await allGridRows(page, GRID);
      expect(byLast.map((r) => r['Student ID'])).toContain(student['Student ID']);
      for (const r of byLast) expect(r['Last Name'].toLowerCase()).toContain(student['Last Name'].toLowerCase());
      await page.locator(`#${ID}txtLastName`).fill('');
      await page.locator(`#${ID}txtFirstName`).fill(student['First Name']);
      await apply(page);
      const byFirst = await allGridRows(page, GRID);
      expect(byFirst.map((r) => r['Student ID'])).toContain(student['Student ID']);
      for (const r of byFirst) expect(r['First Name'].toLowerCase()).toContain(student['First Name'].toLowerCase());
    });

    await test.step('Export downloads the list as a spreadsheet', async () => {
      const download = page.waitForEvent('download');
      await page.locator(`#${ID}btnExport`).click();
      const file = await download;
      expect(file.suggestedFilename()).toMatch(/\.xls$/);
      expect((await require('fs').promises.stat(await file.path())).size).toBeGreaterThan(0);
    });

    await test.step('Reset puts every filter back', async () => {
      await page.locator(`#${ID}btnReset`).click();
      await postbackIdle(page);
      await expect(page.locator(`#${ID}txtFirstName`)).toHaveValue('');
      await expect(page.locator(`#${SITE_PICKER.code}_Input`)).toHaveValue('-- ALL --');
      await expect(page.locator(`#${ID}ddlActive_Input`)).toHaveValue('Active');
    });

    await test.step('opening a student: Particulars match the list row', async () => {
      await pickSiteCode(page, TEST_SITE_CODE, SITE_PICKER);
      await page.locator(`#${ID}txtStudentId`).fill(student['Student ID']);
      await apply(page);
      await page.locator(GRID).getByRole('link', { name: student['Student ID'], exact: true }).click();
      await expect(page).toHaveURL(/ViewStudent\.aspx\?PersonId=/);
      await expect(tab(page, 'Particulars')).toBeVisible();
      await expect(page.locator(`#${VIEW}txtStudentId`)).toHaveValue(student['Student ID']);
      await expect(page.locator(`#${VIEW}txtFirstName`)).toHaveValue(student['First Name']);
      await expect(page.locator(`#${VIEW}txtLastName`)).toHaveValue(student['Last Name']);
      await expect(page.locator(`#${VIEW}ddlSite option:checked`)).toHaveText(TEST_SITE_NAME);
      await expect(page.locator(`#${VIEW}chkIsActive`)).toBeChecked();
      await expect(page.locator(`#${VIEW}hlinkBalance`)).toHaveText(student['Balance']);
      await expectButtons(page, [
        [`${VIEW}btnCancel`, 'Cancel'],
        [`${VIEW}btnApply`, 'Save'],
      ]);
    });

    await test.step('every tab opens in order', async () => {
      for (const name of TABS) await expect(tab(page, name), name).toBeVisible();
    });

    await test.step('Demographics: birth date matches the list, guardian and contact fields', async () => {
      await openTab(page, 'Demographics');
      await expectCaptions(page, ['Ethnicity', 'Race', 'Gender', 'Language', 'Birth Date', 'Guardian Information', 'First Name', 'Last Name', 'Email']);
      const birth = await page.locator(`#${VIEW}calBirthDate_dateInput`).inputValue();
      expect(Date.parse(birth)).toBe(Date.parse(student['Birth Date']));
      await expect(page.locator(`#${VIEW}ddlGender option`)).toContainText(['Not Specified', 'Male', 'Female', 'Non-Binary']);
    });

    await test.step('Household: the household grid and Add Household Member', async () => {
      await openTab(page, 'Household');
      await expectButtons(page, [[`${VIEW}btnAddHouseHoldMember`, 'Add Household Member']]);
      await expect(page.locator('#ctl00_page_content')).toContainText('Students in Household');
    });

    await test.step('Eligibility: the status history, with Active and InActive ticked', async () => {
      await openTab(page, 'Eligibility');
      await expect(page.locator(`#${VIEW}ckbActive`)).toBeChecked();
      await expect(page.locator(`#${VIEW}ckbInActive`)).toBeChecked();
      await expect(page.locator(`#${VIEW}academicYearRadComBox_Input`)).toHaveValue('-- ALL --');
      for (const column of ['Status', 'State Eligibility', 'Start Date', 'End Date', 'Process Date', 'Reason', 'Processed By']) {
        await expect(page.locator('#ctl00_page_content'), column).toContainText(column);
      }
    });

    await test.step('Income Survey: the survey history', async () => {
      await openTab(page, 'Income Survey');
      for (const column of ['Status', 'Result', 'Process Date', 'Household Size', 'Survey #']) {
        await expect(page.locator('#ctl00_page_content'), column).toContainText(column);
      }
    });

    await test.step('Picture/Notes: upload limit, print and notes', async () => {
      await openTab(page, 'Picture/Notes');
      await expect(page.locator('#ctl00_page_content')).toContainText('Note: File size is limited to 50 KB.');
      await expectVisible(page, [`${VIEW}fileUploadImage`, `${VIEW}ucNotes_newCommentsTextBox`]);
      await expectButtons(page, [
        [`${VIEW}btnRemoveImage`, 'Remove'],
        [`${VIEW}ucPrintReport_rptRetriever`, 'Print'],
        [`${VIEW}ucNotes_AddButton`, 'Add Notes'],
      ]);
    });

    await test.step('Image/Documents: Upload File', async () => {
      await openTab(page, 'Image/Documents');
      await expectButtons(page, [[`${VIEW}ucDocuments_ucUploadFile_btnUploadFile`, 'Upload File']]);
    });

    await test.step('Allergies/Restrictions: the FALCPA allergens and every restriction', async () => {
      await openTab(page, 'Allergies/Restrictions');
      for (const allergen of ['Crustacean Shellfish', 'Egg', 'Fish', 'Milk', 'Peanuts', 'Sesame', 'Soy', 'Tree Nuts', 'Wheat']) {
        await expect(page.locator('#ctl00_page_content'), allergen).toContainText(allergen);
      }
      await expectCaptions(page, ['Menu Item Restrictions', 'Other Restrictions', 'Do not accept checks on this account', 'No charges allowed', 'Special Instructions', 'A La Carte Purchase Restrictions']);
      await expectButtons(page, [
        [`${VIEW}btnAddAllergen`, 'Custom Allergens'],
        [`${VIEW}btnAddMenuItem`, 'Add ...'],
        [`${VIEW}btnRemoveMenuItem`, 'Remove'],
      ]);
    });

    await test.step('Enrollment: the student’s school is on record', async () => {
      await openTab(page, 'Enrollment');
      await expect(page.locator('#ctl00_page_content')).toContainText('Enrollment History');
      await expect(page.locator('#ctl00_page_content')).toContainText(TEST_SITE_NAME);
    });

    await test.step('Notifications: Apply waits for a letter type', async () => {
      await openTab(page, 'Notifications');
      await expect(page.locator(`#${VIEW}ucLetterNotification_btnLetterNotificationApply`)).toBeDisabled();
      await expect(page.locator(`#${VIEW}ucLetterNotification_rcbLetterType_Input`)).toHaveValue('-- SELECT --');
      await expect(page.locator('#ctl00_page_content')).toContainText('Letters that are re-printed or re-sent from here are not added to the Notification history.');
      await expect(page.locator(`#${VIEW}ucLetterNotification_btnFormNotificationsApply`)).toBeEnabled();
    });

    await test.step('History: changes listed newest first, with details', async () => {
      await openTab(page, 'History');
      const entries = page.locator('[id*="ucHistoryViewerStudent_rptHistoryEntries"][id$="aShowDetails"]');
      if (!(await entries.count())) return;
      const times = (await page.locator('#ctl00_page_content').innerText()).match(/\d+\/\d+\/\d{4} \d+:\d+:\d+ [AP]M(?= - )/g) ?? [];
      const parsed = times.map((t) => Date.parse(t));
      expect(parsed, 'newest first').toEqual([...parsed].sort((a, b) => b - a));
      await entries.first().click();
      await expect(page.locator('#ctl00_page_content')).toContainText(/Hide Details|Field|Old Value|New Value/i);
    });

    await test.step('Back to Students returns to the list', async () => {
      await page.locator(`#${VIEW}hplBackStudents`).click();
      await expect(page).toHaveURL(/ManageStudents\.aspx/);
      await expectPageTitle(page, 'Students');
    });
  });

  test.fixme('Students: Grade sorts PK, KG, 1, 2 and up, and Birth Date by date', async ({ page }) => {
    await openPosPage(page, PATH);
    await pickSiteCode(page, TEST_SITE_CODE, SITE_PICKER);
    await apply(page);
    await expectSorts(page, GRID, 'Grade', 'grade');
    await expectSorts(page, GRID, 'Birth Date', 'date');
  });

  test('Students: add a student through every step, find it, edit it, add a note and deactivate it', async ({ page }) => {
    test.skip(LOCAL_ONLY, LOCAL_ONLY_REASON);
    test.setTimeout(12 * 60_000);
    page.on('dialog', (d) => void d.accept());

    const name = await test.step('the next free SabihTesting name', async () => {
      await openPosPage(page, PATH);
      await page.locator(`#${ID}txtLastName`).fill('SabihTesting');
      await pickStatus(page, '--ALL--');
      await apply(page);
      const rows = await allGridRows(page, GRID).catch(() => []);
      return nextTestName(rows.map((r) => r['Last Name']));
    });
    const studentId = `ST${Date.now().toString().slice(-7)}`;

    await test.step('Add: Next with nothing filled names every required field', async () => {
      await page.locator(`#${ID}btnAddNew`).click();
      await expect(page).toHaveURL(/AddNewStudent\.aspx/);
      for (const step of ['Particulars', 'Demographics', 'Picture', 'Allergies and Restrictions', 'Confirmation']) {
        await expect(page.locator('#ctl00_page_content'), step).toContainText(step);
      }
      await expect(page.locator(`#${ADD}chkIsActive`)).toBeChecked();
      await expect(page.locator(`#${ADD}chkAccountActive`)).toBeChecked();
      await page.locator(`#${ADD}btnParticularsNext`).click();
      for (const message of ['Enter a First Name.', 'Enter a Last Name.', 'Select a Site.', 'Enter a Student ID.', 'Enter a Pin.']) {
        await expect(page.locator('body'), message).toContainText(message);
      }
    });

    const grade = await test.step('Particulars: name, site, grade, ID and PIN', async () => {
      await page.locator(`#${ADD}txtFirstName`).fill('Sabih');
      await page.locator(`#${ADD}txtLastName`).fill(name);
      await page.locator(`#${ADD}ddlSite`).selectOption({ label: TEST_SITE_NAME });
      await postbackIdle(page);
      const grades = (await page.locator(`#${ADD}ddlGrade option`).allInnerTexts()).map((g) => g.trim()).filter((g) => !/select/i.test(g));
      expect(grades.length, 'the site’s grades').toBeGreaterThan(0);
      await page.locator(`#${ADD}ddlGrade`).selectOption({ index: 1 });
      await postbackIdle(page);
      const idBox = page.locator(`#${ADD}txtStudentId`);
      await idBox.click();
      await idBox.pressSequentially(studentId);
      await idBox.press('Tab');
      await expect(page.locator(`#${ADD}txtPin`), 'the PIN starts as the student ID').toHaveValue(studentId);
      await page.locator(`#${ADD}btnParticularsNext`).click();
      await expect(page.locator(`#${ADD}btnDemoNext`)).toBeVisible();
      return (await page.locator(`#${ADD}ddlGrade option:checked`).innerText().catch(() => grades[1] ?? '')).trim();
    });

    await test.step('Demographics: the birth date is required', async () => {
      await page.locator(`#${ADD}btnDemoNext`).click();
      await expect(page.locator('body')).toContainText('Enter Birth Date.');
      await typeDate(page, `${ADD}calBirthDate_dateInput`, '1/15/2018');
      await page.locator(`#${ADD}ddlGender`).selectOption({ label: 'Female' });
      await page.locator(`#${ADD}btnDemoNext`).click();
      await expect(page.locator(`#${ADD}btnPicNext`)).toBeVisible();
    });

    await test.step('Picture, then Allergies: tick an allergen and save', async () => {
      await page.locator(`#${ADD}btnPicNext`).click();
      await expect(page.locator(`#${ADD}btnSave`)).toBeVisible();
      await page.locator('#ctl00_page_content label').filter({ hasText: /^Peanuts$/ }).click();
      await postbackIdle(page);
      await page.locator(`#${ADD}btnSave`).click();
      await expect(page.locator('#ctl00_page_content')).toContainText(`Student information ${studentId} was saved successfully.`);
      await expectButtons(page, [
        [`${ADD}ButtonRedirectToAdd`, 'Add Another Student..'],
        [`${ADD}ButtonGoToStudentDetails`, 'Go to Student Details'],
        [`${ADD}btnClose`, 'Close'],
      ]);
    });

    await test.step('Go to Student Details opens the new student', async () => {
      await page.locator(`#${ADD}ButtonGoToStudentDetails`).click();
      await expect(page).toHaveURL(/ViewStudent\.aspx\?PersonId=/);
      await expect(page.locator(`#${VIEW}txtStudentId`)).toHaveValue(studentId);
    });

    await test.step('the list finds the new student by ID with what was entered', async () => {
      await openPosPage(page, PATH);
      await page.locator(`#${ID}txtStudentId`).fill(studentId);
      await apply(page);
      const [row] = await gridRows(page, GRID);
      expect(row).toMatchObject({ 'Student ID': studentId, 'Last Name': name, 'First Name': 'Sabih', Site: TEST_SITE_NAME, Status: 'Active', 'Birth Date': '01/15/2018' });
      if (grade) expect(row['Grade']).toBe(grade);
    });

    await test.step('the student’s tabs keep what the wizard saved', async () => {
      await page.locator(GRID).getByRole('link', { name: studentId, exact: true }).click();
      await expect(page.locator(`#${VIEW}txtPin`)).toHaveValue(studentId);
      await openTab(page, 'Demographics');
      await expect(page.locator(`#${VIEW}calBirthDate_dateInput`)).toHaveValue('1/15/2018');
      await expect(page.locator(`#${VIEW}ddlGender option:checked`)).toHaveText('Female');
      await openTab(page, 'Allergies/Restrictions');
      const peanuts = page.locator('#ctl00_page_content td', { hasText: /^Peanuts$/ }).locator('input[type=checkbox]');
      await expect(peanuts).toBeChecked();
      await openTab(page, 'Enrollment');
      await expect(page.locator('#ctl00_page_content')).toContainText(TEST_SITE_NAME);
    });

    await test.step('Picture/Notes: a note is listed under Previous Notes', async () => {
      await openTab(page, 'Picture/Notes');
      await page.locator(`#${VIEW}ucNotes_newCommentsTextBox`).fill(name);
      await page.locator(`#${VIEW}ucNotes_AddButton`).click();
      await postbackIdle(page);
      await expect(page.locator('#ctl00_page_content')).toContainText(name);
    });

    await test.step('Particulars: a preferred name saves and shows in the list', async () => {
      await openTab(page, 'Particulars');
      await page.locator(`#${VIEW}txtPreferredName`).fill(name);
      await page.locator(`#${VIEW}btnApply`).click();
      await postbackIdle(page);
      await openPosPage(page, PATH);
      await page.locator(`#${ID}txtStudentId`).fill(studentId);
      await apply(page);
      expect((await gridRows(page, GRID))[0]['Preferred Name']).toBe(name);
    });

    await test.step('History records the edit', async () => {
      await page.locator(GRID).getByRole('link', { name: studentId, exact: true }).click();
      await openTab(page, 'History');
      await expect(page.locator('#ctl00_page_content')).toContainText(/made changes/);
    });

    await test.step('Deactivate: the student moves to Inactive', async () => {
      await openTab(page, 'Particulars');
      await page.locator(`#${VIEW}chkIsActive`).uncheck();
      await page.locator(`#${VIEW}btnApply`).click();
      await postbackIdle(page);
      await openPosPage(page, PATH);
      await page.locator(`#${ID}txtStudentId`).fill(studentId);
      await apply(page);
      await expect(page.locator(GRID)).toContainText('No records to display.');
      await pickStatus(page, 'Inactive');
      await apply(page);
      expect((await gridRows(page, GRID))[0]).toMatchObject({ 'Student ID': studentId, Status: 'Inactive' });
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

async function statusOptions(page: Page): Promise<string[]> {
  await page.locator(`#${ID}ddlActive_Arrow`).click();
  const options = (await page.locator(`#${ID}ddlActive_DropDown li`).allInnerTexts()).map((o) => o.trim());
  await page.locator(`#${ID}ddlActive_Arrow`).click();
  return options;
}

async function pickStatus(page: Page, status: string): Promise<void> {
  await page.locator(`#${ID}ddlActive_Arrow`).click();
  await page.locator(`#${ID}ddlActive_DropDown li`).filter({ hasText: new RegExp(`^${status}$`) }).click();
  await expect(page.locator(`#${ID}ddlActive_Input`)).toHaveValue(status);
  await postbackIdle(page);
}

function tab(page: Page, name: string) {
  return page.locator('.rtsLink, [role=tab]').filter({ hasText: new RegExp(`^\\s*${name.replace('/', '\\/')}\\s*$`) }).first();
}

async function openTab(page: Page, name: string): Promise<void> {
  await tab(page, name).click();
  await postbackIdle(page);
  await expect(tab(page, name).locator('xpath=ancestor-or-self::*[contains(@class,"rtsSelected") or @aria-selected="true"][1]')).toHaveCount(1);
}
