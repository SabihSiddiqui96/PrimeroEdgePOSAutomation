/**
 * Post the POS suite result to RingCentral.
 *
 * Reads Playwright's JSON reporter output and sends one message: a pass line,
 * or a count plus the failing test names. Called from azure-pipelines.yml after
 * the run, with the webhook supplied as a secret pipeline variable.
 *
 *   node scripts/notify-ringcentral.js
 *
 * Env:
 *   RINGCENTRAL_WEBHOOK_URL  required; when unset the script exits quietly, so
 *                            a fork or a local run does not fail on it
 *   RESULTS_JSON             path to results.json (default test-results/results.json)
 *   SUITE_RESULT             the run stage's outcome, for the no-results case
 *   BUILD_URL                link appended to the message
 *
 * Never exits non-zero: a webhook outage should not turn a green suite red.
 */
const fs = require('fs');
const https = require('https');

const MAX_LISTED_FAILURES = 15;

/** Flatten Playwright's nested suites into one status per test. */
function summarise(report) {
  const counts = { passed: 0, failed: 0, skipped: 0 };
  const failures = [];

  const walk = (suite, trail) => {
    for (const spec of suite.specs || []) {
      const title = [...trail, spec.title].filter(Boolean).join(' > ');
      for (const test of spec.tests || []) {
        // A test that passed on retry is a pass; anything else that ran and
        // did not pass is a failure, so flaky runs are not silently green.
        const status =
          test.status === 'skipped'
            ? 'skipped'
            : (test.results || []).some((r) => r.status === 'passed')
              ? 'passed'
              : 'failed';
        counts[status] += 1;
        if (status === 'failed') failures.push(title);
      }
    }
    for (const child of suite.suites || []) walk(child, [...trail, child.title]);
  };

  for (const suite of report.suites || []) walk(suite, [suite.title]);
  return { counts, failures };
}

function buildMessage(report, suiteResult, buildUrl) {
  const lines = [];

  if (!report) {
    // No results file means the run died before reporting. Say that, rather
    // than reporting zero failures, which reads as a pass.
    lines.push(
      `PrimeroEdge POS run ${suiteResult || 'finished'} before any results were published.`,
    );
  } else {
    const { counts, failures } = summarise(report);
    const ran = counts.passed + counts.failed;

    if (counts.failed === 0) {
      lines.push(`PrimeroEdge POS: all ${counts.passed} passed (${counts.skipped} skipped).`);
    } else {
      lines.push(
        `PrimeroEdge POS: ${counts.failed} failed of ${ran} (${counts.skipped} skipped).`,
        '',
      );
      for (const failure of failures.slice(0, MAX_LISTED_FAILURES)) lines.push(`- ${failure}`);
      if (failures.length > MAX_LISTED_FAILURES) {
        lines.push(`- ...and ${failures.length - MAX_LISTED_FAILURES} more`);
      }
    }
  }

  if (buildUrl) lines.push('', buildUrl);
  return lines.join('\n');
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
        console.log(`webhook responded ${res.statusCode}`);
        res.resume();
        res.on('end', resolve);
      },
    );
    req.on('error', (e) => {
      console.log(`webhook failed: ${e.message}`);
      resolve();
    });
    req.end(body);
  });
}

(async () => {
  const webhook = process.env.RINGCENTRAL_WEBHOOK_URL;
  if (!webhook) {
    console.log('RINGCENTRAL_WEBHOOK_URL is not set - skipping the notification.');
    return;
  }

  const resultsPath = process.env.RESULTS_JSON || 'test-results/results.json';
  let report = null;
  try {
    report = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  } catch (e) {
    console.log(`could not read ${resultsPath}: ${e.message}`);
  }

  const text = buildMessage(
    report,
    (process.env.SUITE_RESULT || '').toLowerCase(),
    process.env.BUILD_URL,
  );
  console.log('--- message ---');
  console.log(text);
  console.log('---------------');
  await post(webhook, text);
})().catch((e) => {
  // Deliberately swallowed: reporting must never be the thing that fails a run.
  console.log(`notification failed: ${e.message}`);
});
