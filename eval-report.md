# Suite reliability eval report

Generated: **2026-08-16T21:36:43.103Z** · Repo: **yzulyak/ai-assisted-qa-automation-2** · Window: last **9** parsed E2E runs (requested 10)

> Cursor has **no built-in telemetry** for flake / heal / generation-gate / ask-vs-guess. Numbers below were measured from GitHub Actions logs, PR history, and (when present) local agent transcripts via `scripts/generate-eval-report.mjs`.

## Flake rate

**Number:** **1** tests passed only on retry (Playwright `flaky`) / **1010** completed tests = **0.10%**

**How measured:** `gh run list --workflow=e2e.yml` for the last 10 runs; downloaded each job log; parsed Playwright summary lines (`N flaky` / `N failed` / `N passed`). Flaky = failed initially, passed on retry (`retries: 2` on CI).

**What it tells us:** Low but non-zero intermittent pass-on-retry; watch the titles below before raising retries further.

Flaky examples:
- `[chromium] › tests/ds5.spec.ts:358:7 › Edge cases › TC-012: Page refresh preserves the program list content` (run [31967040949](https://github.com/yzulyak/ai-assisted-qa-automation-2/actions/runs/31967040949))

## Heal success rate

**Number:** clean heals **1/1 (100.00%)** · **masked regressions: 0** (must be **0**)

**How measured:** PR history (`gh pr list`) filtered to heal/drift repair PRs (`heal/*` branches or heal/drift titles). Clean = POM-only diff under `pages/` with no spec assertion edits. Masked = heal touched `tests/**` or described weakening assertions.

**What it tells us:** Heals are not hiding regressions by loosening expects.

Heal PRs:
- [#2](https://github.com/yzulyak/ai-assisted-qa-automation-2/pull/2) — clean=yes; masked=no; POM-only=yes

## Generation-gate pass rate

**Number:** **0/1 (0.00%)** first PRs that were green + conforming + maps-to-AC

**How measured:** PR history for ticket/generation PRs (e.g. `cursor/ds-ticket-*`, `test(DS-*)`). Pass requires (1) E2E check SUCCESS on that PR **or** explicit green evidence in the body, (2) AC/Gherkin linkage in the PR body, (3) conforming intent (feature plan / role-based notes). Local `generation-gate.sh` is a write-time hook — this metric is **first-PR outcome**, not hook exit codes.

**What it tells us:** Generation opens PRs that still fail CI — gate conformance alone is not enough; prove green before/at PR open.

Generation PRs:
- [#1](https://github.com/yzulyak/ai-assisted-qa-automation-2/pull/1) — first-PR pass=no; E2E=FAILURE; maps-to-AC=yes

## Ask-vs-guess

**Number:** asks **6** (across 3 sessions) · guesses **2** (across 1 sessions) · ratio ask:guess = **6:2**

**How measured:** Regex scan of local Cursor agent transcripts under `/Users/yaroslavzulyak/.cursor/projects/Users-yaroslavzulyak-Legion-AI-Powered-QA-Automation-ai-assisted-qa-automation-2/agent-transcripts` (assistant turns only). Ask = explicit clarify/confirm/prefer questions; guess = assume/invent/default-without-asking. Cursor has no built-in telemetry — session review only.

**What it tells us:** At least one session invented a missing value instead of asking — treat that as a reliability smell for auth/config paths.

## Top reliability risk

Generated specs are not green on the first PR (generation-gate pass rate < 100%).

## Next action

Before opening the next ticket PR, run the full affected suite under CI-equivalent env and fix reds (or file bugs) so the first PR check is green + AC-mapped.

---

*Regenerate after every Test Generation workflow finish and after any local agent/orchestrator run: `npm run eval:report` (or `node scripts/generate-eval-report.mjs`).*
