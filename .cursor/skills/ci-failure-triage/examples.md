# CI Failure Triage — Example

## Input

PR #42, branch `feat/ds1-tc011`, E2E check failed.

```bash
gh run list --workflow e2e.yml --branch feat/ds1-tc011 --limit 1
# 123456789  E2E Tests  feat/ds1-tc011  failure

gh run view 123456789 --log-failed
gh run download 123456789 -n playwright-report -D /tmp/ci-triage/123456789/
```

Log excerpt:

```
tests/ds1-create-program.spec.ts:142:5 › DS-1: Create new academic program › TC-002 › expect(locator).toBeVisible()
Expected: visible
Received: hidden
Locator: getByText('Computer Science BSc')
```

## Cross-reference

- Spec: `tests/ds1-create-program.spec.ts` — creates program, asserts name in list
- POM: `pages/ProgramsPage.ts` — `programRow(name)` uses `getByText`
- AC: `features/DS-1.feature` — created program appears in list immediately

Trace shows list refreshed but row text is truncated; AC expects full name visible.

## Classification

**App bug** — UI truncates name; test and AC align.

## PR comment (posted)

```markdown
## CI failure triage

**Run:** [123456789](https://github.com/org/repo/actions/runs/123456789) · commit `abc1234` · workflow `E2E Tests`

**Failing test:** `tests/ds1-create-program.spec.ts` — "TC-002"

**Classification:** App bug (pending human confirm)

**Root cause:** Programs list renders truncated program title — full name from create flow never appears in row text node the list exposes.

| | |
|---|---|
| **Expected** | "Computer Science BSc" visible in program list (`features/DS-1.feature`) |
| **Actual** | Locator `getByText('Computer Science BSc')` hidden; trace shows abbreviated label |

**Suggested fix:** App: show full program name in list row. Test change not recommended.

**Evidence:** `playwright-report` artifact → TC-002 failure screenshot; log line above

**Jira:** pending confirmation
```

## Human confirms → Jira

Follow [jira-bug-reporter](../jira-bug-reporter/SKILL.md), parent `DS-1`, then update PR comment with `DS-173` link.
