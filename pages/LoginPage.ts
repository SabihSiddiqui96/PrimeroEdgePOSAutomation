import { Locator, Page } from '@playwright/test';
import { getLoginPath } from '../utils/baseUrl';
import { positiveIntFromEnv } from '../utils/env';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class LoginPage {
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;

  constructor(private readonly page: Page) {
    this.usernameInput = page.locator('#UserNameTextBox');
    this.passwordInput = page.locator('#PasswordTextBox');
    this.loginButton = page
      .locator('#LoginButton')
      .or(page.getByRole('button', { name: /sign in|log in/i }))
      .or(page.locator('button[type="submit"]'));
  }

  /**
   * The QA environment intermittently drops the first request after an idle
   * period, so the form is retried rather than failing the whole run on a blip.
   * Retries are confined to reaching the login form — once credentials are
   * submitted, a failure is a real failure.
   */
  async goto(): Promise<void> {
    const loginPath = getLoginPath();
    const maxAttempts = positiveIntFromEnv('LOGIN_MAX_ATTEMPTS', 3);
    const timeout = positiveIntFromEnv('LOGIN_NAVIGATION_TIMEOUT_MS', 60000);
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const precheck = await this.page.request.get(loginPath, { timeout });
        console.log(`[login] precheck ${loginPath}: HTTP ${precheck.status()}`);

        await this.page.goto(loginPath, { waitUntil: 'commit', timeout });
        await this.usernameInput.waitFor({ state: 'visible', timeout });
        await this.passwordInput.waitFor({ state: 'visible', timeout });
        await this.loginButton.waitFor({ state: 'visible', timeout });
        return;
      } catch (err) {
        lastError = err;
        console.warn(
          `[login] attempt ${attempt}/${maxAttempts} failed at ${this.page.url() || loginPath}: ${errorMessage(err)}`,
        );
        if (attempt === maxAttempts) break;
        await delay(attempt * 5000);
      }
    }

    throw new Error(
      `Login page was not ready after ${maxAttempts} attempts. Last error: ${errorMessage(lastError)}`,
    );
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    // Sign in triggers a WebForms postback. The default action timeout expires
    // while Playwright waits on the scheduled navigation, so a slow-but-working
    // login fails spuriously without a wider budget here.
    await this.loginButton.click({
      timeout: positiveIntFromEnv('LOGIN_SUBMIT_TIMEOUT_MS', 30000),
    });
  }
}
