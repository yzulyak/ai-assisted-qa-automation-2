---
name: eval-report
description: >-
  Regenerates eval-report.md (suite reliability: flake rate, heal success,
  generation-gate pass rate, ask-vs-guess) from CI logs, PR history, and local
  agent transcripts. MUST use after .github/workflows/test-generation.yml
  finishes, and after any local agent or QA orchestrator run — even when the
  user does not ask for a report. Cursor has no built-in telemetry for these
  metrics.
---

# Eval report

Refresh `eval-report.md` whenever the QA loop finishes a run.

## When to run (mandatory)

Regenerate **immediately after**:

1. `.github/workflows/test-generation.yml` completes (CI step or agent wrap-up)
2. Any **agent** or **orchestrator** finish locally (ticket → plan → test-writer →
   playwright → triage/heal/bug-reporter), including backlog mode
3. A human asks for the reliability / eval report

Do not skip because the suite was green or because “nothing changed.”

## How

```bash
npm run eval:report
# or
node scripts/generate-eval-report.mjs
```

Optional:

| Env | Meaning |
|---|---|
| `EVAL_E2E_RUNS` | Last N E2E workflow runs (default `10`) |
| `EVAL_TRANSCRIPTS_DIR` | Cursor agent-transcripts root for ask-vs-guess |
| `EVAL_OUT` | Output path (default `eval-report.md`) |
| `EVAL_REPO` | `owner/repo` override |

Requires `gh` authenticated to the repo. Ask-vs-guess needs local transcripts;
on CI that section may be `n/a` — still write the file.

## Report shape (do not invent sections)

Each metric block must include:

1. **Number**
2. **How measured** (CI logs / PR history / session review — state that Cursor
   has no built-in telemetry)
3. **What it tells us** (one line)

Sections:

- Flake rate — tests that passed only on retry, last N CI runs
- Heal success rate — clean drift heals / total, plus **masked regressions
  (must be 0)**
- Generation-gate pass rate — generated specs green + conforming + maps-to-AC
  on the **first** PR
- Ask-vs-guess — times the agent asked vs invented a value
- Top reliability risk + Next action

## Rules

- Prefer the script over hand-editing numbers.
- Never claim telemetry Cursor does not have.
- If `gh` is unavailable, say so in the report and still record what you can
  from the current session (heal/generation outcomes you just produced).
- Commit `eval-report.md` with the run’s PR when the workflow/agent opens one;
  otherwise leave it as a working-tree update for the human.
