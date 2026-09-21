# CLAUDE.md — PrimeroEdge POS Automation

## Ticket comments — Actual hours

The ticket for this repo is **Task 121073 — "PrimeroEdge POS Module - Automation
Testing"**, project `PrimeroEdge Classic`
(`https://dev.azure.com/Cybersoft-Technologies-Inc/PrimeroEdge%20Classic`).

**Bump Actual hours in the same pass as the comment.** A comment about fixes
always comes with a time update — the two go together, never one without the
other. The field is `Custom.ActualHours` on Task 121073 (a **string**, e.g.
`"18"`, not a number).

**Link the PR, never paste its URL.** In the discussion box, type `!` followed
by the PR id and pick the PR from the suggestion list. It renders as a proper
artifact link — `PR 189526: Cover the Daily Reports screens` — instead of a wall
of raw URL. The box itself says so: *"Use # to link a work item, @ to mention a
person, or ! to link a pull request."*

Do **not** write `PR:` in front of it. The link already starts with `PR <id>`, so
a prefix just reads `PR: PR 189526: ...`.

The `!` has to be **typed as a real keystroke**. Inserting the text
programmatically leaves it as plain text and the picker never opens — type `!`,
wait for the suggestion list, then the digits, then click the suggestion.

**Check the history before writing — this is the part that goes wrong.** Sabih
logs these by hand, so the day's hours are often already in before the comment
is written. Adding on top of that double-counts and the number quietly drifts up
for good. Read the recent changes and only add if this period isn't already
covered:

```
GET {tracker_base_url}/_apis/wit/workitems/121073/updates?api-version=7.0
```

Filter to entries whose `fields["Custom.ActualHours"]` changed; each gives
`oldValue`, `newValue`, the date and who did it. If it already moved for the
work this comment covers, **leave it alone and say so** — post the comment
without touching the hours. Never assume the last value you saw is current.

**Estimate it the way a person would, by hand.** The number is how long this
work would have taken someone doing it manually — reading the failures, digging
through traces, fixing the specs, re-running them — not the wall-clock of an
automated session. A session that took twenty minutes can still be a fair half
day of work, and it should be logged as one.

How much: **1-4 hours, scaled to the size of the day** — a couple of fixes is
1-2, a heavy day of five or more is 4. The by-hand history on this ticket runs
+3 to +6, so anything in that band reads normally; don't go beyond it in one go,
and never log 0. Judgement on the actual effort, not a count of tests.

**Take the same hours off Remaining Work.** The two move together: whatever is
added to Actual hours comes off `Microsoft.VSTS.Scheduling.RemainingWork` in the
same PATCH. +3 hours means Remaining Work drops by 3. This is how Sabih has
always done it by hand — every by-hand entry on this ticket moved both fields by
the same amount, and leaving Remaining Work behind makes the burndown wrong.

Note the types differ: Actual hours is a **string** (`"21"`), Remaining Work is a
**number** (`13`).

If Remaining Work is already **0**, or empty, leave it alone and only raise
Actual hours — never push it negative. If the hours to add would take it below
zero, clamp it at 0 rather than skipping the update.

**The write.** The ADO web UI can't be clicked, so go through the REST API:
Basic auth with an empty username and the PAT as password (`:{PAT}` base64),
`Content-Type: application/json-patch+json`.

```
PATCH {tracker_base_url}/_apis/wit/workitems/121073?api-version=7.0
[
  { "op": "add", "path": "/fields/Custom.ActualHours", "value": "<current + added>" },
  { "op": "add", "path": "/fields/Microsoft.VSTS.Scheduling.RemainingWork", "value": <current - added, floored at 0> }
]
```

Drop the second operation entirely when Remaining Work is 0 or empty.

**The token.** `AZURE_DEVOPS_PAT` is in this repo's `.env` (Work Items
read/write, verified against 121073). Read it by parsing the `.env` file
directly, not from the shell environment — tool shells don't inherit it. If the
line is ever missing, stop and say so rather than guessing.

Never hardcode the token, never print it, and never accept one pasted in chat.

**Say what you actually did.** If the PATCH went through, say so with the old and
new totals. If you skipped it because the day was already logged, say that. Never
claim the field was updated when it wasn't.

---

## Git Push Rules

**GitHub (`origin`) — push directly, no PR.**
Always commit and push straight to `main` (or `master`) on GitHub. Never create
a feature branch or a PR for automation changes — just push to main.

**ADO Platform (`Cybersoft.Platform`) — branch + CR.**
If any change touches
`https://dev.azure.com/Cybersoft-Technologies-Inc/Platform/_git/Cybersoft.Platform`,
create a new branch, push there, and have a reviewer create the CR. Never push
directly to `main`/`master` on that ADO repo.

**GitHub and the platform mirror must stay in sync.** When they match, nothing to
do. When they do not, raise a PR — the same as every other repo. Run
`node scripts/sync-to-platform.js --dry-run` after finishing work; anything it lists
as new, changed or removed belongs in a PR before the job is done. Paths in the
script's EXCLUDE set are not drift.

**Prefix the PR title with the repo.** `SchoolCafe: `, `K12: `, `POS: `, `CafeTV: `
then the change. The platform repo takes PRs from every automation project at once,
so a title without the prefix makes a reviewer open it to find out whose it is.

**Reviewers on every platform PR.**
Required: **Venkata Pranitha Raj Kondaveeti**.
Optional: **Haritha Manne**, **Jagadeesh Kumar Yadlapalli**, **Prasoona Nalajala**.

**Branch names are camelCase** — no dashes, underscores or slashes.
`posDailyReports`, `paginationFix`. The mirror script rejects anything else.

**Mirroring with `scripts/sync-to-platform.js`, two traps.** It cuts the branch
from the *local* `AutomationProjects`, which goes stale and silently re-includes
already-merged work — `git -C <platform> fetch && git checkout AutomationProjects
&& git reset --hard origin/AutomationProjects` first, then check the file count
matches the slice. And it refuses to run when the platform checkout is dirty; an
untracked `CLAUDE.md` lives there, so move it aside and put it straight back.

It also rebuilds the branch on every run, so never run it against a branch that
carries anyone else's commits — copy the files and commit by hand instead.

**Always set auto-complete.** Tick **Set auto-complete** — the checkbox next to
the Create button on the new-PR form, or the button on the PR afterwards — so it
merges itself the moment the required reviewer approves and the branch policies
pass. Nobody should have to come back and press Complete.

Set it on every PR, including one already open. Confirm it took: the PR header
switches to showing auto-complete is on, rather than offering to set it.

---

## Slicing the work

**One small slice per PR, never the backlog.** Roughly a section at a time, or
5-14 screens. Sabih reviews and merges each one; a big drop is unreviewable.
Say what the slice contains and what is left in the queue.

**Nothing in a PR but the work itself.** No local tooling, no machine-specific
files, no "while I was in there" extras. `EXCLUDE` in `scripts/sync-to-platform.js`
is where to add anything that should stop reaching the shared repo.

**PR descriptions are a few bullets of what changed.** No rationale essays, no
provenance lines, no explaining the mechanics. Four short bullets is right.

---

## Before you push

**Self code review is a required step, not optional:** write → review → fix →
push → PR. Review it as an engineer with twenty years behind them would: look
for assertions that can pass while the thing under test is broken, locators that
will drift, hard-coded data that will rot, duplication, and anything slow or
flaky at suite scale. Fix the real findings and say which ones were deliberately
left.

**Grep the batch for district data baked into assertions** before running — it
is the failure this suite keeps producing:

```
grep -rn "^\s*'[^']*[0-9$][^']*',\?$" tests/<section> | grep -v ctl00_
grep -rniE "'(input|label|form|text) (field|input) [0-9]+'" tests/<section>
```

Site counts, dates and balances change on QA; placeholder captions like
`Input field 3` are accessibility names, not labels. Match the shape
(`/Not Configured:\s*\d+\s*Site\(s\)/`) or drop the assertion.

**Run the slice against QA and get it green before pushing.** Never push specs
that have not been run.

---

## Known QA gaps

Four POS pages answer with an Internal Server Error on QA, so their specs are
`test.fixme` until the pages are fixed:

- Administration > Serving Exceptions — `/POS/DuplicateMeal.aspx`
- Daily Reports > Duplicate Meals — `/POS/DuplicateMealsReport.aspx`
- Management > Meals Per Labor Hour — `/POS/MealPerLaborHourReport.aspx`
- Orders > Order Fulfillment — `/POS/OrderFulfillment.aspx`

`tests/configuration/meal_equivalents` asserts seven captions named
`Input field 1` … `Input field 7`. Those are accessibility placeholder names,
not real labels — fix them when Configuration ships.

---

## QA Ticket Flow — Staged Gates

When the user shares a QA ticket (ADO link or ticket number), run these phases
in order. **Never jump ahead without the user's explicit "go".**

### Phase 1 — Write the review doc, then STOP

1. Fetch and read the ticket from ADO.
2. Write a concise `.txt` file to the Desktop — filename `T-<id>.txt`.

   **In chat**: write the steps to reproduce straight to the point so the user can
   review them immediately. Numbered list, `→` for navigation, backticks for values,
   `*` for sub-steps. No ✅/❌ (those are only for fixing a failing test):
   ```
   1. Log in to PrimeroEdge POS
   2. Payments → Add Funds → select a student
   3. Cash tab → enter `$5.00` → confirm
      → balance should increase by $5.00
   4. Sign out, sign back in → same student → balance persists
   ```

   **Desktop `T-<id>.txt`**: full 3-section format:
   ```
   QA Passed ✔️ | MM/DD/YYYY
   Steps to Reproduce

   === SECTION 1 — FULL STEPS ===
   1. Log into PrimeroEdge POS as the admin user.
   2. Navigate to Payments → Add Funds.
   (complete human-readable flow — step 1 = login, step 2 = navigate)

   === SECTION 2 — AUTOMATED ===
   1. Log into PrimeroEdge POS.
      -> Signed in; the POS dashboard loads.
   2. ...  (each step with `->` expected result)

   === SECTION 3 — MANUAL ===
   1. Log into PrimeroEdge POS as the admin user.
   2. Navigate to ...
   3. ...  (complete flow from the beginning — step 1 = login, step 2 = navigate.
            Never reference "step N above" or other sections — fully self-contained.)
   ```

3. **STOP. Do NOT write any spec, do NOT commit or push anything yet.**
4. Wait for the user to review and say **"go"**.

### Phase 2 — Automate (only after "go")

1. Write `tests/tickets/t-<id>.spec.ts`.
2. Run and verify until green.
3. Commit and push to `main`/`master` on GitHub (see Git Push Rules above).
