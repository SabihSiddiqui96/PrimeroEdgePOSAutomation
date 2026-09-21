import { expect, Locator, Page } from '@playwright/test';

/** Helpers for asserting the shape of a PrimeroEdge Classic screen */

/** The workspace column: everything to the right of the module nav. */
export function content(page: Page): Locator {
  return page.locator('#ctl00_page_content');
}

/** The screen's own title, in the bar above the workspace. */
export function pageTitle(page: Page): Locator {
  return page.locator('#ctl00_IDPageTitle');
}

export async function expectPageTitle(page: Page, name: string): Promise<void> {
  await expect(pageTitle(page), 'page title').toContainText(name);
}

/** A field label, fieldset legend, or any other fixed caption in the workspace. */
export function caption(page: Page, text: string): Locator {
  // A screen can carry the same caption more than once
  return content(page).getByText(text, { exact: true }).locator('visible=true').first();
}

export async function expectCaptions(page: Page, texts: string[]): Promise<void> {
  for (const text of texts) {
    await expect(caption(page, text), `caption "${text}"`).toBeVisible();
  }
}

export async function expectVisible(page: Page, ids: string[]): Promise<void> {
  for (const id of ids) {
    await expect(page.locator(`#${id}`), `#${id}`).toBeVisible();
  }
}

/** A field carries some value, without saying which. */
export async function expectFilled(page: Page, ids: string[]): Promise<void> {
  for (const id of ids) {
    await expect(page.locator(`#${id}`), `#${id} is populated`).not.toHaveValue('');
  }
}

/** Every option of a `<select>`, in order. */
export async function expectOptions(page: Page, id: string, options: string[]): Promise<void> {
  const actual = await optionTexts(page, id);
  expect(actual, `options of #${id}`).toEqual(options);
}

/** "-- SELECT --", "--ALL--", "(none)" and friends: a prompt, not a choice. */
const PLACEHOLDER_OPTION = /^[-\s(]*(select|all|none|choose)[-\s)]*$/i;

/** A `<select>` offers something real to pick, whatever the district configured. */
export async function expectHasOptions(page: Page, id: string, minimum = 1): Promise<void> {
  await expect(page.locator(`#${id}`), `#${id}`).toBeVisible();
  const real = (await optionTexts(page, id)).filter((text) => !PLACEHOLDER_OPTION.test(text));
  expect(real.length, `real options of #${id}`).toBeGreaterThanOrEqual(minimum);
}

export async function optionTexts(page: Page, id: string): Promise<string[]> {
  const texts = await page.locator(`#${id} option`).allTextContents();
  return texts.map((text) => text.replace(/\s+/g, ' ').trim());
}

/** Header text as a person reads it. */
function headerText(raw: string): string {
  const invisible = (code: number) =>
    code < 0x20 ||
    code === 0x7f ||
    (code >= 0x200b && code <= 0x200f) ||
    code === 0x2060 ||
    code === 0xfeff;

  return Array.from(raw.replace(/HeaderText/g, ''))
    .filter((character) => !invisible(character.codePointAt(0) ?? 0))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The column headers a RadGrid renders. */
export async function expectGridColumns(
  page: Page,
  gridId: string,
  columns: string[],
): Promise<void> {
  const headers = await page.locator(`#${gridId} th`).allTextContents();
  const actual = headers.map(headerText);
  for (const column of columns) {
    expect(actual, `columns of #${gridId}`).toContain(column);
  }
}

/** How a grid says it has nothing */
const EMPTY_GRID = /\bno\b.{0,30}\b(found|to display|available)\b|\bno records\b/i;

/** A grid has resolved one way or the other: either it lists rows, or it says it has none. */
export async function expectGridResolved(page: Page, gridId: string): Promise<void> {
  const grid = page.locator(`#${gridId}`);
  await expect(grid, `#${gridId}`).toBeVisible();

  const rows = await grid.locator('tr.rgRow, tr.rgAltRow').count();
  if (rows === 0) {
    await expect(grid, `#${gridId} says it is empty`).toContainText(EMPTY_GRID);
  }
}

/** Submit buttons, checked by id and by the caption they carry. */
export async function expectButtons(page: Page, buttons: [string, string][]): Promise<void> {
  for (const [id, label] of buttons) {
    const button = page.locator(`#${id}`);
    await expect(button, `button "${label}"`).toBeVisible();
    // Some screens pad the caption in the markup — value=" Apply " — which the user never sees.
    await expect
      .poll(async () => (await button.inputValue()).trim(), { message: `button "${label}"` })
      .toBe(label);
  }
}
