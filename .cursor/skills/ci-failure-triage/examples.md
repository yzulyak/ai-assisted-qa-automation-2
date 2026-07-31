# Example: Red E2E check → triage PR comment → (optional) Jira

## Scenario

PR `#42` on branch `feat/ds1-create-program` — **E2E Tests** is red.

## Step 1 — Resolve and download evidence

```bash
gh run list --workflow e2e.yml --branch feat/ds1-create-program --limit 5
# → run-id 18234567890, conclusion failure

gh run view 18234567890 --json conclusion,url,headSha,displayTitle
gh run view 18234567890 --log-failed

mkdir -p /tmp/ci-triage/18234567890
gh run download 18234567890 -n playwright-report -D /tmp/ci-triage/18234567890/
```

From the report / failed log:

```
Error: expect(locator).toBeVisible() failed
Locator: getByText('Web Development 2026')
Expected: visible
Timeout: 5000ms

  at tests/ds1.spec.ts:178:48
```

## Step 2 — Cross-reference

| Layer | Finding |
|-------|---------|
| Spec `tests/ds1.spec.ts` | Asserts created program name appears in list after Create |
| POM `pages/programs.page.ts` | Locator uses `getByText(name)` on programs table |
| Feature `features/DS-1.feature` | AC: newly created program is visible in the Programs list |
| Parent story | **DS-1** |

No locator typo; assertion matches AC. Failure looks like product behavior, not a wrong expectation.

## Step 3 — Classify

**Classification:** App bug (pending human confirm)

Ask the user to confirm before filing Jira. Do not auto-merge any fix.

## Step 4 — PR comment

```bash
gh pr comment 42 --body "$(cat <<'EOF'
## CI failure triage

**Run:** [18234567890](https://github.com/org/repo/actions/runs/18234567890) · commit `abc1234` · workflow `E2E Tests`

**Failing test:** `tests/ds1.spec.ts` — "Valid program is created and appears in the list"

**Classification:** App bug (needs human confirm)

**Root cause:** Programs list after Create — modal closes but the new program name never appears in the list (AC in `features/DS-1.feature` requires it). Spec/POM assertion aligns with AC; not a locator mismatch.

| | |
|---|---|
| **Expected** | "Web Development 2026" visible in Programs list after Create |
| **Actual** | Element not found within 5s; list unchanged |

**Suggested fix:** Product fix on Didaxis create → list refresh/persist path. No test patch proposed until human confirms.

**Evidence:** Playwright timeout on `getByText('Web Development 2026')` at `tests/ds1.spec.ts:178`; artifact `playwright-report` under run `18234567890`

**Jira:** not filed yet · **Human confirm:** required before filing app bug
EOF
)"
```

## Step 5 — After human confirms app bug

Follow [jira-bug-reporter](../jira-bug-reporter/SKILL.md): reproduce, duplicate-check, create DS-1 sub-task, attach screenshots, then update the PR comment with the Jira key.

---

# Example: Red check that is a test issue

## Failure

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Creat' })
```

Cross-ref: UI button label is **Create**; POM has typo `Creat`. Feature AC does not say "Creat".

**Classification:** Test issue

**Suggested fix:** Correct locator in `pages/programs.page.ts` (propose patch; do not push/merge without approval). Do not file Jira.
