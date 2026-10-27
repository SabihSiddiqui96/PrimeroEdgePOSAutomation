import { expect, Frame, Page } from '@playwright/test';

async function shown(frame: Frame, url: RegExp): Promise<boolean> {
  if (!url.test(frame.url()) || frame.isDetached()) return false;
  try {
    return await (await frame.frameElement()).isVisible();
  } catch {
    return false;
  }
}

/** The page inside an open RadWindow; a closed one leaves its old frame behind, hidden. */
export async function dialogFrame(page: Page, url: RegExp, timeout = 60_000): Promise<Frame> {
  let frame: Frame | undefined;
  await expect
    .poll(
      async () => {
        for (const f of page.frames()) if (await shown(f, url)) return !!(frame = f);
        return false;
      },
      { message: `${url} window`, timeout },
    )
    .toBe(true);
  await frame!.waitForLoadState();
  return frame!;
}

export async function expectNoDialog(page: Page): Promise<void> {
  await expect(page.locator('.RadWindow').locator('visible=true')).toHaveCount(0, { timeout: 30_000 });
}
