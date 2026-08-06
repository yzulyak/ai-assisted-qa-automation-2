# Jira Bug Reporter — Example

## Input

Playwright failure from `tests/ds1-create-program.spec.ts`:

```
Error: expect(locator).toBeVisible() failed
Locator: getByText('Computer Science BSc')
Expected: visible
Received: hidden
```

Parent story: `DS-1` (from `test.describe("DS-1: Create new academic program")`)

## Re-run test and collect screenshots

```bash
npx playwright test tests/ds1-create-program.spec.ts -g "TC-002" --workers=1
node scripts/collect-failure-screenshots.mjs --latest
```

Example output:

```
/Users/.../test-results/ds1-create-program-...-chromium/test-failed-1.png
```

## Duplicate search

```jql
parent = DS-1 AND issuetype = Sub-task AND text ~ "Computer Science BSc"
```

## Draft report

**Summary:** `[Composer] Created program name not visible in program list`

**Description:**

```
**Severity:** High
**Priority:** High

**Playwright Error:**
Error: expect(locator).toBeVisible() failed
Locator: getByText('Computer Science BSc')
Expected: visible
Received: hidden

**Steps to Reproduce:**
1. Log in as admin at https://test.didaxis.studio/login
2. Navigate to Programs page
3. Click "+ New Program"
4. Enter program name "Computer Science BSc" and submit
5. Observe the program list

**Expected Result:** The new program appears in the list immediately after creation.

**Actual Result:** The program name is not visible in the list after creation.

**Environment:**
- URL: https://test.didaxis.studio
- Browser: Chromium (Playwright)
- Account: admin@didaxis.studio

**Evidence:**
- Screenshot attached to ticket (see attachments)
- Local: test-results/.../test-failed-1.png

**Linked Story:** DS-1
```

## MCP create call

```json
{
  "cloudId": "legionqaschool.atlassian.net",
  "projectKey": "DS",
  "issueTypeName": "Sub-task",
  "parent": "DS-1",
  "summary": "[Composer] Created program name not visible in program list",
  "description": "<full markdown from above>",
  "additional_fields": {
    "priority": { "name": "High" }
  }
}
```

## Attach screenshots (required)

```bash
node scripts/jira-attach-screenshots.mjs DS-42 $(node scripts/collect-failure-screenshots.mjs --latest)
```

One-shot for an existing ticket:

```bash
node scripts/report-bug-with-screenshots.mjs DS-42 DS-1 "TC-002"
```

Optional archive:

```bash
node scripts/archive-failure-evidence.mjs DS-1 --latest
```

## Output to user

Return the new issue key (e.g. `DS-42`), Jira URL, list of attached screenshot filenames, and confirm upload script exited 0.
