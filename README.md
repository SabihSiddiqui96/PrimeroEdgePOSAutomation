# PrimeroEdge POS Automation

Playwright regression suite for the **Point of Service** module in PrimeroEdge
Classic (`/POS/POSHome.aspx`).

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env
```

Fill in `.env`:

- `PE_USERNAME` — PrimeroEdge login
- `ENCRYPTION_KEY` — 32 characters, shared with whoever generated the password
- `ENCRYPTED_PASSWORD` — produced by `npm run encrypt "<password>"`

Passwords are stored encrypted, never in plain text, and `.env` is gitignored.

QA is only reachable on the VPN. If a run fails with `ENOTFOUND qa.primeroedge.co`,
the tunnel is down rather than the site.

## Running

```bash
npm test                       # full suite
npm run test:headed            # watch it drive the browser
npx playwright test -g "POS"   # single test by title
npm run report:show            # open the last HTML report
```

## Layout

| Path | Purpose |
| --- | --- |
| `pages/LoginPage.ts` | PrimeroEdge sign-in form |
| `utils/pos.ts` | Login, open POS, navigate its sections |
| `utils/crypto.ts` | Password encrypt/decrypt |
| `utils/env.ts`, `utils/baseUrl.ts` | Environment variables and URLs |
| `global-setup.ts` | Signs in once and caches the session |
| `tests/pos/` | Specs, one file per POS area |

## Writing a test

`openPointOfService(page)` handles login and lands on POS Home, so a spec starts
where the work does:

```ts
import { openPointOfService, openPosSection } from '../../utils/pos';

test('...', async ({ page }) => {
  const pos = await openPointOfService(page);
  await openPosSection(pos, 'Menu Items');
});
```

Tests run serially — POS writes to shared district data, so parallel workers
overwrite each other's setup.

## Mirroring to Cybersoft.Platform

GitHub is the working remote. To mirror into the platform monorepo:

```bash
node scripts/sync-to-platform.js --branch someFix
```

It copies tracked files into
`Cybersoft.Platform.TestAutomation/PrimeroEdgePOSAutomation`, pushes a new branch
off `AutomationProjects`, and prints a link to raise the PR.
