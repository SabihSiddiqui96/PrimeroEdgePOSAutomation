#!/usr/bin/env node
/** Let connectOverCDP attach to ExpressPoint's Electron 11, which rejects setDownloadBehavior. */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'node_modules', 'playwright-core', 'lib', 'coreBundle.js');
const FROM = 'if (this._browser.options.name !== "clank" && this._options.acceptDownloads !== "internal-browser-default") {';
const TO =
  'if (this._browser.options.name !== "clank" && this._options.acceptDownloads !== "internal-browser-default" && !process.env.PW_CDP_SKIP_DOWNLOAD_BEHAVIOR) {';

if (!fs.existsSync(FILE)) {
  console.log('patch-playwright-cdp: playwright-core not installed, skipped');
  process.exit(0);
}
const source = fs.readFileSync(FILE, 'utf8');
if (source.includes(TO)) {
  console.log('patch-playwright-cdp: already applied');
} else if (source.includes(FROM)) {
  fs.writeFileSync(FILE, source.replace(FROM, TO));
  console.log('patch-playwright-cdp: applied');
} else {
  console.warn('patch-playwright-cdp: target not found; ExpressPoint tests will not attach');
}
