/**
 * The browser choices the suite and its global setup have to agree on.
 *
 * They are here because disagreeing about them cost a morning of CI. The
 * config declared one thing under `use`, global setup built its own browser
 * and context and quietly did another, and the run died before any test ran -
 * twice, for two different reasons. Anything both sides need belongs in this
 * file, not copied into each.
 */

/**
 * The Chromium channel to launch, or undefined for the bundled build.
 *
 * CI installs only the Chrome channel (`npx playwright install --with-deps
 * chrome`), so asking for bundled Chromium there requests a download that is
 * not on the agent. Locally the bundled build is fine and needs no system
 * Chrome.
 */
export function browserChannel(): string | undefined {
  return process.env.CI ? 'chrome' : undefined;
}

/**
 * Whether to accept QA's certificate chain.
 *
 * QA serves only its leaf certificate and omits the GoDaddy G2 intermediate.
 * Windows and Chrome fetch the missing link themselves via AIA; a hosted Linux
 * agent does not, so a strict client fails there while passing on a laptop.
 * The pipeline's reachability gate passes -k for the same reason.
 */
export const IGNORE_HTTPS_ERRORS = true;
