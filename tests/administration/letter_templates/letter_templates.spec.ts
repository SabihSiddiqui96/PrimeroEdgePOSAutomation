import { test, expect, Page } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import { redraw } from '../../../utils/webforms';
import { expectButtons, expectCaptions, expectHasOptions, expectPageTitle, optionTexts } from '../../../utils/screen';

// POS > Administration > Letter Templates (/POS/LetterTemplates.aspx)
const PATH = '/POS/LetterTemplates.aspx';
const ID = 'ctl00_UserContentArea_ucLetterTenplate_';
const LETTER_TYPE = `${ID}ddlLetterType`;
const GRID = `#${ID}rgLetterTemplates_ctl00`;
const COPY = /^SabihTesting\d+$/;

interface TemplateRow {
  name: string;
  subject: string;
  editedOn: string;
  editedBy: string;
  standard: boolean;
  active: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

test.describe('POS - Administration - Letter Templates', () => {
  test('Letter Templates: every letter type, preview, save as, edit and delete', async ({ page }) => {
    test.setTimeout(5 * 60_000);
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/Letter Templates/i);
    await expectPageTitle(page, 'Letter Templates');
    await expectCaptions(page, ['Letter Type', 'Language']);
    await expectHasOptions(page, LETTER_TYPE);
    await expectHasOptions(page, `${ID}ddlLanguage`);
    await expectButtons(page, [[`${ID}btnApply`, 'Apply']]);

    const types = await optionTexts(page, LETTER_TYPE);
    const reminderType = types.find((t) => /Reminder Letter/i.test(t));
    expect(reminderType, 'a reminder letter type').toBeDefined();

    try {
      await test.step('every letter type has an active template', async () => {
        for (const type of types) {
          const rows = await showType(page, type);
          expect(rows.length, `${type}: templates`).toBeGreaterThan(0);
          expect(rows.filter((r) => r.active).length, `${type}: an active template`).toBeGreaterThan(0);
          for (const row of rows.filter((r) => r.standard)) {
            expect(row.canDelete, `${type}: standard "${row.name}" cannot be deleted`).toBe(false);
          }
        }
      });

      const source = await test.step('View previews the active reminder letter', async () => {
        await removeCopies(page, reminderType!);
        const rows = await showType(page, reminderType!);
        const active = rows.find((r) => r.active)!;
        const popup = page.context().waitForEvent('page');
        await templateRow(page, active.name).locator('input[id$="imgView"]').click();
        const preview = await popup;
        await expect(preview).toHaveURL(/letterviewer\.aspx/i);
        await expect.poll(async () => (await preview.locator('body').innerText()).trim().length, { message: 'letter text' }).toBeGreaterThan(50);
        await preview.close();
        return active;
      });

      const copyName = 'SabihTesting1';

      await test.step('Save As: name required, duplicate names refused, saved as an inactive copy', async () => {
        const popup = page.context().waitForEvent('page');
        await templateRow(page, source.name).getByRole('link', { name: source.name }).click();
        const editor = await popup;
        await expect(editor.locator('body')).toContainText(`Template Name: ${source.name}`);
        await expect(editor.locator('#txtBoxEmailSubjectUpdate')).toHaveValue(source.subject);

        await editor.locator('#btnSaveAs').click();
        const nameBox = editor.locator('#txtBoxLetterTemplateSaveAs');
        const ok = editor.locator('#btnSaveAsLetterTemplate');
        const duplicate = editor.locator('#divErrorMsg');
        await expect(nameBox).toBeVisible();
        await expect(ok, 'OK without a name').toBeDisabled();

        await typeName(editor, nameBox, source.name);
        await expect(duplicate, 'duplicate name message').toBeVisible();
        await expect(duplicate).toHaveText('Template name already exists.');
        await expect(ok, 'OK with a duplicate name').toBeDisabled();

        await typeName(editor, nameBox, copyName);
        await expect(duplicate).toBeHidden();
        await expect(ok, 'OK with a new name').toBeEnabled();
        // Leave the copy inactive so the district's letters are untouched.
        await editor.locator('#chkBoxIsChecked').setChecked(false);
        const saved = editor.waitForResponse((r) => r.request().method() === 'POST' && /LetterEditorHTML\.aspx/i.test(r.url()));
        await ok.click();
        await saved;
        await editor.waitForLoadState();
        await expect(editor.locator('body')).toContainText(`Template Name: ${copyName}`);
        await expect(nameBox, 'Save As panel closed').toBeHidden();
        await editor.close();
      });

      await test.step('the copy is listed: same subject, not standard, not active', async () => {
        // The copy can take a few seconds to reach the list after the editor saves it.
        let copy: TemplateRow | undefined;
        await expect
          .poll(async () => (copy = (await showType(page, reminderType!)).find((r) => r.name === copyName)), {
            message: 'copy in the list',
            timeout: 60_000,
          })
          .toBeDefined();
        expect(copy).toMatchObject({ subject: source.subject, standard: false, active: false, canEdit: true, canDelete: true });
        expect(new Date(Date.parse(copy!.editedOn)).toDateString(), 'edited today').toBe(new Date().toDateString());
        expect(copy!.editedBy).not.toBe('');
      });

      await test.step('Edit shows the Active box; Cancel changes nothing', async () => {
        await templateRow(page, copyName).locator('input[id$="EditButton"]').click();
        const active = page.locator(`${GRID} input[id$="cbxActive"]`);
        await expect(active).toBeVisible();
        await expect(active).not.toBeChecked();
        await page.locator(`${GRID} input[id$="CancelButton"]`).click();
        await expect(active).toHaveCount(0);
        expect((await rowsOf(page)).find((r) => r.name === copyName)).toMatchObject({ active: false });
      });

      await test.step('Delete asks first; dismissing keeps it, confirming removes it', async () => {
        page.once('dialog', (d) => d.dismiss());
        await templateRow(page, copyName).locator('input[id$="gbcDeleteColumn"]').click();
        await expect(templateRow(page, copyName)).toBeVisible();

        page.once('dialog', async (d) => {
          expect(d.message()).toBe('Are you sure you want to delete ?');
          await d.accept();
        });
        await templateRow(page, copyName).locator('input[id$="gbcDeleteColumn"]').click();
        await expect(templateRow(page, copyName)).toHaveCount(0);
        expect((await showType(page, reminderType!)).map((r) => r.name)).not.toContain(copyName);
      });
    } finally {
      await removeCopies(page, reminderType!).catch(() => undefined);
    }
  });
});

function templateRow(page: Page, name: string) {
  return page.locator(`${GRID} > tbody > tr`).filter({ has: page.getByRole('link', { name, exact: true }) });
}

async function showType(page: Page, type: string): Promise<TemplateRow[]> {
  await page.locator(`#${LETTER_TYPE}`).selectOption({ label: type });
  await redraw(page, GRID, () => page.locator(`#${ID}btnApply`).click());
  return rowsOf(page);
}

/** Top-level template rows, read by header; each row also carries a hidden history table. */
async function rowsOf(page: Page): Promise<TemplateRow[]> {
  return page.locator(GRID).evaluate((grid) => {
    const headers = Array.from(grid.querySelectorAll(':scope > thead > tr > th')).map((th) => (th as HTMLElement).innerText.trim());
    const rows = Array.from(grid.querySelectorAll(':scope > tbody > tr.rgRow, :scope > tbody > tr.rgAltRow'));
    return rows.map((row) => {
      const cells = Array.from(row.children) as HTMLElement[];
      const cell = (name: string) => cells[headers.indexOf(name)];
      const text = (name: string) => cell(name)?.innerText.trim() ?? '';
      return {
        name: (cell('Template Name')?.querySelector('a') as HTMLElement | null)?.innerText.trim() ?? '',
        subject: text('Email Subject'),
        editedOn: text('Last Edited On'),
        editedBy: text('Edited By'),
        standard: !!row.querySelector('img[id$="imgStandard"]'),
        active: !!row.querySelector('img[id$="imgActive"]'),
        canEdit: !!row.querySelector('input[id$="EditButton"]'),
        canDelete: !!row.querySelector('input[id$="gbcDeleteColumn"]'),
      };
    });
  });
}

/** The name box checks for duplicates on the server as it loses focus. */
async function typeName(editor: Page, box: ReturnType<Page['locator']>, name: string): Promise<void> {
  await box.click();
  await editor.keyboard.press('Control+A');
  await editor.keyboard.press('Backspace');
  await editor.keyboard.type(name, { delay: 30 });
  const check = editor.waitForResponse((r) => /IsTemplateNameAlreadyExisting/.test(r.url()));
  await box.press('Tab');
  await check;
}

async function removeCopies(page: Page, type: string): Promise<void> {
  for (const row of (await showType(page, type)).filter((r) => COPY.test(r.name))) {
    page.once('dialog', (d) => d.accept());
    await templateRow(page, row.name).locator('input[id$="gbcDeleteColumn"]').click();
    await expect(templateRow(page, row.name)).toHaveCount(0);
  }
}
