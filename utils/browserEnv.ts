// Browser settings shared by playwright.config.ts and global-setup.ts.

// CI installs the Chrome channel only; locally the bundled build is fine.
export function browserChannel(): string | undefined {
  return process.env.CI ? 'chrome' : undefined;
}

// QA omits the intermediate cert, which hosted Linux agents do not fetch.
export const IGNORE_HTTPS_ERRORS = true;
