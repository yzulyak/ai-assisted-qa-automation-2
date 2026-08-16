---
name: self-heal
description: Repairs Playwright locator drift after a UI change by re-discovering elements via the Agent-Browser a11y tree and patching POMs with minimal role-based diffs. Use ONLY after triage classifies the red run as a test issue (drift) — never for a real app bug. Triggers on "the build is red because a locator broke", "fix the drifted selector", "the test broke after a UI change", "heal the suite", or any request to self-heal locator drift. If triage has not confirmed drift, stop and route to bug-reporter instead.
---

# Self-Heal (Locator Drift)

Repairs one broken locator per run when triage says the failure is **test
issue (drift)**, not an app defect. Patch POMs only; never weaken spec
assertions to go green.

## Prerequisites

- Triage has already run and returned classification **test issue (drift)** with
  evidence (run id, trace path, failing test, POM file).
- If classification is **real app bug**, **inconclusive**, or missing → **stop**.
  Route to **bug-reporter** (human confirms before Jira). Do not heal.

## Steps

### 1. Require triage's drift classification

Confirm the handoff explicitly states **test issue (drift)** — e.g. stale
accessible name, renamed button, moved role, timeout caused by a locator that
no longer resolves.

If not drift → stop and route to **bug-reporter**. Do not proceed.

### 2. From the trace, find the failing locator and its POM

Pull evidence from the failed run (see
[ci-failure-triage](../ci-failure-triage/SKILL.md)):

- Failing test: `tests/*.spec.ts` + test title
- Playwright error: which locator timed out or resolved wrong
- Trace/screenshot: element the test expected vs what the page showed

Map the locator to the owning Page Object in `pages/`. Read the spec only to
trace the call chain — do not edit the spec in this workflow.

### 3. Re-discover the element via Agent-Browser a11y tree

Open the same page/state the failing step needs (use `DIDAXIS_URL` / test
login as in other skills).

Crawl with Agent-Browser (`browser_snapshot` / a11y tree). Find the target
element by **role + current accessible name** (and state if needed) — not
CSS, XPath, or pixel coordinates.

Prefer the same locator priority as
[pom-conventions](../pom-conventions/SKILL.md):
`getByRole` → `getByLabel` / `getByPlaceholder` → `getByText` →
`getByTestId` (last resort, comment why).

Disambiguate with `.filter({ hasText })` when multiple matches; never `.first()`.

### 4. Patch the locator in the POM — minimal role-based diff

Edit **only** the broken locator(s) in the POM file under `pages/`.

- Minimal diff: update name/role/filter to match the live a11y tree.
- Do **not** change spec assertions, expected strings, or assertion logic.
- Do **not** add `waitForTimeout`, `.first()`, CSS, or XPath.
- Do **not** edit application source.

### 5. Re-run and prove green with assertions unchanged

```bash
npx playwright test <spec> -g "<failing test title>"
```

**Pass criteria:**

- The previously failing test (and directly affected tests in the same spec)
  are green.
- Spec file diff is empty — no assertion changes.

**If green only after weakening an assertion** → that is a bug. Revert the
assertion change, stop, and escalate (do not merge). A heal that trades
coverage for green is invalid.

If the same locator failure repeats after one heal attempt → stop (loop guard).

### 6. Report old → new locator diff + green run

Deliver:

| Field | Content |
|-------|---------|
| **Classification** | test issue (drift) — cite triage run id |
| **POM** | `pages/<File>.ts` — property/method |
| **Locator diff** | old → new (exact `getByRole` / filter change) |
| **Re-run** | command + pass output |
| **Assertions** | unchanged (spec diff empty) |

Open a **PR** for every heal — one repair per run, one PR. Link the failing
CI run and triage diagnosis in the PR body. Human approves merge; never merge
automatically.

## Guardrails

- **One repair per run** — single locator (or one tightly coupled locator
  group in the same POM method). Multiple failures → triage again; heal the
  highest-impact one only.
- **Never heal app bugs** — wrong behavior with a working locator is not drift.
- **POM only** — specs hold assertions; POMs hold locators.
- **Every heal becomes a PR** — no silent local-only fixes.

## Related skills

- [ci-failure-triage](../ci-failure-triage/SKILL.md) — pull trace, classify
- [pom-conventions](../pom-conventions/SKILL.md) — locator priority and style
- [jira-bug-reporter](../jira-bug-reporter/SKILL.md) — when drift is not the cause
