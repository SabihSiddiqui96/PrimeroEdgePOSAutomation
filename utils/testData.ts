/** QA records the in-depth tests work with; override per environment. */
export const TEST_SITE_CODE = process.env.TEST_SITE_CODE?.trim() || '103';
export const TEST_SITE_NAME = process.env.TEST_SITE_NAME?.trim() || 'BLUEFIELD ELEMENTRY SCHOOL_child care';
export const TEST_PATRON_ID = process.env.TEST_PATRON_ID?.trim() || '1337';

/** Records the tests create are named SabihTesting<n>. */
export const TEST_RECORD = /^SabihTesting(\d+)$/;

/** The next free SabihTesting<n> after the ones already there. */
export function nextTestName(existing: string[]): string {
  const used = existing.map((name) => Number(name.match(TEST_RECORD)?.[1] ?? 0));
  return `SabihTesting${Math.max(0, ...used) + 1}`;
}

export function usDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

/** Tests that leave records QA can't delete run on Sabih's PC only, never in the nightly. */
export const LOCAL_ONLY = !!process.env.CI;
export const LOCAL_ONLY_REASON = 'Leaves records that cannot be deleted; runs on the local PC only';
