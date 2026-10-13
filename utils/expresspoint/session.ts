import { expect, Locator, Page, test } from '@playwright/test';
import { closeExpressPoint, ExpressPointHandle, launchExpressPoint } from './launch';

/** Patron the cashier rings up on QA. */
export const DEFAULT_PATRON_ID = '1337';

const MEAL_BUTTON = /\bMeal\b/i;

/** Wait up to `ms` for the element to show; false if it never does. */
async function appears(locator: Locator, ms: number): Promise<boolean> {
  return locator.waitFor({ state: 'visible', timeout: ms }).then(
    () => true,
    () => false,
  );
}

async function settle(window: Page): Promise<void> {
  await window.locator('ion-loading').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => undefined);
}

/** OK / Continue on any warning alert, such as the Square token expiry notice. */
async function dismissWarnings(window: Page, waitMs = 2_000): Promise<void> {
  const deadline = Date.now() + waitMs;
  do {
    const clicked = await window
      .evaluate(() => {
        const isVisible = (el: HTMLElement) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        for (const alert of Array.from(document.querySelectorAll<HTMLElement>('ion-alert')).filter(isVisible)) {
          const root: ParentNode = (alert as any).shadowRoot ?? alert;
          const ok = Array.from(root.querySelectorAll<HTMLElement>('.alert-button, button')).find((b) =>
            /^(ok|continue|got it)$/i.test((b.innerText || b.textContent || '').trim()),
          );
          if (ok) {
            ok.click();
            return true;
          }
        }
        return false;
      })
      .catch(() => false);
    if (clicked) {
      await window.waitForTimeout(500);
      continue;
    }
    if (Date.now() >= deadline) return;
    await window.waitForTimeout(250);
  } while (true);
}

/** Answer YES to each confirm in a chain, e.g. "closing balance is less than starting". */
async function confirmAllYes(window: Page, waitMs = 8_000): Promise<void> {
  for (let i = 0; i < 6; i++) {
    const deadline = Date.now() + waitMs;
    let clicked = false;
    while (!clicked && Date.now() < deadline) {
      clicked = await window
        .evaluate(() => {
          const isVisible = (el: HTMLElement) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
          const isYes = (el: HTMLElement) => /^yes$/i.test((el.innerText || el.textContent || '').trim());
          for (const alert of Array.from(document.querySelectorAll<HTMLElement>('ion-alert')).filter(isVisible)) {
            const root: ParentNode = (alert as any).shadowRoot ?? alert;
            const yes = Array.from(root.querySelectorAll<HTMLElement>('.alert-button, button')).find(isYes);
            if (yes) {
              yes.click();
              return true;
            }
          }
          const yes = Array.from(document.querySelectorAll<HTMLElement>('button, ion-button')).find(
            (el) => isVisible(el) && isYes(el),
          );
          yes?.click();
          return !!yes;
        })
        .catch(() => false);
      if (!clicked) await window.waitForTimeout(300);
    }
    if (!clicked) return;
    await window.waitForTimeout(800);
  }
}

function dashboardItem(window: Page, label: RegExp) {
  return window.locator('ion-router-outlet .ion-page:not(.ion-page-hidden) ion-item[detail]').filter({ hasText: label }).first();
}

async function openMenu(window: Page): Promise<void> {
  await settle(window);
  const hamburger = window
    .locator('ion-menu-button, ion-button')
    .filter({ has: window.locator('ion-icon[name="menu"], ion-icon[name="menu-outline"]') })
    .first();
  await hamburger.click({ timeout: 15_000 });
}

/** Opening Balance is an input; Closing Balance is plain text beside Print session. */
async function shownBalance(window: Page): Promise<number> {
  const opening = window.locator('input.input-label-openingBalance');
  const text = (await opening.isVisible().catch(() => false))
    ? await opening.inputValue()
    : ((await window.locator('body').innerText()).match(/Closing Balance\s*(\$[\d,.]+)/i)?.[1] ?? '');
  return Number(text.replace(/[^0-9.]/g, ''));
}

/** Count `dollars` one-dollar bills on the app's keypad and return the balance shown. */
async function enterBalanceInOnes(window: Page, dollars: string): Promise<string> {
  // One count box per coin and bill (Pennies ... Hundreds); the balance is their total.
  const boxes = window.locator('input.input-label-opencloseBalance');
  await expect(boxes.first(), 'cash count boxes').toBeVisible({ timeout: 15_000 });
  const onesIndex = await boxes.evaluateAll((inputs) =>
    inputs.findIndex((input) =>
      /^Ones\b/.test(((input.closest('ion-row, ion-item, tr') as HTMLElement | null)?.innerText ?? '').trim()),
    ),
  );
  expect(onesIndex, 'the Ones count box').toBeGreaterThanOrEqual(0);
  await boxes.nth(onesIndex).click();

  // Typing on the keyboard saves a closing count three times over; the keypad does not.
  const keys = window.locator('ion-digit-keyboard ion-button');
  for (const digit of dollars) {
    await keys.filter({ hasText: new RegExp(`^\\s*${digit}\\s*$`) }).first().click();
  }
  await expect.poll(() => shownBalance(window), { message: 'balance total' }).toBe(Number(dollars));
  return `$${(await shownBalance(window)).toFixed(2)}`;
}

/** Launch the app and sign in with the Windows account of this PC. */
export async function signInWithWindows(): Promise<ExpressPointHandle> {
  const handle = await launchExpressPoint();
  const { window } = handle;
  // A patron with restrictions opens an informational popup, at any point after lookup.
  await window.addLocatorHandler(
    window.locator('ion-modal[class*="user_ppup"]').first(),
    async (popup) => {
      await popup.getByText('Close', { exact: true }).first().click({ timeout: 3_000 }).catch(() => undefined);
      if (await popup.isVisible().catch(() => false)) await window.keyboard.press('Escape');
    },
    { noWaitAfter: true },
  );
  await window.locator('ion-button', { hasText: 'Use Windows Login' }).click({ timeout: 30_000 });
  await expect(window.getByText('Serving Options for').first()).toBeVisible({ timeout: 45_000 });
  await settle(window);
  await dismissWarnings(window);
  return handle;
}

/** Site and terminal from the "Serving Options for <site>" heading and the line under it. */
export async function servingStation(window: Page): Promise<{ site: string; terminal: string }> {
  const text = await window.getByText('Serving Options for').first().innerText();
  const [site, terminal = ''] = text
    .replace(/^.*Serving Options for\s*/i, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return { site, terminal };
}

/** Open service with `dollars` one-dollar bills; returns the opening balance shown. */
export async function openService(window: Page, dollars: string): Promise<string> {
  if (await appears(dashboardItem(window, /Continue Service/i), 3_000)) {
    await dashboardItem(window, /Continue Service/i).click();
    await settle(window);
    await dismissWarnings(window);
    // A session left open by an earlier run would block Open Service.
    await closeService(window, dollars);
  }

  await dashboardItem(window, /^Open Service$/i).click({ timeout: 20_000 });
  await settle(window);
  await dismissWarnings(window);
  const openingBalance = await enterBalanceInOnes(window, dollars);

  const open = window.locator('ion-button').filter({ hasText: /Open Service/i }).last();
  await open.evaluate((el: HTMLElement) => el.click());
  await expect(window.locator('input.input-label-opencloseBalance')).toHaveCount(0, { timeout: 30_000 });
  await settle(window);
  await dismissWarnings(window, 3_000);
  return openingBalance;
}

export interface SaleLine {
  name: string;
  quantity: number;
  amount: string;
}

export interface ChargedSale {
  items: number;
  total: string;
  lines: SaleLine[];
}

/** Ring up a meal and an extra for the patron and charge it to their account. */
export async function chargeMeal(window: Page, patronId = DEFAULT_PATRON_ID): Promise<ChargedSale> {
  const idInput = window.locator('#pinInput input, input[placeholder="Enter an ID"]').first();
  await expect(idInput, 'patron ID box').toBeVisible({ timeout: 30_000 });
  const patron = window.getByText(`ID: ${patronId}`).first();
  for (let attempt = 1; ; attempt++) {
    await dismissWarnings(window);
    await idInput.fill(patronId);
    await window.evaluate(() => {
      const isVisible = (el: HTMLElement) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      Array.from(document.querySelectorAll<HTMLElement>('ion-button'))
        .find((b) => isVisible(b) && b.querySelector('ion-icon[name="caret-forward-circle"]'))
        ?.click();
    });
    await settle(window);
    // The lookup occasionally ignores the first submit right after Open Service.
    if (attempt === 2 || (await appears(patron, 10_000))) break;
  }
  await expect(patron, 'patron loaded').toBeVisible({ timeout: 20_000 });

  // The patron's default item may already be in the order; add a meal and an extra on top.
  const before = await itemCount(window);
  const tiles = window.locator('app-menu-grid ion-button');
  const meal = tiles.filter({ hasText: MEAL_BUTTON }).first();
  const extra = tiles.filter({ hasNotText: MEAL_BUTTON }).filter({ hasText: /\w/ }).locator('visible=true').first();
  for (const tile of [meal, extra]) {
    await expect(tile, 'menu grid item').toBeVisible({ timeout: 20_000 });
    await tile.click({ timeout: 15_000 });
    await window
      .locator('ion-alert button, .alert-button')
      .filter({ hasText: /^yes$/i })
      .first()
      .click({ timeout: 3_000 })
      .catch(() => undefined);
  }
  await expect.poll(() => itemCount(window), { message: 'items added to the order' }).toBeGreaterThan(before);
  const items = await itemCount(window);
  const totalText = await window.getByText(/Total Amount Due/i).first().innerText();
  const total = totalText.match(/\$\s*([\d,]+\.\d{2})/)?.[1] ?? '';
  expect(total, 'total amount due').not.toBe('');
  const lines = await orderLines(window);
  expect(lines.length, 'order lines read from the order panel').toBe(items);

  const charge = window.locator('ion-button').filter({ hasText: /Charge/i }).last();
  await expect(charge).toBeVisible();
  await charge.evaluate((el: HTMLElement) => el.click());
  await settle(window);
  await window
    .locator('ion-alert button, .alert-button, ion-button')
    .filter({ hasText: /^(ok|done|close|continue)$/i })
    .first()
    .click({ timeout: 4_000 })
    .catch(() => undefined);
  await settle(window);
  await expect(idInput, 'back on the patron lookup after charging').toBeVisible({ timeout: 30_000 });
  return { items, total, lines };
}

/** The order panel: "Ext. Milk 1 $0.20 Free Lunch Meal 1 $20.00 ..." between its header and total. */
async function orderLines(window: Page): Promise<SaleLine[]> {
  const text = (await window.locator('body').innerText()).replace(/\s+/g, ' ');
  const panel = text.match(/Quantity Amount (.*?) Total Amount Due/i)?.[1] ?? '';
  return [...panel.matchAll(/(.+?) (\d+) \$(\d[\d,]*\.\d{2}) ?/g)].map((m) => ({
    name: m[1].trim(),
    quantity: Number(m[2]),
    amount: m[3],
  }));
}

async function itemCount(window: Page): Promise<number> {
  const text = await window.locator('body').innerText();
  return Number(text.match(/Item Count\s*\((\d+)\)/i)?.[1] ?? 0);
}

/** Close service with `dollars` one-dollar bills, wait for the terminal; returns the balance shown. */
export async function closeService(window: Page, dollars: string): Promise<string> {
  if (!(await appears(window.locator('input.input-label-opencloseBalance').first(), 1_000))) {
    await openMenu(window);
    await window.locator('ion-menu ion-item, ion-item').filter({ hasText: /^Close Service$/i }).first().click({ timeout: 15_000 });
    await settle(window);
    await dismissWarnings(window, 3_000);
  }
  const closingBalance = await enterBalanceInOnes(window, dollars);

  const close = window.locator('ion-button').filter({ hasText: /Close Service/i }).last();
  await close.evaluate((el: HTMLElement) => el.click());
  await confirmAllYes(window);

  const closing = window.getByText(/closing pos terminal/i).first();
  if (await appears(closing, 10_000)) {
    await expect(closing, 'closing POS terminal finishes').toBeHidden({ timeout: 120_000 });
  }
  await settle(window);
  await dismissWarnings(window, 3_000);
  await expect(dashboardItem(window, /^Open Service$/i), 'back on the dashboard with no open service').toBeVisible({
    timeout: 30_000,
  });
  return closingBalance;
}

export interface RecordedSession {
  site: string;
  terminal: string;
  openingBalance: string;
  closingBalance: string;
  sale: ChargedSale;
}

/** A whole number of dollars in [min, max]. */
export function randomDollars(min: number, max: number): string {
  return String(min + Math.floor(Math.random() * (max - min + 1)));
}

/** Open service, charge one meal, close service: one closed session on the server. */
export async function recordChargedSession(
  openingDollars = randomDollars(20, 60),
  closingDollars = randomDollars(61, 99),
): Promise<RecordedSession> {
  const handle = await signInWithWindows();
  try {
    const { site, terminal } = await servingStation(handle.window);
    const openingBalance = await openService(handle.window, openingDollars);
    const sale = await chargeMeal(handle.window);
    const closingBalance = await closeService(handle.window, closingDollars);
    return { site, terminal, openingBalance, closingBalance, sale };
  } catch (error) {
    const path = test.info().outputPath('expresspoint-on-failure.png');
    if (await handle.window.screenshot({ path }).then(() => true, () => false)) {
      await test.info().attach('expresspoint-on-failure', { path, contentType: 'image/png' });
    }
    throw error;
  } finally {
    await closeExpressPoint(handle);
  }
}
