# Example: Failed DS-1 test → Jira sub-task

## Failure input

Playwright run of `tests/ds1.spec.ts` fails with:

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Web Development 2026')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

  at tests/ds1.spec.ts:178:48
```

Screenshot path from the run:

```
test-results/ds1-Positive-flows-Valid-program-is-created-and-appears-in-the-list-chromium/test-failed-1.png
```

## Step 1 — Resolve parent story

- Spec file: `tests/ds1.spec.ts`
- Feature file: `features/DS-1.feature`
- Parent: **DS-1**

## Step 2 — Reproduce

```bash
npx playwright test tests/ds1.spec.ts -g "Valid program is created and appears in the list" --workers=1
npx playwright test tests/ds1.spec.ts -g "Valid program is created and appears in the list" --workers=1 --repeat-each=2
node scripts/collect-failure-screenshots.mjs --latest
```

Confirm the failure reproduces twice and PNGs are listed.

## Step 3 — Duplicate check

```jql
parent = DS-1 AND issuetype = Sub-task AND text ~ "program list" AND text ~ "created"
```

No matching open sub-task → create new issue.

## Step 4 — Create sub-task via MCP

`createJiraIssue` fields:

| Field | Value |
|---|---|
| `projectKey` | `DS` |
| `issueTypeName` | `Sub-task` |
| `parent` | `DS-1` |
| `summary` | `[Composer] Newly created program does not appear in the Programs list` |
| `additional_fields` | `{"priority": {"name": "High"}}` |

Description body:

```
**Title:** Newly created program does not appear in the Programs list

**Severity:** High

**Steps to Reproduce:**
1. Log in as admin at https://test.didaxis.studio/login
2. Navigate to Programs page
3. Click "+ New Program"
4. Fill in Program Name with "Web Development 2026"
5. Fill in Description with "Full-stack web development program"
6. Click "Create"

**Expected Result:** Modal closes and the Programs list displays "Web Development 2026"

**Actual Result:** Modal closes but "Web Development 2026" is not visible in the list.
Playwright error:
expect(locator).toBeVisible() failed
Locator: getByText('Web Development 2026')
Expected: visible
Timeout: 5000ms
Error: element(s) not found
at tests/ds1.spec.ts:178:48

**Environment:**
- URL: https://test.didaxis.studio
- Browser: Chromium (Playwright)
- Account: admin@didaxis.studio

**Evidence:**
- Screenshot: attached (local: test-results/.../test-failed-1.png)
- Trace: (none — failure on first run without retry)

**Linked Story:** DS-1
```

## Step 5 — Attach screenshots (required)

Assume the new issue key is `DS-173`:

```bash
node scripts/jira-attach-screenshots.mjs DS-173 $(node scripts/collect-failure-screenshots.mjs --latest)
```

Exit code must be `0` before reporting completion.

## Step 6 — Return to user

```
Created DS-173: [Composer] Newly created program does not appear in the Programs list
https://legionqaschool.atlassian.net/browse/DS-173
Parent: DS-1
Screenshots attached: test-failed-1.png
```

## Duplicate path (existing open sub-task)

If JQL finds an open match (e.g. `DS-150`):

1. Do **not** create a new issue
2. Comment with the new Playwright error and re-run details
3. Attach fresh screenshots:

```bash
node scripts/jira-attach-screenshots.mjs DS-150 $(node scripts/collect-failure-screenshots.mjs --latest)
```
