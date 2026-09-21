/**
 * Post the POS suite result to RingCentral.
 *
 * Matches the K12 nightly's message so the channel reads the same way for both
 * suites: a counts table, duration, the failing tests grouped by spec, and a
 * link straight to the results tab. Called from azure-pipelines.yml, with the
 * webhook supplied as a secret pipeline variable.
 *
 *   node scripts/notify-ringcentral.js
 *
 * Env:
 *   RINGCENTRAL_WEBHOOK_URL  required; when unset the script exits quietly, so
 *                            a local run or a fork does not fail on it
 *   RESULTS_JSON             path to results.json (default test-results/results.json)
 *   SUITE_RESULT             the run stage's outcome, for the no-results case
 *   RUN_LABEL                friendly run name, e.g. "POS QA"
 *   COLLECTION_URI / TEAM_PROJECT / BUILD_ID   used to build the links
 *
 * Never exits non-zero: reporting must not be the thing that fails a run.
 */
const fs = require('fs');
const https = require('https');

// Long enough to be useful, short enough that the channel stays readable.
const MAX_LISTED_SPECS = 20;

/**
 * Flatten Playwright's nested suites into one status per test.
 *
 * Skipped tests are counted but deliberately left out of the total. Most of
 * them are placeholder files for screens nobody has automated yet, and letting
 * them into the denominator reported a fully green suite as "58% passed". The
 * message is about what is live, so the total is what actually ran.
 */
function summarise(report) {
  const counts = { passed: 0, failed: 0, skipped: 0, total: 0 };
  const failures = [];

  const walk = (suite, trail, file) => {
    const suiteFile = suite.file || file;
    for (const spec of suite.specs || []) {
      const title = [...trail, spec.title].filter(Boolean).join(' > ');
      for (const test of spec.tests || []) {
        const results = test.results || [];
        // Passing on retry counts as a pass, matching how Playwright reports
        // flakes. timedOut and interrupted are failures: a test that never
        // finished has not demonstrated anything.
        if (results.some((r) => r.status === 'passed')) {
          counts.passed += 1;
          counts.total += 1;
        } else if (results.some((r) => ['failed', 'timedOut', 'interrupted'].includes(r.status))) {
          counts.failed += 1;
          counts.total += 1;
          failures.push({ file: spec.file || suiteFile || '', title });
        } else {
          counts.skipped += 1;
        }
      }
    }
    for (const child of suite.suites || []) {
      walk(child, [...trail, child.title].filter(Boolean), suiteFile);
    }
  };

  for (const suite of report.suites || []) walk(suite, [], suite.file || suite.title || '');
  return { counts, failures };
}

/**
 * A short label for the spec a failure came from. Ticket specs get their
 * ticket number; the rest get section/page, which is how these screens are
 * referred to in review anyway.
 */
function tagFor(file) {
  const normalised = (file || '').replace(/\\/g, '/');
  const base = normalised
    .split('/')
    .pop()
    .replace(/\.spec\.(ts|js)$/i, '');

  const ticket = base.match(/^t-?(\d+)$/i);
  if (ticket) return `T-${ticket[1]}`;

  // tests/administration/reconciliation/reconciliation.spec.ts -> administration/reconciliation
  const parts = normalised
    .replace(/^.*?tests\//, '')
    .split('/')
    .filter(Boolean);
  parts.pop(); // drop the file itself
  if (parts.length && parts[parts.length - 1] === base) return parts.join('/');
  return parts.length ? [...parts, base].join('/') : base || 'test';
}

function formatDuration(ms) {
  const seconds = Math.round((ms || 0) / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${minutes}m ${seconds % 60}s`;
}

/** Group failures by spec: one failure shows the tag alone, several list the titles. */
function failedSection(failures) {
  if (!failures.length) return '';

  const order = [];
  const byTag = new Map();
  for (const failure of failures) {
    const tag = tagFor(failure.file);
    if (!byTag.has(tag)) {
      byTag.set(tag, []);
      order.push(tag);
    }
    byTag.get(tag).push(failure.title);
  }

  const lines = [];
  for (const tag of order.slice(0, MAX_LISTED_SPECS)) {
    const titles = byTag.get(tag);
    if (titles.length === 1) {
      lines.push(`• ${tag}`);
    } else {
      lines.push(`• ${tag}:`);
      for (const title of titles) lines.push(`    - ${title}`);
    }
  }
  if (order.length > MAX_LISTED_SPECS) {
    lines.push(`• ...and ${order.length - MAX_LISTED_SPECS} more specs`);
  }

  return `\n\nFailed Tests:\n${lines.join('\n')}`;
}

/** The heads-up posted when the run begins, so a silent night is visibly a
 *  missing message rather than an assumed pass. */
function buildStartedMessage(links) {
  const label = process.env.RUN_LABEL || 'Automation';
  return `PrimeroEdge POS ${label} started.\n\nMonitor: ${links.pipelineUrl}`;
}

/**
 * The reason a run died before testing, when Playwright recorded one.
 *
 * A globalSetup failure lands in the report's top-level errors rather than in
 * any test, so without this the message can only say that nothing ran - which
 * reads like a quiet night instead of a broken one. The full stack stays in
 * the build log; one line is enough to tell QA being down from a real bug.
 */
function firstError(report) {
  const raw = (report.errors || []).map((e) => e && (e.message || e.value)).find(Boolean);
  if (!raw) return '';
  const line = raw
    .replace(/\[[0-9;]*m/g, '') // reporter colour codes
    .split('\n')
    .map((s) => s.trim())
    .find(Boolean);
  if (!line) return '';
  return line.length > 300 ? `${line.slice(0, 300)}…` : line;
}

// Why the run produced nothing, in a few words. The gate's reason wins: it knows
// the environment was down, which a results file never shows.
function abortReason(report, suiteResult) {
  const raw = (process.env.ABORT_REASON || '').trim();
  // An undefined pipeline variable is not empty - ADO leaves the macro in
  // place, and "$(ABORT_REASON)" posted to the channel would be worse than no
  // reason at all. RINGCENTRAL_WEBHOOK_URL already caught us out this way.
  const fromGate = /^\$\(.*\)$/.test(raw) ? '' : raw;
  if (fromGate) return fromGate;
  if (/^cancell?ed$/.test(suiteResult)) return 'the run was canceled or hit its time limit';
  const err = report ? firstError(report) : '';
  return err || 'an error before any tests ran';
}

function buildMessage(report, suiteResult, links) {
  const label = process.env.RUN_LABEL || 'Automation';
  const { pipelineUrl, resultsUrl } = links;

  if (!report) {
    return `PrimeroEdge POS ${label} ended due to ${abortReason(report, suiteResult)}.\n\nPipeline: ${pipelineUrl}`;
  }

  const { counts, failures } = summarise(report);
  if (counts.total === 0) {
    return `PrimeroEdge POS ${label} ended due to ${abortReason(report, suiteResult)}.\n\nPipeline: ${pipelineUrl}`;
  }

  const pct = (n) => Math.round((n / counts.total) * 100);
  const duration = formatDuration(report.stats && report.stats.duration);

  const lines = [
    `PrimeroEdge POS ${label} completed. See results below.`,
    '',
    `✅ ${'Passed:'.padEnd(10)}${counts.passed} (${pct(counts.passed)}%)`,
    `❌ ${'Failed:'.padEnd(10)}${counts.failed} (${pct(counts.failed)}%)`,
  ];
  // No skipped line. The skips are screens nobody has automated yet, and
  // reporting a backlog count next to the results only invites the question
  // of why a passing run is not at 100%.
  lines.push(`📊 ${'Total:'.padEnd(10)}${counts.total}`, `⏱ ${'Duration:'.padEnd(10)}${duration}`);

  return lines.join('\n') + failedSection(failures) + `\n\nResults: ${resultsUrl}`;
}

function post(webhook, text) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ text });
    const req = https.request(
      webhook,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        console.log(`Webhook sent, status: ${res.statusCode}`);
        res.resume();
        res.on('end', resolve);
      },
    );
    req.on('error', (e) => {
      console.log(`Webhook error: ${e.message}`);
      resolve();
    });
    req.end(body);
  });
}

/**
 * The webhook, or null when it is not usable.
 *
 * An undefined pipeline variable is not empty: Azure DevOps leaves the macro
 * in place, so the value arrives as the literal "$(RINGCENTRAL_WEBHOOK_URL)".
 * That is truthy, so a plain falsy check waves it through and the run fails
 * later with a bare "Invalid URL" that says nothing about the cause. Never
 * log the value itself - it is a bearer credential.
 */
function resolveWebhook() {
  const raw = (process.env.RINGCENTRAL_WEBHOOK_URL || '').trim();
  if (!raw) {
    console.log('No webhook URL; skipping.');
    return null;
  }
  if (/^\$\(.*\)$/.test(raw)) {
    console.log(
      'RINGCENTRAL_WEBHOOK_URL is not defined on this pipeline - the macro came ' +
        'through unexpanded. Add it under Edit > Variables. Skipping.',
    );
    return null;
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    console.log('RINGCENTRAL_WEBHOOK_URL is not a valid URL; skipping.');
    return null;
  }
  if (parsed.protocol !== 'https:') {
    console.log(`RINGCENTRAL_WEBHOOK_URL is ${parsed.protocol}, expected https; skipping.`);
    return null;
  }
  return raw;
}

(async () => {
  const webhook = resolveWebhook();
  if (!webhook) return;

  // The project name carries a space ("PrimeroEdge Classic"), so it has to be
  // encoded or the link breaks where the chat client stops parsing the URL.
  const pipelineUrl =
    `${process.env.COLLECTION_URI || ''}${encodeURIComponent(process.env.TEAM_PROJECT || '')}` +
    `/_build/results?buildId=${process.env.BUILD_ID || ''}`;
  const resultsUrl = `${pipelineUrl}&view=ms.vss-test-web.build-test-results-tab`;
  const links = { pipelineUrl, resultsUrl };

  // Both messages go through this script rather than a curl in the YAML: the
  // payload needs embedded newlines, and getting those through YAML into a
  // shell string intact is a reliable way to post malformed JSON.
  if (process.argv.includes('--started')) {
    const started = buildStartedMessage(links);
    console.log('Sending webhook:', started);
    await post(webhook, started);
    return;
  }

  const resultsPath = process.env.RESULTS_JSON || 'test-results/results.json';
  let report = null;
  if (fs.existsSync(resultsPath)) {
    try {
      report = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    } catch (e) {
      console.log(`Could not parse ${resultsPath}: ${e.message}`);
    }
  } else {
    console.log(`No results at ${resultsPath}.`);
  }

  const text = buildMessage(report, (process.env.SUITE_RESULT || '').toLowerCase(), links);
  console.log('Sending webhook:', text);
  await post(webhook, text);
})().catch((e) => {
  // Deliberately swallowed, for the same reason the script never exits non-zero.
  console.log(`Notification failed: ${e.message}`);
});
