# DS-1 — Test Plan: Create New Academic Program

**Jira:** [DS-1 — Create new academic program](https://legionqaschool.atlassian.net/browse/DS-1)  
**Feature:** Create new academic program  
**Role:** Admin  
**Scope:** Program creation modal from the Programs page  
**Environment:** https://test.didaxis.studio/programs

---

## Jira Acceptance Criteria (DS-1)

**User story:** As an admin user, I want to create a new academic program so that I can begin designing its curriculum structure.

| Scenario | Given | When | Then |
|---|---|---|---|
| Navigate to program creation form | Logged in as admin | Navigate to Programs page and click "+ New Program" | Program creation form with **Program Name** and **Description** |
| Successfully create a program | On program creation form | Fill Name "Web Development 2026", Description "Full-stack web development program", click **Create** | Modal closes; list shows "Web Development 2026" |
| Validation prevents empty program name | On program creation form | Leave Program Name empty | **Create** button is disabled |

---

## Confluence — Architecture Overview (Atlassian MCP evidence)

**Source:** [Architecture Overview](https://legionqaschool.atlassian.net/wiki/spaces/DS/pages/233013249/Architecture+Overview)

Didaxis Studio uses a **three-layer architecture** separating curriculum intent from schedule and student workload:

| Layer | What | Example |
|---|---|---|
| **Layer 1 — Session Templates** | Curriculum structure without dates | Lecture: Introduction to Java |
| **Layer 2 — Scheduled Sessions** | Calendar entries (`source`: MANUAL \| GENERATED \| TEMPLATE; `status`: LOCKED \| PLANNED) | Sep 8 — Java Lecture — Room 301 |
| **Layer 3 — Assignments** | Student deliverables with assigned/due dates and estimated hours | Lab Report due Sep 15 |

**Key invariants:** Calendar is the live data source; MANUAL/LOCKED sessions are immovable; validation debounced at 500ms; generator is deterministic.

**Related Confluence (Program Setup):** [Field Definitions](https://legionqaschool.atlassian.net/wiki/spaces/DS/pages/233078785) — Name max 100 chars (unique per org), Description max 500 chars, Create disabled when name empty, name trimmed on submit.

---

## Observed UI (Playwright MCP — 2026-07-06)

| Element | Locator / value |
|---|---|
| Page heading | `heading[level=2]` → **Programs** |
| Page subtitle | **Manage academic programs and semesters** |
| Action button | `button` → **+ New Program** |
| Program table | `table` with column **Program**; each row shows name + description preview |
| Row actions | **Edit {name}**, **Delete {name}** icon buttons |
| Footer hint | **Select a program to manage semesters** |
| Modal | `dialog[name="New Program"]` |
| Program Name | `getByLabel('Program Name')` — required (`*`), placeholder *e.g. Computer Science BSc* |
| Description | `getByLabel('Description')` — optional, placeholder *Brief description* |
| Sidebar nav | Dashboard, Programs, Calendar, Validation, Scheduler, Export, Settings |
| AI config toggle | `button` → **▸ Show AI Generation Config** / **▾ Hide AI Generation Config** (collapsible section) |
| AI config fields | Total Program Hours (`placeholder: e.g. 900`), Default Session Hours (**4**), Default Exam Hours (**3**), Target Audience, Focus Areas, Sync/Async Ratio slider (default **70% sync / 30% async**) |
| Dismiss controls | **Cancel** button + header **X** close button |
| Submit | **Create** — disabled when Program Name empty |
| Login | `/login` → Email, Password, **Sign In**; success shows **Sign out** |

**Confluence field limits** (Program Setup — Field Definitions): Name max **100** chars, Description max **500** chars, Name unique per organization.

---

## Positive Flows

### TC-001 — Program creation form displays required fields

**Title:** Admin sees Program Name and Description on the creation form after opening "+ New Program"

**Preconditions:**

- Admin user account exists (e.g. `admin@example.com`)
- Admin is logged in
- Programs page is accessible

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   When I navigate to the Programs page
   And I click "+ New Program"
   Then I see the program creation form
   And the form displays the "Program Name" field
   And the form displays the "Description" field
   And the form displays a "Create" button
   ```

**Expected result:** Program creation modal/form is visible with fields **Program Name**, **Description**, and a **Create** button.

**Priority:** High

**Maps to AC:** Navigate to program creation form

---

### TC-002 — Valid program is created and appears in the list

**Title:** New program is saved, modal closes, and program name appears in the list

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Web Development 2026"** does not already exist in the program list

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   And I fill in "Program Name" with "Web Development 2026"
   And I fill in "Description" with "Full-stack web development program"
   And I click "Create"
   Then the program creation modal closes
   And the Programs page program list displays "Web Development 2026"
   ```

**Expected result:** Modal closes; **Web Development 2026** is visible in the program list with no error message.

**Priority:** High

**Maps to AC:** Successfully create a program

---

### TC-003 — Create button is disabled when Program Name is empty

**Title:** Create action is blocked when Program Name is left empty

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
   And I fill in "Description" with "Optional description text"
   Then the "Create" button is disabled
   And I cannot submit the form by clicking "Create"
   ```

**Expected result:** **Create** button is disabled; no program is created; modal remains open.

**Priority:** High

**Maps to AC:** Validation prevents empty program name

---

### TC-004 — Program can be created with Description empty

**Title:** Program is created successfully when only Program Name is provided

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Data Science Fundamentals"** does not already exist

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   And I fill in "Program Name" with "Data Science Fundamentals"
   And I leave the "Description" field empty
   And the "Create" button is enabled
   And I click "Create"
   Then the program creation modal closes
   And the Programs page program list displays "Data Science Fundamentals"
   ```

**Expected result:** Program is created with name only; modal closes; program appears in list.

**Priority:** Medium

**Note:** AC does not specify Description as required; validates optional behavior.

---

## Negative Flows

### TC-005 — Program is not created when submission is attempted with empty Program Name

**Title:** No new program is added to the list when Program Name is empty

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program creation form is open
- Initial program count on Programs page is known (or list is empty)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And I note the current program list entries
   When I click "+ New Program"
   And I leave the "Program Name" field empty
   And I fill in "Description" with "Should not be saved without a name"
   Then the "Create" button is disabled
   And no new program appears in the program list
   And the program creation modal remains open
   ```

**Expected result:** List unchanged; modal stays open; no success toast or confirmation.

**Priority:** High

---

### TC-006 — Non-admin user cannot access program creation

**Title:** Program creation form is not available to non-admin users

**Preconditions:**

- Non-admin user account exists (e.g. `instructor@example.com`)
- Non-admin user is logged in

**Steps:**

1. ```gherkin
   Given I am logged in as a non-admin user
   When I navigate to the Programs page
   Then I do not see the "+ New Program" button
   And I cannot open the program creation form
   ```

**Expected result:** **+ New Program** is hidden or disabled; direct URL access (if applicable) shows unauthorized or redirects.

**Priority:** High

---

### TC-007 — Unauthenticated user cannot create a program

**Title:** Program creation is unavailable when user is not logged in

**Preconditions:**

- User is not logged in (session cleared)

**Steps:**

1. ```gherkin
   Given I am not logged in
   When I attempt to navigate to the Programs page
   Then I am redirected to the login page
   And I do not see the program creation form
   ```

**Expected result:** Login required; no program creation UI accessible.

**Priority:** High

---

### TC-008 — Canceling or closing the modal does not create a program

**Title:** Dismissing the form does not persist partial data

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Cybersecurity Basics"** does not already exist

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   And I fill in "Program Name" with "Cybersecurity Basics"
   And I fill in "Description" with "Intro to security concepts"
   And I close the modal without clicking "Create"
   Then the program creation modal closes
   And the Programs page program list does not display "Cybersecurity Basics"
   ```

**Expected result:** Modal closes via Cancel/X/outside click (whichever is supported); no program created.

**Priority:** Medium

---

### TC-009 — Duplicate program name is rejected

**Title:** System prevents creating a program with a name that already exists

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

**Expected result:** Duplicate rejected with clear error; no second entry with same name.

**Priority:** High

---

## Edge Cases

### TC-010 — Program Name with leading and trailing whitespace is handled consistently

**Title:** Whitespace-only or trimmed Program Name does not create invalid programs

**Preconditions:**

- Admin user account exists
- Admin is logged in

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   And I fill in "Program Name" with "   "
   And I fill in "Description" with "Whitespace name test"
   Then the "Create" button is disabled
   ```

**Expected result:** Whitespace-only name treated as empty; **Create** disabled.

**Priority:** Medium

---

### TC-011 — Program Name accepts special characters

**Title:** Program with special characters in name is created and displayed correctly

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"AI & ML (2026) — Cohort #1"** does not already exist

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   And I fill in "Program Name" with "AI & ML (2026) — Cohort #1"
   And I fill in "Description" with "Covers AI, ML, and data pipelines"
   And I click "Create"
   Then the program creation modal closes
   And the Programs page program list displays "AI & ML (2026) — Cohort #1"
   ```

**Expected result:** Special characters preserved in list; no encoding or truncation errors.

**Priority:** Medium

---

### TC-012 — Program Name at minimum valid length (single character)

**Title:** Single-character Program Name is accepted when non-whitespace

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"X"** does not already exist

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   And I fill in "Program Name" with "X"
   And I fill in "Description" with "Single character name boundary test"
   And I click "Create"
   Then the program creation modal closes
   And the Programs page program list displays "X"
   ```

**Expected result:** Single-character name accepted and displayed.

**Priority:** Low

---

### TC-013 — Program Name at maximum allowed length

**Title:** Program Name at documented max length is accepted

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Max length for Program Name is known (assume **100 characters** per Confluence Field Definitions)
- A 100-character unique name is prepared (e.g. `"A" * 100`)

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

**Expected result:** Max-length name saved and displayed without truncation.

**Priority:** Medium

---

### TC-014 — Program Name exceeding maximum length is rejected or truncated

**Title:** Program Name longer than max length cannot be saved as invalid data

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Max length for Program Name is known (assume **100 characters**)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   And I fill in "Program Name" with a 101-character string
   And I fill in "Description" with "Over max length test"
   Then either the input prevents typing beyond 100 characters
   Or the "Create" button is disabled
   Or an validation error is shown for "Program Name"
   And no program with a 101-character name appears in the program list
   ```

**Expected result:** Over-limit input blocked or rejected; no corrupt entry in list.

**Priority:** Medium

---

### TC-015 — Description at maximum allowed length

**Title:** Long Description within max limit is saved with the program

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Max length for Description is known (assume **500 characters** per Confluence Field Definitions)
- Program **"Cloud Computing 2026"** does not already exist

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   And I fill in "Program Name" with "Cloud Computing 2026"
   And I fill in "Description" with a 500-character string
   And I click "Create"
   Then the program creation modal closes
   And the Programs page program list displays "Cloud Computing 2026"
   ```

**Expected result:** Program created; full description persisted (verify on detail/edit view if available).

**Priority:** Low

---

### TC-016 — Duplicate program name is case-insensitive (if applicable)

**Title:** Program names differing only by letter case are treated as duplicates

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Web Development 2026"** already exists

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

**Expected result:** Case-insensitive duplicate rejected (or accepted if product defines case-sensitive names — see ambiguities).

**Priority:** Medium

---

### TC-017 — Create button enables when Program Name becomes non-empty

**Title:** Create button state updates dynamically as Program Name is filled

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
   Then the "Create" button is disabled
   When I fill in "Program Name" with "Mobile App Development"
   Then the "Create" button is enabled
   When I clear the "Program Name" field
   Then the "Create" button is disabled again
   ```

**Expected result:** **Create** toggles enabled/disabled in real time based on Program Name content.

**Priority:** Medium

---

### TC-018 — Programs page displays heading, subtitle, and program table

**Title:** Programs list page renders core layout elements

**Preconditions:**

- Admin user account exists
- Admin is logged in

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   When I navigate to the Programs page
   Then I see the heading "Programs"
   And I see the subtitle "Manage academic programs and semesters"
   And I see a program table with column "Program"
   And I see the hint "Select a program to manage semesters"
   ```

**Expected result:** Page shell matches Confluence Program Setup — UI Behavior layout.

**Priority:** Medium

**Maps to AC:** Navigate to program creation form (page context)

---

### TC-019 — New Program modal exposes AI generation defaults

**Title:** Creation modal includes optional AI curriculum configuration with documented defaults

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program creation form is open

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   Then I see "Total Program Hours"
   And I see "Default Session Hours" with default value "4"
   And I see "Default Exam Hours" with default value "3"
   And I see "Target Audience"
   And I see "Focus Areas"
   And I see "Sync/Async Ratio"
   ```

**Expected result:** AI generation fields visible with Confluence defaults (session 4h, exam 3h).

**Priority:** Low

**Note:** Not in DS-1 AC; discovered during MCP page exploration.

---

### TC-020 — Description exceeding maximum length is rejected

**Title:** Program Description longer than 500 characters cannot be saved

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Max Description length is 500 characters (Confluence)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   And I fill in "Program Name" with a unique valid name
   And I fill in "Description" with a 501-character string
   And I click "Create"
   Then the program creation modal remains open
   And no new program appears in the program list
   ```

**Expected result:** Over-limit description rejected per Confluence validation rules.

**Priority:** High

---

### TC-021 — Double-clicking Create creates exactly one program

**Title:** Single user action on Create produces one program entry

**Preconditions:**

- Admin user account exists
- Admin is logged in

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   And I fill in "Program Name" with a unique name
   And I fill in "Description" with any text
   And I double-click "Create"
   Then the modal closes
   And the program list contains exactly one row for that program name
   ```

**Expected result:** Idempotent create — one program per submission action (DS-1 AC: successfully create a program).

**Priority:** High

**Bug found:** [DS-132](https://legionqaschool.atlassian.net/browse/DS-132) — double-click creates 2 rows (confirmed 2026-07-06).

---

### TC-022 — AI Generation Config section collapses and expands

**Title:** Show/Hide toggle controls visibility of AI Generation Config fields

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program creation form is open

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   Then I see the button "Show AI Generation Config"
   When I click "Show AI Generation Config"
   Then I see the button "Hide AI Generation Config"
   And I see "Total Program Hours"
   When I click "Hide AI Generation Config"
   Then I see the button "Show AI Generation Config"
   ```

**Expected result:** AI config block toggles per Confluence Form Layout (collapsible section).

**Priority:** Low

**Note:** Discovered during MCP exploration 2026-07-06; not in DS-1 AC.

---

## Bugs Logged (Jira sub-tasks of DS-1)

| Key | Title | Test | Status |
|---|---|---|---|
| [DS-145](https://legionqaschool.atlassian.net/browse/DS-145) | Yaroslav - Duplicate program name allowed on create (no rejection) | `tests/ds1.spec.ts` TC-009 (line 270) | Open — **reconfirmed 2026-07-06** |
| [DS-146](https://legionqaschool.atlassian.net/browse/DS-146) | Yaroslav - Case-variant duplicate program name allowed on create | `tests/ds1.spec.ts` TC-016 (line 372) | Open — **reconfirmed 2026-07-06** |
| [DS-132](https://legionqaschool.atlassian.net/browse/DS-132) | Yaroslav - Double-clicking Create submits form twice and creates duplicate programs | `tests/ds1.spec.ts` TC-021 (line 440) | Open — **reconfirmed 2026-07-06** |

**Evidence:**
- `test-evidence/DS-1/yaroslav-bug-duplicate-name-tc009.png`
- `test-evidence/DS-1/yaroslav-bug-case-duplicate-tc016.png`
- `test-evidence/DS-1/yaroslav-bug-double-click-create.png`

**Note:** Duplicate tests use a 1s post-POST settle wait in `expectDuplicateSubmissionRejected` to avoid false passes on a brief error flash before the duplicate row appears.

---

## Coverage Summary

| Acceptance Criteria | Test Case(s) |
|---|---|
| Navigate to program creation form | TC-001, TC-018 |
| Successfully create a program | TC-002, TC-021 (TC-021 fails — bug DS-132) |
| Validation prevents empty program name | TC-003, TC-005, TC-010, TC-017 |

**Total test cases:** 22

- Positive: 4
- Negative: 5
- Edge: 13

---

## Ambiguities and Gaps in Acceptance Criteria

1. **Description required or optional?** AC lists Description on the form but only validates Program Name. TC-004 assumes Description is optional; confirm with product owner.

2. **Max length limits** — Confluence specifies Name **100** / Description **500** characters. TC-013–TC-015 and TC-020 use these values; UI has no HTML `maxlength` attribute.

3. **Duplicate name policy** not in AC but required by Confluence (unique per organization). TC-009 and TC-016 cover exact and case-variant duplicates.

4. **Modal dismiss behavior** — Cancel button and header X confirmed via MCP. TC-008 covers dismiss without save.

5. **Success feedback** not defined — only "modal closes" and list update. No AC for toast, snackbar, or inline confirmation.

6. **Program list sort/order** after create not specified (top, alphabetical, created date).

7. **Trimming whitespace** in Program Name not specified. TC-010 assumes whitespace-only is invalid; leading/trailing trim on save is unclear.

8. **Role model** — Confluence lists Admin, Editor, Viewer; DS-1 AC only mentions admin. TC-006 assumes non-admin cannot create.

9. **AI Generation Config fields** present in modal but not in DS-1 AC (TC-019).

10. **Double-click idempotency** not in AC; TC-021 validates single program per Create action — **fails** (DS-132).

11. **AI config collapsible toggle** (TC-022) present in UI but not in DS-1 AC.

12. **Direct URL / deep link** to creation form not covered in AC.

13. **Network/server errors** on Create not in AC.

14. **Field-level validation messages** not specified — AC only states button disabled, not inline error text.

15. **Accessibility** (keyboard navigation, focus trap, ARIA) not mentioned.

16. **Localization** — field labels appear fixed English in test environment.
