# DS-3 — Test Plan: Program Name Validation and Duplicate Prevention

**Jira:** [DS-3](https://legionqaschool.atlassian.net/browse/DS-3) — Program name validation and duplicate prevention  
**Feature:** Program name validation and duplicate prevention  
**Role:** Admin  
**Scope:** Program creation form/modal on the Programs page (`+ New Program`)  
**Sources:** Jira DS-3 AC, Confluence *Architecture Overview*, *Program Setup — Field Definitions*, *Program Setup — Validation Rules*, Playwright MCP + live UI exploration (2026-07-06)

---

## Jira Acceptance Criteria (from DS-3)

```gherkin
Scenario: Reject program name with only whitespace
  Given I am on the program creation form
  When I enter "   " as the program name
  And I click Create
  Then the form is not submitted (name is trimmed, treated as empty)

Scenario: Accept program name with special characters
  Given I am on the program creation form
  When I enter "Informatique & IA - Niveau 2" as the program name
  And I fill other required fields
  And I click Create
  Then the program is created successfully

Scenario: Reject duplicate program name
  Given a program "Web Development 2026" already exists
  When I try to create a new program with the same name
  Then I see an error indicating the name already exists
```

---

## Confluence Evidence Summary

### Architecture Overview
Didaxis Studio uses a **three-layer model**: Session Templates (curriculum structure) → Scheduled Sessions (calendar entries with source/status) → Assignments (student deliverables). Key invariants: calendar is the live data source; MANUAL/LOCKED sessions are immovable; validation runs after every mutation (debounced 500ms); generator is deterministic.

### Program Setup — Field Definitions (relevant to DS-3)
| Field | Required | Constraints |
|---|---|---|
| **Program Name** | Yes | Max **100** characters, unique per organization; trimmed on submit |
| **Description** | No | Max 500 characters |

**UI locators (verified on live page):**
- Page heading: `Programs` (h2)
- Create trigger: `+ New Program` button
- Modal: `dialog` named `New Program`
- Fields: `Program Name` (required, label shows `Program Name *`), `Description` (textarea)
- Actions: `Create`, `Cancel`
- List: `table tbody` rows with program name in `p` element

**Important:** `getByLabel('Description')` without dialog scope matches table Edit/Delete action buttons whose aria-labels contain "Description". Always scope to `newProgramDialog(page)`.

---

## Positive Flows

### TC-001 — Program with special characters in name is created successfully

**Title:** Program name containing ampersands, hyphens, and accented characters is accepted and persisted

**Preconditions:**
- Admin user account exists
- Admin is logged in
- Program name does not already exist in the program list

**Steps:**
1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   And I fill in "Program Name" with "Informatique & IA - Niveau 2"
   And I fill in "Description" with "Advanced informatics and artificial intelligence track"
   And I click "Create"
   Then the program creation modal closes
   And the Programs page program list displays "Informatique & IA - Niveau 2"
   ```

**Expected result:** Program is created without validation errors; name is displayed exactly as entered (including `&`, `-`, and accented characters).

**Priority:** High  
**Maps to AC:** Accept program name with special characters  
**Observed (2026-07-06):** Passes — special-character names create successfully.

---

### TC-002 — Valid Program Name with leading and trailing whitespace is saved after trim

**Title:** Non-empty name surrounded by whitespace is accepted and stored without outer whitespace

**Preconditions:**
- Admin user account exists
- Admin is logged in
- Program does not already exist

**Steps:**
1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   And I fill in "Program Name" with "  Data Science Fundamentals  "
   And I fill in "Description" with "Introductory data science curriculum"
   And I click "Create"
   Then the program creation modal closes
   And the Programs page program list displays "Data Science Fundamentals"
   And the program list does not display "  Data Science Fundamentals  "
   ```

**Expected result:** Leading and trailing whitespace is trimmed before save; program appears under the trimmed name only.

**Priority:** Medium  
**Observed (2026-07-06):** Passes — name is trimmed on save and displayed without outer whitespace.

---

## Negative Flows

### TC-003 — Whitespace-only Program Name is rejected and form is not submitted

**Title:** Program Name containing only spaces is trimmed, treated as empty, and blocks submission

**Preconditions:**
- Admin user account exists
- Admin is logged in
- Program creation form is open on the Programs page

**Steps:**
1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   And I fill in "Program Name" with "   "
   And I fill in "Description" with "Whitespace-only name test"
   Then the "Create" button is disabled
   And the program creation modal remains open
   And no new program is added to the program list
   ```

**Expected result:** Whitespace-only input is treated as empty after trim; **Create** is disabled; form is not submitted.

**Priority:** High  
**Maps to AC:** Reject program name with only whitespace  
**Observed (2026-07-06):** Passes — Create button disabled for whitespace-only input (client-side, before click).

---

### TC-004 — Empty Program Name prevents form submission

**Title:** Create action is blocked when Program Name field is left empty

**Preconditions:**
- Admin user account exists
- Admin is logged in
- Program creation form is open

**Steps:**
1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   And I leave the "Program Name" field empty
   And I fill in "Description" with "Description without a program name"
   Then the "Create" button is disabled
   And I cannot submit the form by clicking "Create"
   And no new program is added to the program list
   ```

**Expected result:** Empty **Program Name** blocks submission; modal stays open; program list is unchanged.

**Priority:** High  
**Observed (2026-07-06):** Passes — Create disabled when name empty.

---

### TC-005 — Duplicate Program Name is rejected with an error message

**Title:** System prevents creating a program whose name already exists

**Preconditions:**
- Admin user account exists
- Admin is logged in
- Program **"Web Development 2026"** already exists in the program list

**Steps:**
1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains "Web Development 2026"
   When I click "+ New Program"
   And I fill in "Program Name" with "Web Development 2026"
   And I fill in "Description" with "Duplicate attempt description"
   And I click "Create"
   Then the program creation modal remains open
   And an error message indicates the program name already exists
   And the program list contains exactly one entry named "Web Development 2026"
   ```

**Expected result:** Duplicate is rejected with a clear, field-level or form-level error; no second program is created.

**Priority:** High  
**Maps to AC:** Reject duplicate program name  
**Observed (2026-07-06):** **BUG** — duplicate name creates a second program; modal closes; no error message shown.

---

### TC-006 — Valid unique Program Name does not trigger a duplicate error

**Title:** New program with a unique name is not falsely rejected as a duplicate

**Preconditions:**
- Admin user account exists
- Admin is logged in
- One existing program and one new unique name prepared

**Steps:**
1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains "Web Development 2026"
   When I click "+ New Program"
   And I fill in "Program Name" with "Mobile App Development 2026"
   And I fill in "Description" with "iOS and Android development track"
   And I click "Create"
   Then the program creation modal closes
   And no duplicate-name error message is displayed
   And the Programs page program list displays "Mobile App Development 2026"
   ```

**Expected result:** Uniqueness check passes; program is created; no false-positive duplicate error.

**Priority:** Medium  
**Observed (2026-07-06):** Passes for genuinely unique names.

---

## Edge Cases

### TC-007 — Whitespace-only variants (tabs and newlines) are treated as empty

**Title:** Program Name with only tab or newline characters is rejected like space-only input

**Preconditions:**
- Admin user account exists
- Admin is logged in

**Steps:**
1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   And I fill in "Program Name" with "\t\t"
   And I fill in "Description" with "Tab-only name test"
   Then the "Create" button is disabled
   When I clear the "Program Name" field
   And I fill in "Program Name" with "\n\n"
   And I fill in "Description" with "Newline-only name test"
   Then the "Create" button is disabled
   And no new program is added to the program list
   ```

**Expected result:** All-whitespace variants (spaces, tabs, newlines) are trimmed to empty and block submission.

**Priority:** Medium

---

### TC-008 — Single-character Program Name is accepted

**Title:** Minimum valid non-whitespace Program Name (one character) is allowed

**Preconditions:**
- Admin user account exists
- Admin is logged in
- Single-character name does not already exist

**Steps:**
1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   And I fill in "Program Name" with "X"
   And I fill in "Description" with "Single character boundary test"
   And I click "Create"
   Then the program creation modal closes
   And the Programs page program list displays "X"
   ```

**Expected result:** Single-character name passes validation and appears in the list.

**Priority:** Low

---

### TC-009 — Program Name at maximum allowed length is accepted

**Title:** Program Name at the documented maximum length (**100** characters per Confluence) is saved and displayed in full

**Preconditions:**
- Admin user account exists
- Admin is logged in
- A unique 100-character Program Name is prepared
- That name does not already exist

**Steps:**
1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   And I fill in "Program Name" with a 100-character string
   And I fill in "Description" with "Max length boundary test"
   And I click "Create"
   Then the program creation modal closes
   And the Programs page program list displays the full 100-character program name
   ```

**Expected result:** Max-length name is accepted without truncation or validation failure.

**Priority:** Medium

---

### TC-010 — Program Name exceeding maximum length is rejected

**Title:** Program Name longer than 100 characters cannot be saved

**Preconditions:**
- Admin user account exists
- Admin is logged in
- Maximum Program Name length is **100** (Confluence Field Definitions)

**Steps:**
1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   And I fill in "Program Name" with a 101-character string
   And I fill in "Description" with "Over max length test"
   Then either the input prevents typing beyond 100 characters
   Or the "Create" button is disabled
   Or a validation error is shown for "Program Name"
   And no program with a 101-character name appears in the program list
   ```

**Expected result:** Over-limit input is blocked or rejected; no invalid program entry is created.

**Priority:** Medium  
**Observed (2026-07-06):** **BUG** — input accepts 101 characters with no client-side truncation or validation.

---

### TC-011 — Duplicate Program Name differing only by letter case is rejected

**Title:** Program names that match an existing name ignoring case are treated as duplicates

**Preconditions:**
- Admin user account exists
- Admin is logged in
- Program **"Web Development 2026"** already exists in the program list

**Steps:**
1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains "Web Development 2026"
   When I click "+ New Program"
   And I fill in "Program Name" with "web development 2026"
   And I fill in "Description" with "Case variation duplicate test"
   And I click "Create"
   Then the program creation modal remains open
   And an error message indicates the program name already exists
   And the program list does not contain a second entry for "web development 2026"
   ```

**Expected result:** Case-insensitive duplicate is rejected (Confluence: unique per organization).

**Priority:** Medium  
**Observed (2026-07-06):** **BUG** — lowercase variant is created without error.

---

### TC-012 — Duplicate check applies to trimmed Program Name

**Title:** Surrounding whitespace on a duplicate name does not bypass uniqueness validation

**Preconditions:**
- Admin user account exists
- Admin is logged in
- Program **"Web Development 2026"** already exists in the program list

**Steps:**
1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains "Web Development 2026"
   When I click "+ New Program"
   And I fill in "Program Name" with "  Web Development 2026  "
   And I fill in "Description" with "Whitespace-padded duplicate test"
   And I click "Create"
   Then the program creation modal remains open
   And an error message indicates the program name already exists
   And the program list contains exactly one entry named "Web Development 2026"
   ```

**Expected result:** Name is trimmed before duplicate check; padded duplicate is still rejected.

**Priority:** Medium  
**Observed (2026-07-06):** Likely fails — duplicate prevention not implemented (see TC-005).

---

### TC-013 — Create button state updates when Program Name changes between valid and whitespace-only

**Title:** Create button disables immediately when Program Name becomes whitespace-only after trim

**Preconditions:**
- Admin user account exists
- Admin is logged in
- Program creation form is open

**Steps:**
1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   And I fill in "Program Name" with "Cybersecurity Basics"
   Then the "Create" button is enabled
   When I clear the "Program Name" field
   And I fill in "Program Name" with "   "
   Then the "Create" button is disabled
   And the program creation modal remains open
   ```

**Expected result:** **Create** toggles from enabled to disabled when valid text is replaced with whitespace-only input.

**Priority:** Medium  
**Observed (2026-07-06):** Passes.

---

### TC-014 — New Program modal shows required Program Name label and Cancel control

**Title:** Modal displays required-field indicator and dismiss control

**Preconditions:**
- Admin is logged in on Programs page

**Steps:**
1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   Then the modal shows "Program Name *"
   And the modal shows "Program Name" and "Description" fields
   And the modal shows "Create" and "Cancel" buttons
   ```

**Expected result:** Required label and Cancel are visible; matches Confluence form layout.

**Priority:** Low  
**Observed (2026-07-06):** Passes.

---

### TC-015 — Description field locator must be scoped to modal

**Title:** Description input is uniquely addressable inside the New Program dialog

**Preconditions:**
- Programs list contains rows with Edit/Delete action buttons whose aria-labels include "Description"

**Steps:**
1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page with existing programs
   When I click "+ New Program"
   Then dialog.getByLabel("Description") resolves to exactly one element
   And I can fill the Description field without strict-mode violation
   ```

**Expected result:** Dialog-scoped locator avoids collision with table action buttons.

**Priority:** Medium  
**Discovered from page exploration:** Unscoped `getByLabel('Description')` matches 11+ table buttons.

---

## Coverage Summary

| Acceptance Criteria | Test Case(s) | Live Status |
|---|---|---|
| Reject program name with only whitespace | TC-003, TC-007, TC-013 | Pass |
| Accept program name with special characters | TC-001 | Pass |
| Reject duplicate program name | TC-005, TC-011, TC-012 | **Fail** |

**Total test cases:** 15

- Positive: 2
- Negative: 4
- Edge: 9

**Playwright spec:** `tests/ds3.spec.ts`  
**Evidence:** `test-evidence/DS-3/*.png`

---

## Ambiguities and Gaps in Acceptance Criteria

1. **Whitespace rejection mechanism** — AC says form is “not submitted” after clicking **Create**; live UI disables **Create** before click for whitespace-only input. Both satisfy intent; Confluence Validation Rules confirm button-disabled behavior.

2. **Exact duplicate error message** — AC requires “an error indicating the name already exists” but does not specify wording. Confluence server-side rule expects 400/409 with user-visible error. **Currently no error is shown.**

3. **Case sensitivity for duplicates** — AC uses exact string; Confluence requires uniqueness per organization. TC-011 assumes case-insensitive matching.

4. **Trim behavior on save** — Confluence states name is trimmed on submit. Live exploration suggests padded names may persist — needs confirmation.

5. **Max length limits** — Confluence specifies **100** characters (not 255). TC-009/TC-010 updated accordingly. Live UI does not enforce 100-char limit in the input.

6. **Duplicate scope** — Confluence: unique per organization. Server-side validation documented but not observed in UI.

7. **Locator scoping** — Not in AC but required for automation reliability (TC-015).

---

## Bugs Found (Jira sub-tasks under DS-3)

| Jira | Summary | Test | Line | Evidence |
|---|---|---|---|---|
| [DS-153](https://legionqaschool.atlassian.net/browse/DS-153) | Yaroslav: Duplicate program name is not rejected on create | TC-005 | `tests/ds3.spec.ts:209` | `test-evidence/DS-3/yaroslav-bug-duplicate-name-tc005.png` |
| [DS-151](https://legionqaschool.atlassian.net/browse/DS-151) | Yaroslav: Program name max length (100 chars) not enforced | TC-010 | `tests/ds3.spec.ts:305` | `test-evidence/DS-3/yaroslav-bug-max-length-tc010.png` |
| [DS-154](https://legionqaschool.atlassian.net/browse/DS-154) | Yaroslav: Case-variant duplicate program name is accepted | TC-011 | `tests/ds3.spec.ts:343` | `test-evidence/DS-3/yaroslav-bug-case-duplicate-tc011.png` |
| [DS-152](https://legionqaschool.atlassian.net/browse/DS-152) | Yaroslav: Whitespace-padded duplicate program name is accepted | TC-012 | `tests/ds3.spec.ts:362` | `test-evidence/DS-3/yaroslav-bug-padded-duplicate-tc012.png` |
