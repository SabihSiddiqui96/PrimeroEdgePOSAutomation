import { test, expect, Page } from '@playwright/test';
import { openPosPage } from '../../../utils/pos';
import { expectSorts, redraw } from '../../../utils/webforms';
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
  test('Letter Templates: every letter type, fonts, editor, save as, edit, activate, sort and delete', async ({ page }) => {
    test.setTimeout(10 * 60_000);
    await openPosPage(page, PATH);
    await expect(page).toHaveTitle(/Letter Templates/i);
    await expectPageTitle(page, 'Letter Templates');
    await expectCaptions(page, ['Letter Type', 'Language']);
    await expectHasOptions(page, LETTER_TYPE);
    await expectHasOptions(page, `${ID}ddlLanguage`);
    expect(await optionTexts(page, `${ID}ddlLanguage`)).toContain('English');
    await expectButtons(page, [[`${ID}btnApply`, 'Apply']]);

    const types = await optionTexts(page, LETTER_TYPE);
    const reminderType = types.find((t) => /Reminder Letter/i.test(t));
    expect(reminderType, 'a reminder letter type').toBeDefined();
    let restore: { type: string; name: string } | undefined;

    try {
      await test.step('every letter type has exactly one active template, which cannot be edited or deleted', async () => {
        for (const type of types) {
          const rows = await showType(page, type);
          expect(rows.length, `${type}: templates`).toBeGreaterThan(0);
          expect(rows.filter((r) => r.active).length, `${type}: one active template`).toBe(1);
          for (const row of rows.filter((r) => r.standard)) {
            expect(row.canDelete, `${type}: standard "${row.name}" cannot be deleted`).toBe(false);
          }
          for (const row of rows.filter((r) => r.active)) expect(row.canEdit, `${type}: active "${row.name}" has no Edit`).toBe(false);
        }
      });

      await test.step('Click here downloads both barcode fonts', async () => {
        // The fonts note shows for the letter types that print barcodes.
        await showType(page, types.find((t) => /Student ID Cards/i.test(t))!);
        await expect(page.locator('body')).toContainText('Libre Barcode 39');
        const files: string[] = [];
        const both = new Promise<void>((resolve) => {
          page.on('download', (d) => {
            files.push(d.suggestedFilename());
            if (files.length === 2) resolve();
          });
        });
        await page.locator('a').filter({ hasText: /^Click here$/ }).locator('visible=true').click();
        await both;
        expect(files.sort()).toEqual(['CODE3of9.TTF', 'LibreBarcode39-Regular.ttf']);
      });

      await test.step('Activating another template moves Active to it; switching back restores it', async () => {
        const type = types.find((t) => /Student ID Cards/i.test(t)) ?? types.find((t) => t !== reminderType)!;
        const rows = await showType(page, type);
        const active = rows.find((r) => r.active)!;
        const other = rows.find((r) => !r.active && r.canEdit);
        if (!other) {
          test.info().annotations.push({ type: 'note', description: `${type}: no second template to activate` });
          return;
        }
        restore = { type, name: active.name };
        await activate(page, other.name);
        let now = await rowsOf(page);
        expect(now.find((r) => r.name === other.name)?.active, `${other.name} active`).toBe(true);
        expect(now.find((r) => r.name === active.name)?.active, `${active.name} no longer active`).toBe(false);
        expect(now.filter((r) => r.active)).toHaveLength(1);
        await activate(page, active.name);
        restore = undefined;
        now = await showType(page, type);
        expect(now.find((r) => r.name === active.name)?.active, `${active.name} active again`).toBe(true);
        expect(now.filter((r) => r.active)).toHaveLength(1);
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

        // A standard template is read-only: subject locked, Save disabled with the reason.
        await expect(editor.locator('#txtBoxEmailSubjectUpdate')).toBeDisabled();
        await expect(editor.locator('#btnSave')).toBeDisabled();
        await expect(editor.locator('#btnSave')).toHaveAttribute('title', 'Changes cannot be made to the Standard Template.');

        await editor.getByRole('link', { name: 'Insert Fields', exact: true }).first().click();
        const fields = (await editor.locator('.reDropDownBody').locator('visible=true').last().innerText()).split('\n').map((f) => f.trim());
        for (const field of ['Balance', 'Current Date', 'District']) expect(fields, `Insert Fields: ${field}`).toContain(field);
        await editor.keyboard.press('Escape');
        await editor.getByRole('link', { name: 'Preview', exact: true }).first().click();
        const preview = editor.frameLocator('iframe').first().locator('body');
        await expect(preview, 'preview shows the fields unfilled').toContainText('{{Balance}}');
        for (const [, used] of (await preview.innerText()).matchAll(/\{\{([^}]+)\}\}/g)) {
          expect(fields, `the template's {{${used}}} is a field Insert Fields offers`).toContain(used);
        }
        await editor.getByRole('link', { name: 'HTML', exact: true }).first().click();
        await expect(editor.locator('textarea').locator('visible=true').first()).toHaveValue(/^<html[\s\S]*Balance/);
        await editor.getByRole('link', { name: 'Design', exact: true }).first().click();

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
        await expectCopy(page, reminderType!, copyName, source.subject);
      });

      const subject = `${copyName} subject`;

      await test.step('the copy can be edited: a new subject saves and shows in the list', async () => {
        const popup = page.context().waitForEvent('page');
        await templateRow(page, copyName).getByRole('link', { name: copyName }).click();
        const editor = await popup;
        await expect(editor.locator('body')).toContainText(`Template Name: ${copyName}`);
        await expect(editor.locator('#txtBoxEmailSubjectUpdate'), 'subject editable on a copy').toBeEnabled();
        await expect(editor.locator('#btnSave'), 'Save enabled on a copy').toBeEnabled();
        await editor.locator('#txtBoxEmailSubjectUpdate').fill(subject);
        const saved = editor.waitForResponse((r) => r.request().method() === 'POST' && /LetterEditorHTML\.aspx/i.test(r.url()));
        await editor.locator('#btnSave').click();
        await saved;
        await editor.waitForLoadState();
        await expect(editor.locator('#txtBoxEmailSubjectUpdate')).toHaveValue(subject);
        await editor.close();
        await expectCopy(page, reminderType!, copyName, subject);
      });

      await test.step('Sort by subject, edited on and edited by', async () => {
        await expectSorts(page, GRID, 'Email Subject');
        await expectSorts(page, GRID, 'Last Edited On', 'date');
        await expectSorts(page, GRID, 'Edited By');
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
      if (restore) await showType(page, restore.type).then(() => activate(page, restore!.name)).catch(() => undefined);
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
  const check = editor.waitForResponse((r) => /IsTemplateNameAlreadyExisting/.test(r.url()), { timeout: 60_000 });
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

/** The copy reaches the list a few seconds after the editor saves it. */
async function expectCopy(page: Page, type: string, name: string, subject: string): Promise<void> {
  let copy: TemplateRow | undefined;
  await expect
    .poll(async () => (copy = (await showType(page, type)).find((r) => r.name === name))?.subject, { message: `${name} in the list`, timeout: 60_000 })
    .toBe(subject);
  expect(copy).toMatchObject({ standard: false, active: false, canEdit: true, canDelete: true });
  expect(new Date(Date.parse(copy!.editedOn)).toDateString(), 'edited today').toBe(new Date().toDateString());
  expect(copy!.editedBy).not.toBe('');
}

/** Edit a row, tick Active and update it. */
async function activate(page: Page, name: string): Promise<void> {
  await templateRow(page, name).locator('input[id$="EditButton"]').click();
  const active = page.locator(`${GRID} input[id$="cbxActive"]`);
  await expect(active).toBeVisible();
  await active.check();
  await redraw(page, GRID, () => page.locator(`${GRID} input[id$="UpdateButton"], ${GRID} a[id$="UpdateButton"]`).first().click());
  await expect(active).toHaveCount(0);
}
