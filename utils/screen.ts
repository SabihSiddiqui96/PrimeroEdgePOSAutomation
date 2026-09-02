import { expect, Locator, Page } from '@playwright/test';

/**
 * Helpers for asserting the shape of a PrimeroEdge Classic screen — its title,
 * filter fields, action buttons and grid columns.
 *
 * Classic renders WebForms markup, so controls are addressed by their generated
 * `ctl00_...` ids. Those are stable across runs and are the only thing on the
 * page that reliably distinguishes, say, the From date from the To date.
 *
 * These assertions deliberately check that a control is *there*, not what it
 * holds. Sites, terminals, meal types, balances and dates are district data on
 * a live QA box: they change between runs, so pinning them would only produce
 * tests that fail on a Tuesday. Where a value matters, assert its shape (a
 * dropdown has options, a date box is filled) rather than the value itself.
 */

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
  // A screen can carry the same caption more than once - "From" appears under
  // both Date Range and Deposit Slip No. on Deposit Slip - with only the one
  // belonging to the active mode on show. Take the visible one.
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

/**
 * A field carries some value, without saying which.
 *
 * For the site selectors and date boxes, which land pre-filled from district
 * config and today's date.
 */
export async function expectFilled(page: Page, ids: string[]): Promise<void> {
  for (const id of ids) {
    await expect(page.locator(`#${id}`), `#${id} is populated`).not.toHaveValue('');
  }
}

/**
 * Every option of a `<select>`, in order.
 *
 * Only for lists the application itself defines — entry methods, month names.
 * Anything a district configures belongs in `expectHasOptions`.
 */
export async function expectOptions(page: Page, id: string, options: string[]): Promise<void> {
  const actual = await optionTexts(page, id);
  expect(actual, `options of #${id}`).toEqual(options);
}

/** "-- SELECT --", "--ALL--", "(none)" and friends: a prompt, not a choice. */
const PLACEHOLDER_OPTION = /^[-\s(]*(select|all|none|choose)[-\s)]*$/i;

/**
 * A `<select>` offers something real to pick, whatever the district configured.
 *
 * Placeholders do not count. A cascading dropdown that failed to populate still
 * renders its "-- SELECT --" row, and counting that would let this pass on
 * exactly the breakage it exists to catch.
 */
export async function expectHasOptions(page: Page, id: string, minimum = 1): Promise<void> {
  await expect(page.locator(`#${id}`), `#${id}`).toBeVisible();
  const real = (await optionTexts(page, id)).filter((text) => !PLACEHOLDER_OPTION.test(text));
  expect(real.length, `real options of #${id}`).toBeGreaterThanOrEqual(minimum);
}

export async function optionTexts(page: Page, id: string): Promise<string[]> {
  const texts = await page.locator(`#${id} option`).allTextContents();
  return texts.map((text) => text.replace(/\s+/g, ' ').trim());
}

/**
 * Header text as a person reads it.
 *
 * RadGrid appends a hidden "HeaderText" span to every column for screen
 * readers, and Telerik markup carries zero-width characters that textContent
 * picks up. Neither is on screen. Everything else — including accented
 * characters in a column name — is kept.
 */
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

/**
 * The column headers a RadGrid renders.
 *
 * Read from the DOM rather than the rendered text: a grid that starts collapsed
 * still declares its columns, and the point here is the screen's shape.
 */
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

/**
 * How a grid says it has nothing: RadGrid's own "No records to display.", and
 * the hand-written variants screens use instead ("No claims found.").
 */
const EMPTY_GRID = /\bno\b.{0,30}\b(found|to display|available)\b|\bno records\b/i;

/**
 * A grid has resolved one way or the other: either it lists rows, or it says it
 * has none. Which of the two depends on what the district has on file, so both
 * count as a pass — an empty grid with no empty-state message does not.
 */
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
    // Some screens pad the caption in the markup — value=" Apply " — which the
    // user never sees.
    await expect
      .poll(async () => (await button.inputValue()).trim(), { message: `button "${label}"` })
      .toBe(label);
  }
}
