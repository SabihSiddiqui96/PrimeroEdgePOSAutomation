import { test, expect, Page } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import { expectButtons, expectCaptions, expectGridColumns, expectHasOptions, expectPageTitle, expectVisible } from '../../../utils/screen';
import { TEST_PATRON_ID, TEST_SITE_CODE, TEST_SITE_NAME } from '../../../utils/testData';
import { allGridRows, expectPaging, gridRows, gridTotal, pickSiteCode, postbackIdle, redraw } from '../../../utils/webforms';

// POS > Patrons > ID Cards (/POS/PrintIDCards.aspx)
const PATH = '/POS/PrintIDCards.aspx';
const ID = 'ctl00_UserContentArea_';
const GRID = `#${ID}rgStudentList_ctl00`;

test.describe('POS - Patrons - ID Cards', () => {
  test('ID Cards: bulk by site, homeroom and roster, view and print cards, and one patron at a time', async ({ page }) => {
    test.setTimeout(10 * 60_000);
    // Printing opens the system dialog; record what would have printed instead.
    await page.context().addInitScript(() => {
      window.print = () => console.log(`PRINTED:${document.body.innerText}`);
    });
    const printed: string[] = [];
    page.context().on('console', (m) => {
      if (m.text().startsWith('PRINTED:')) printed.push(m.text().replace(/\s+/g, ' '));
    });

    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/PrimeroEdge - ID Cards/i);
    await expectPageTitle(page, 'ID Cards');

    await test.step('bulk, every grade, no roster by default, with the barcode font notes', async () => {
      await expectCaptions(page, ['Site Code', 'Site', 'Homeroom', 'Special Roster', 'Generate By', 'Bulk', 'Individual']);
      await expect(page.locator(`#${ID}SearchByRadioButtonList_0`)).toBeChecked();
      await expect(page.locator(`#${ID}ucGradeSelector_rcbGrades_Input`)).toHaveValue('--ALL--');
      await expect(page.locator(`#${ID}ddlSpecialRoster option:checked`)).toHaveText('-- SELECT --');
      await expect(page.locator('#ctl00_page_content')).toContainText('There is a special font required in order for barcodes to print.');
      await expect(page.locator('#ctl00_page_content')).toContainText('For a better user experience, please print from a Google Chrome browser.');
      await expect(page.locator('#ctl00_page_content').getByText('Click here', { exact: false }).first()).toBeVisible();
      await expectButtons(page, [[`${ID}btnGenerateList`, 'Generate ID Card(s)']]);
    });

    const homerooms = await test.step('a site loads its own homerooms and special rosters', async () => {
      const rostersBefore = await page.locator(`#${ID}ddlSpecialRoster option`).allInnerTexts();
      await pickSiteCode(page, TEST_SITE_CODE);
      await postbackIdle(page);
      await expect(page.locator(`#${ID}ddlHomeRoom_Input`)).toHaveValue('--ALL--');
      await expect.poll(() => page.locator(`#${ID}ddlSpecialRoster option`).allInnerTexts()).not.toEqual(rostersBefore);
      await expectHasOptions(page, `${ID}ddlSpecialRoster`);
      return (await dropDown(page, 'ddlHomeRoom')).filter((h) => h !== '--ALL--');
    });

    const all = await test.step('Generate: every patron at the site, with Print All and a print box and view on each row', async () => {
      await generate(page);
      await expectGridColumns(page, GRID.slice(1), ['Patron ID', 'Last Name', 'First Name', 'MI', 'Site Code', 'Site Name', 'Grade', 'Homeroom', 'Print']);
      const rows = await allGridRows(page, GRID);
      expect(rows.length).toBeGreaterThan(1);
      for (const row of rows) {
        expect(row['Site Code']).toBe(TEST_SITE_CODE);
        expect(row['Site Name']).toBe(TEST_SITE_NAME);
        expect(row['Patron ID']).not.toBe('');
      }
      await expectButtons(page, [[`${ID}btnPrintAll`, 'Print All']]);
      return rows;
    });

    await test.step('paging', async () => {
      await expectPaging(page, GRID);
    });

    await test.step('a homeroom lists only its patrons', async () => {
      const homeroom = homerooms[0];
      await pickDropDown(page, 'ddlHomeRoom', homeroom);
      await generate(page);
      const rows = await allGridRows(page, GRID).catch(() => []);
      expect(rows.length).toBeLessThan(all.length);
      const name = homeroom.replace(/\s*\([^)]*\)$/, '');
      for (const r of rows) expect(r['Homeroom'], homeroom).toBe(name);
      await pickDropDown(page, 'ddlHomeRoom', '--ALL--');
    });

    await test.step('a special roster lists only its members', async () => {
      const roster = (await page.locator(`#${ID}ddlSpecialRoster option`).allInnerTexts()).find((o) => !/select/i.test(o))!;
      await page.locator(`#${ID}ddlSpecialRoster`).selectOption({ label: roster });
      await postbackIdle(page);
      await generate(page);
      const total = await gridTotal(page, GRID);
      expect(total).toBeLessThan(all.length);
      await page.locator(`#${ID}ddlSpecialRoster`).selectOption({ index: 0 });
      await postbackIdle(page);
    });

    const patron = all.find((r) => r['Patron ID'] === TEST_PATRON_ID) ?? all[0];
    await test.step('the view icon shows that patron’s card', async () => {
      await generate(page);
      const row = await findRow(page, patron['Patron ID']);
      const popup = page.context().waitForEvent('page');
      await row.locator('input[id$="ViewLetterCaller_imgView"]').click();
      const card = await popup;
      const text = async () => (await card.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
      await expect.poll(text, { message: 'ID card', timeout: 60_000 }).toContain(patron['Last Name']);
      expect(await text()).toContain(patron['First Name']);
      await card.close();
    });

    await test.step('Print All asks how to sort, by homeroom first; Cancel prints nothing', async () => {
      await page.locator(`#${ID}btnPrintAll`).click();
      for (const option of ['Homeroom', 'Grade', 'Last Name', 'Patron ID#']) await expect(sortOption(page, option), option).toBeVisible();
      await expect(sortOption(page, 'Homeroom').locator('input')).toBeChecked();
      const before = printed.length;
      await page.locator('input[value="Cancel"]').locator('visible=true').last().click();
      await expect(sortOption(page, 'Homeroom')).toBeHidden();
      expect(printed.length).toBe(before);
    });

    await test.step('Print All by Patron ID# prints every card on the list, in ID order', async () => {
      await page.locator(`#${ID}btnPrintAll`).click();
      await sortOption(page, 'Patron ID#').locator('input').check();
      const before = printed.length;
      await page.locator('input[value="Print"]').locator('visible=true').last().click();
      await expect.poll(() => printed.length, { message: 'cards sent to print', timeout: 60_000 }).toBeGreaterThan(before);
      const sheet = printed[printed.length - 1];
      const ids = [...sheet.matchAll(/ID: (\S+)/g)].map((m) => m[1]);
      expect(ids.length, 'a card per patron').toBe(all.length);
      // IDs can hold letters, so they sort as text.
      expect(ids, 'by Patron ID#').toEqual([...ids].sort((a, b) => a.localeCompare(b, 'en')));
      // The barcode carries the patron's PIN between asterisks.
      expect([...sheet.matchAll(/\*[^*\s]+\s*\*/g)].length, 'a barcode on every card').toBe(ids.length);
      expect(sheet).toContain(`Site: ${TEST_SITE_NAME}`);
    });

    await test.step('Individual: a patron lookup takes the place of the filters', async () => {
      await page.locator(`#${ID}SearchByRadioButtonList_1`).check();
      await postbackIdle(page);
      await expectVisible(page, [`${ID}ucLookUp_txtStudentID`]);
      await expectButtons(page, [[`${ID}ucLookUp_btnStudentID`, '...']]);
      await expect(page.locator(`#${ID}ddlSpecialRoster`)).toBeHidden();
      const box = page.locator(`#${ID}ucLookUp_txtStudentID`);
      await box.click();
      await box.pressSequentially(TEST_PATRON_ID);
      // The suggestion list highlights a longer ID that Tab would pick.
      await page.locator(`#${ID}ucLookUp_myPanel`).waitFor({ timeout: 5_000 }).then(() => box.press('Escape'), () => {});
      await expect(box).toHaveValue(TEST_PATRON_ID);
      await box.press('Tab');
      await postbackIdle(page);
      const content = page.locator('#ctl00_page_content');
      await expect(content).toContainText('Total Entries: 1');
      await expect(content).toContainText(patron['Last Name']);
      await expect(content).toContainText(TEST_SITE_NAME);
      const before = printed.length;
      await page.locator('input[value="Print"]').locator('visible=true').first().click();
      const sort = page.locator('input[value="Print"]').locator('visible=true').last();
      if (await sortOption(page, 'Homeroom').isVisible()) await sort.click();
      await expect.poll(() => printed.length, { message: 'the one card sent to print', timeout: 60_000 }).toBeGreaterThan(before);
      expect([...printed[printed.length - 1].matchAll(/ID: (\S+)/g)].map((m) => m[1])).toEqual([TEST_PATRON_ID]);
    });

    await test.step('Bulk brings the filters back', async () => {
      await page.locator(`#${ID}SearchByRadioButtonList_0`).check();
      await postbackIdle(page);
      await expect(page.locator(`#${ID}ddlSpecialRoster`)).toBeVisible();
    });
  });
});

async function generate(page: Page): Promise<void> {
  const grid = page.locator(GRID);
  if (await grid.count()) await redraw(page, GRID, () => page.locator(`#${ID}btnGenerateList`).click());
  else {
    await page.locator(`#${ID}btnGenerateList`).click();
    await expect(grid).toBeVisible();
    await postbackIdle(page);
  }
}

async function dropDown(page: Page, box: string): Promise<string[]> {
  await page.locator(`#${ID}${box}_Arrow`).click();
  const items = (await page.locator(`#${ID}${box}_DropDown li`).allInnerTexts()).map((o) => o.trim());
  await page.locator(`#${ID}${box}_Arrow`).click();
  return items;
}

async function pickDropDown(page: Page, box: string, value: string): Promise<void> {
  await page.locator(`#${ID}${box}_Arrow`).click();
  await page.locator(`#${ID}${box}_DropDown li`).filter({ hasText: value }).first().click();
  await expect(page.locator(`#${ID}${box}_Input`)).toHaveValue(value);
  await postbackIdle(page);
}

/** One Sort By choice in the Print All box. */
function sortOption(page: Page, name: string) {
  const label = new RegExp(`^\\s*${name.replace('#', '\\#')}\\s*$`);
  return page.locator('span, label, td').filter({ has: page.locator('input[type=radio]') }).filter({ hasText: label }).locator('visible=true').first();
}

/** The grid row for a patron, paging forward until it shows. */
async function findRow(page: Page, patronId: string) {
  const row = page.locator(`${GRID} > tbody > tr`).filter({ has: page.locator('td').first().getByText(patronId, { exact: true }) });
  for (let pages = 0; !(await row.count()); pages++) {
    expect(pages, `patron ${patronId} in the list`).toBeLessThan(30);
    await redraw(page, GRID, () => page.locator(`${GRID} .rgPageNext`).first().click());
  }
  return row.first();
}
