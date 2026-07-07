# DS-2 — Test Plan: Edit Existing Program Details

**Feature:** Edit existing program details  
**Role:** Admin  
**Scope:** Program edit modal from the Programs page (edit icon on a program row)  
**Jira:** [DS-2 — Edit existing program details](https://legionqaschool.atlassian.net/browse/DS-2)  
**Confluence:** [Architecture Overview](https://legionqaschool.atlassian.net/wiki/spaces/DS/pages/233013249/Architecture+Overview), [Program Setup — UI Behavior](https://legionqaschool.atlassian.net/wiki/spaces/DS/pages/233111568/Program+Setup+UI+Behavior), [Program Setup — Field Definitions](https://legionqaschool.atlassian.net/wiki/spaces/DS/pages/233078785/Program+Setup+Field+Definitions), [Program Setup — Validation Rules](https://legionqaschool.atlassian.net/wiki/spaces/DS/pages/233111553/Program+Setup+Validation+Rules)

**MCP page exploration (2026-07-06):** Programs page at `/programs` shows heading **Programs** (h2), subtitle “Manage academic programs and semesters”, **+ New Program** button, table with program name + description preview per row, **Edit {name}** / **Delete {name}** action buttons, and semester panel placeholder “Select a program to manage semesters”. Edit opens dialog **Edit Program** with **Program Name \***, **Description**, collapsible **▸ Show AI Generation Config**, **Cancel**, **Save**, and X close in banner.

---

## Positive Flows

### TC-001 — Edit form displays current program data on open

**Title:** Edit modal opens with Program Name and Description pre-populated from the selected program

**Preconditions:**

- Admin user account exists (e.g. `admin@example.com`)
- Admin is logged in
- Program **"Web Development 2026"** exists with **Program Name** `"Web Development 2026"` and **Description** `"Full-stack web development program"` (seeded via API, fixture, or direct DB setup — not dependent on another test case)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains "Web Development 2026"
   When I click the edit icon on "Web Development 2026"
   Then I see the program edit form
   And the "Program Name" field contains "Web Development 2026"
   And the "Description" field contains "Full-stack web development program"
   And the form displays a "Save" button
   ```

**Expected result:** Edit modal is visible; **Program Name** and **Description** match the program's stored values; **Save** button is present.

**Priority:** High

**Maps to AC:** Open program for editing

---

### TC-002 — Program name update is saved and reflected in the list

**Title:** Renamed program appears in the list immediately after Save and the modal closes

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Web Development 2026"** exists with **Program Name** `"Web Development 2026"` and **Description** `"Full-stack web development program"`
- Program **"Web Development 2026 - Updated"** does not already exist

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains "Web Development 2026"
   When I click the edit icon on "Web Development 2026"
   And I change the "Program Name" field to "Web Development 2026 - Updated"
   And I click "Save"
   Then the program edit modal closes
   And the Programs page program list displays "Web Development 2026 - Updated"
   And the Programs page program list does not display "Web Development 2026"
   ```

**Expected result:** Modal closes; list shows **Web Development 2026 - Updated**; old name no longer appears.

**Priority:** High

**Maps to AC:** Successfully edit a program name

---

### TC-003 — Unchanged fields are preserved when only Description is edited

**Title:** Program Name and other fields remain unchanged when only Description is modified

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Web Development 2026"** exists with **Program Name** `"Web Development 2026"` and **Description** `"Full-stack web development program"`

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains "Web Development 2026"
   When I click the edit icon on "Web Development 2026"
   And I change the "Description" field to "Updated full-stack curriculum for 2026"
   And I leave the "Program Name" field unchanged
   And I click "Save"
   Then the program edit modal closes
   And the Programs page program list displays "Web Development 2026"
   When I click the edit icon on "Web Development 2026"
   Then the "Program Name" field contains "Web Development 2026"
   And the "Description" field contains "Updated full-stack curriculum for 2026"
   ```

**Expected result:** **Program Name** stays **Web Development 2026**; **Description** is updated to the new value; no other fields are altered.

**Priority:** High

**Maps to AC:** Edit preserves unchanged fields

---

### TC-004 — Save succeeds when no field values are changed

**Title:** Saving the edit form without modifications closes the modal and leaves program data unchanged

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Cloud Computing 2026"** exists with **Program Name** `"Cloud Computing 2026"` and **Description** `"Intro to cloud platforms and services"`

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains "Cloud Computing 2026"
   When I click the edit icon on "Cloud Computing 2026"
   And I do not modify any field values
   And I click "Save"
   Then the program edit modal closes
   And the Programs page program list displays "Cloud Computing 2026"
   When I click the edit icon on "Cloud Computing 2026"
   Then the "Program Name" field contains "Cloud Computing 2026"
   And the "Description" field contains "Intro to cloud platforms and services"
   ```

**Expected result:** Save completes without error; program data is identical to before the edit session.

**Priority:** Medium

**Note:** AC does not define no-op save behavior; validates expected UX for unchanged submission.

---

## Negative Flows

### TC-005 — Program is not updated when Program Name is cleared

**Title:** Save is blocked and existing program data remains unchanged when Program Name is empty

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Web Development 2026"** exists with **Program Name** `"Web Development 2026"` and **Description** `"Full-stack web development program"`

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains "Web Development 2026"
   When I click the edit icon on "Web Development 2026"
   And I clear the "Program Name" field
   Then the "Save" button is disabled
   And I cannot submit the form by clicking "Save"
   When I close the edit modal without saving
   And I click the edit icon on "Web Development 2026"
   Then the "Program Name" field contains "Web Development 2026"
   And the "Description" field contains "Full-stack web development program"
   ```

**Expected result:** **Save** is disabled with empty **Program Name**; original program data is unchanged.

**Priority:** High

---

### TC-006 — Dismissing the edit modal does not persist changes

**Title:** Closing the edit form without Save leaves the program list and stored data unchanged

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Cybersecurity Basics"** exists with **Program Name** `"Cybersecurity Basics"` and **Description** `"Intro to security concepts"`

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains "Cybersecurity Basics"
   When I click the edit icon on "Cybersecurity Basics"
   And I change the "Program Name" field to "Cybersecurity Advanced"
   And I change the "Description" field to "Should not be saved"
   And I close the edit modal without clicking "Save"
   Then the program edit modal closes
   And the Programs page program list displays "Cybersecurity Basics"
   And the Programs page program list does not display "Cybersecurity Advanced"
   When I click the edit icon on "Cybersecurity Basics"
   Then the "Program Name" field contains "Cybersecurity Basics"
   And the "Description" field contains "Intro to security concepts"
   ```

**Expected result:** Modal closes via Cancel, X, Escape, or outside click (whichever is supported); no changes persisted.

**Priority:** High

---

### TC-007 — Non-admin user cannot edit a program

**Title:** Edit action is unavailable to non-admin users

**Preconditions:**

- Non-admin user account exists (e.g. `instructor@example.com`)
- Non-admin user is logged in
- Program **"Web Development 2026"** exists in the program list

**Steps:**

1. ```gherkin
   Given I am logged in as a non-admin user
   And I am on the Programs page
   And the program list contains "Web Development 2026"
   Then I do not see an edit icon on "Web Development 2026"
   And I cannot open the program edit form for "Web Development 2026"
   ```

**Expected result:** Edit icon is hidden or disabled; direct URL access (if applicable) shows unauthorized or redirects.

**Priority:** High

---

### TC-008 — Unauthenticated user cannot edit a program

**Title:** Program edit is unavailable when the user is not logged in

**Preconditions:**

- User is not logged in (session cleared)
- Program **"Web Development 2026"** exists in the system

**Steps:**

1. ```gherkin
   Given I am not logged in
   When I attempt to navigate to the Programs page
   Then I am redirected to the login page
   And I do not see the program edit form
   ```

**Expected result:** Login is required; edit UI is not accessible.

**Priority:** High

---

### TC-009 — Renaming a program to an existing name is rejected

**Title:** Duplicate Program Name on edit is blocked and the original program is unchanged

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Web Development 2026"** exists with **Program Name** `"Web Development 2026"` and **Description** `"Full-stack web development program"`
- Program **"Data Science Fundamentals"** exists with **Program Name** `"Data Science Fundamentals"` and **Description** `"Foundations of data science"`

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains "Web Development 2026"
   And the program list contains "Data Science Fundamentals"
   When I click the edit icon on "Web Development 2026"
   And I change the "Program Name" field to "Data Science Fundamentals"
   And I click "Save"
   Then the program edit modal remains open
   And an error message indicates the program name already exists
   And the program list contains "Web Development 2026"
   And the program list contains "Data Science Fundamentals"
   And the program list contains exactly one entry named "Data Science Fundamentals"
   ```

**Expected result:** Duplicate name rejected with a clear error; both programs retain their original names.

**Priority:** High

**Bug found:** [DS-147](https://legionqaschool.atlassian.net/browse/DS-147) — duplicate name allowed on edit, creates second list row (confirmed 2026-07-06).

---

### TC-010 — Failed edit attempt does not create a duplicate program entry

**Title:** Invalid edit submission does not add a new row to the program list

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Mobile App Development"** exists with **Program Name** `"Mobile App Development"` and **Description** `"iOS and Android development"`
- Program **"Web Development 2026"** already exists
- Initial program count on Programs page is known

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And I note the current program list count
   And the program list contains "Mobile App Development"
   When I click the edit icon on "Mobile App Development"
   And I clear the "Program Name" field
   And I attempt to click "Save"
   Then the program edit modal remains open
   And the program list count is unchanged
   And the program list contains exactly one entry named "Mobile App Development"
   ```

**Expected result:** List count unchanged; no duplicate or partial entry created.

**Priority:** Medium

---

## Edge Cases

### TC-011 — Whitespace-only Program Name is treated as invalid on edit

**Title:** Program Name containing only spaces cannot be saved

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Web Development 2026"** exists with **Program Name** `"Web Development 2026"` and **Description** `"Full-stack web development program"`

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click the edit icon on "Web Development 2026"
   And I change the "Program Name" field to "   "
   Then the "Save" button is disabled
   And the program list still displays "Web Development 2026"
   ```

**Expected result:** Whitespace-only name is treated as empty; **Save** disabled; original name preserved.

**Priority:** Medium

---

### TC-012 — Edited Program Name with special characters is saved and displayed correctly

**Title:** Special characters in an edited Program Name are preserved in the list

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Web Development 2026"** exists with **Program Name** `"Web Development 2026"` and **Description** `"Full-stack web development program"`
- Program **"AI & ML (2026) — Cohort #1"** does not already exist

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click the edit icon on "Web Development 2026"
   And I change the "Program Name" field to "AI & ML (2026) — Cohort #1"
   And I click "Save"
   Then the program edit modal closes
   And the Programs page program list displays "AI & ML (2026) — Cohort #1"
   ```

**Expected result:** Special characters preserved; no encoding, truncation, or layout errors.

**Priority:** Medium

---

### TC-013 — Program Name can be edited to a single non-whitespace character

**Title:** Single-character Program Name is accepted on edit

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Temporary Program"** exists with **Program Name** `"Temporary Program"` and **Description** `"Boundary test program"`
- Program **"X"** does not already exist

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click the edit icon on "Temporary Program"
   And I change the "Program Name" field to "X"
   And I click "Save"
   Then the program edit modal closes
   And the Programs page program list displays "X"
   ```

**Expected result:** Single-character name saved and displayed.

**Priority:** Low

---

### TC-014 — Program Name at maximum allowed length is accepted on edit

**Title:** Program Name at documented max length is saved without truncation

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Web Development 2026"** exists with **Program Name** `"Web Development 2026"` and **Description** `"Full-stack web development program"`
- Max length for **Program Name** is **100 characters** (Confluence: Program Setup — Field Definitions)
- A 100-character unique name is prepared

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click the edit icon on "Web Development 2026"
   And I change the "Program Name" field to a 100-character string
   And I click "Save"
   Then the program edit modal closes
   And the Programs page program list displays the full 100-character program name
   ```

**Expected result:** Max-length name saved and displayed without truncation.

**Priority:** Medium

---

### TC-015 — Program Name exceeding maximum length is rejected or blocked on edit

**Title:** Program Name longer than max length cannot be saved

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Web Development 2026"** exists with **Program Name** `"Web Development 2026"` and **Description** `"Full-stack web development program"`
- Max length for **Program Name** is **100 characters** (Confluence)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click the edit icon on "Web Development 2026"
   And I change the "Program Name" field to a 101-character string
   And I click "Save"
   Then either the input prevents typing beyond 100 characters
   Or the "Save" button is disabled
   Or a validation error is shown for "Program Name"
   And the program list still displays "Web Development 2026"
   ```

**Expected result:** Over-limit input blocked or rejected; original program name unchanged.

**Priority:** Medium

**Bug found:** [DS-149](https://legionqaschool.atlassian.net/browse/DS-149) — 101-character name accepted on edit (confirmed 2026-07-06).

---

### TC-016 — Description at maximum allowed length is saved on edit

**Title:** Description at documented max length is persisted when edited

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Cloud Computing 2026"** exists with **Program Name** `"Cloud Computing 2026"` and **Description** `"Intro to cloud platforms"`
- Max length for **Description** is **500 characters** (Confluence: Program Setup — Field Definitions)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click the edit icon on "Cloud Computing 2026"
   And I change the "Description" field to a 500-character string
   And I click "Save"
   Then the program edit modal closes
   When I click the edit icon on "Cloud Computing 2026"
   Then the "Description" field contains the full 500-character string
   ```

**Expected result:** Full description persisted; no truncation on save or reload.

**Priority:** Low

---

### TC-017 — Duplicate Program Name check is case-insensitive on edit (if applicable)

**Title:** Renaming to a name that differs only by letter case is treated as a duplicate

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Web Development 2026"** exists with **Program Name** `"Web Development 2026"`
- Program **"Data Science Fundamentals"** exists with **Program Name** `"Data Science Fundamentals"`

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click the edit icon on "Web Development 2026"
   And I change the "Program Name" field to "data science fundamentals"
   And I click "Save"
   Then the program edit modal remains open
   And an error message indicates the program name already exists
   And the program list still displays "Web Development 2026"
   ```

**Expected result:** Case-insensitive duplicate rejected (or accepted if product defines case-sensitive names — see ambiguities).

**Priority:** Medium

**Bug found:** [DS-148](https://legionqaschool.atlassian.net/browse/DS-148) — case-only variant saved as separate program (confirmed 2026-07-06).

---

### TC-018 — Save button state updates dynamically when Program Name is edited

**Title:** Save button enables and disables in real time based on Program Name content

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Web Development 2026"** exists with **Program Name** `"Web Development 2026"` and **Description** `"Full-stack web development program"`

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click the edit icon on "Web Development 2026"
   Then the "Save" button is enabled
   When I clear the "Program Name" field
   Then the "Save" button is disabled
   When I fill in "Program Name" with "Web Development 2026 - Revised"
   Then the "Save" button is enabled
   When I change the "Program Name" field to "   "
   Then the "Save" button is disabled
   ```

**Expected result:** **Save** toggles enabled/disabled based on valid **Program Name** content.

**Priority:** Medium

---

### TC-019 — Description can be cleared to empty on edit

**Title:** Program is updated successfully when Description is removed and Program Name remains valid

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Data Science Fundamentals"** exists with **Program Name** `"Data Science Fundamentals"` and **Description** `"Foundations of data science"`

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click the edit icon on "Data Science Fundamentals"
   And I clear the "Description" field
   And I leave the "Program Name" field as "Data Science Fundamentals"
   And I click "Save"
   Then the program edit modal closes
   And the Programs page program list displays "Data Science Fundamentals"
   When I click the edit icon on "Data Science Fundamentals"
   Then the "Program Name" field contains "Data Science Fundamentals"
   And the "Description" field is empty
   ```

**Expected result:** Program saved with empty **Description**; **Program Name** unchanged.

**Priority:** Medium

**Note:** AC does not specify whether Description is required on edit; assumes optional (consistent with create feature).

---

### TC-020 — Edit modal exposes AI Generation Config section

**Title:** Edit Program dialog shows AI Generation Config toggle and standard form controls

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Web Development 2026"** exists

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click the edit icon on "Web Development 2026"
   Then I see the "Edit Program" dialog
   And I see "Program Name *"
   And I see "Description"
   And I see a "Show AI Generation Config" toggle
   And I see "Cancel" and "Save" buttons
   ```

**Expected result:** Edit modal matches Confluence UI Behavior — Program Name, Description, collapsible AI config, Cancel/Save, X close.

**Priority:** Low

**Note:** Not in DS-2 AC; discovered during MCP page exploration.

---

### TC-021 — Description exceeding maximum length is rejected on edit

**Title:** Program Description longer than 500 characters cannot be saved on edit

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Max Description length is 500 characters (Confluence)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains "Cloud Computing 2026"
   When I click the edit icon on "Cloud Computing 2026"
   And I change the "Description" field to a 501-character string
   And I click "Save"
   Then the program edit modal remains open
   And the program list still displays "Cloud Computing 2026" unchanged
   ```

**Expected result:** Over-limit description rejected per Confluence validation rules (400 response, error displayed).

**Priority:** High

**Note:** Confluence validation rules apply to edit; not explicitly in DS-2 AC.

**Bug found:** [DS-150](https://legionqaschool.atlassian.net/browse/DS-150) — 501-character description accepted on edit (confirmed 2026-07-06).

---

### TC-022 — Program list updates immediately after successful edit

**Title:** Renamed program appears in list without manual page refresh

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Web Development 2026"** exists

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains "Web Development 2026"
   When I click the edit icon on "Web Development 2026"
   And I change the "Program Name" field to "Web Development 2026 - Updated"
   And I click "Save"
   Then the program edit modal closes
   And without refreshing the page the program list displays "Web Development 2026 - Updated"
   ```

**Expected result:** List re-fetches after mutation per Confluence “List Refresh Behavior (Critical)”.

**Priority:** High

**Maps to AC:** Successfully edit a program name

---

## Coverage Summary

| Acceptance Criteria | Test Case(s) |
|---|---|
| Open program for editing (form pre-populated) | TC-001 |
| Successfully edit a program name | TC-002, TC-022 |
| Edit preserves unchanged fields | TC-003 |

**Total test cases:** 22

- Positive: 4
- Negative: 6
- Edge: 12

---

## Ambiguities and Gaps in Acceptance Criteria

1. **Field label inconsistency:** AC refers to **"Name"** while the create feature uses **Program Name**. Assumed UI label is **Program Name**; confirm with design/spec.

2. **Description required on edit?** AC only exercises changing Description; required/optional status and empty-Description behavior on edit are undefined (TC-019 assumes optional).

3. **Max length limits** — Confluence specifies **100** characters for **Program Name** and **500** for **Description** (TC-014–TC-016, TC-021).

4. **Duplicate name policy on edit** not in AC. TC-009 and TC-017 assume duplicates are blocked; case sensitivity is undefined.

5. **Modal dismiss behavior** not specified (Cancel button, X, Escape, click outside). TC-006 assumes at least one dismiss path exists and none persist changes.

6. **Success feedback** not defined — AC only states modal closes and list update. No AC for toast, snackbar, or inline confirmation after Save.

7. **List update mechanism** not specified — AC says list updates "immediately"; unclear if this is optimistic UI, refetch, or websocket. No AC for loading state during save.

8. **Edit icon affordance** — Confluence and live UI use accessible button **Edit {program name}** per program row (not a generic unnamed icon).

9. **Trimming whitespace** in **Program Name** on save not specified. TC-011 assumes whitespace-only is invalid; leading/trailing trim behavior on save is unclear.

10. **Role model** beyond admin not defined. TC-007 assumes non-admin cannot edit; other roles (super-admin, editor) not mentioned.

11. **Saving with no changes** not in AC. TC-004 validates no-op save; product may prefer disabling Save when nothing changed.

12. **Renaming to the same name** (no actual change) vs duplicate check — AC does not clarify whether Save with identical name should succeed without error.

13. **Network/server errors** on Save not in AC — no expected behavior for 500, timeout, conflict, or offline.

14. **Concurrent edits** (two admins editing the same program) not addressed — last-write-wins, optimistic locking, or conflict message undefined.

15. **Field-level validation messages** not specified — AC does not define inline error text for empty name or duplicate name.

16. **Description validation** (HTML injection, script tags, max length, special characters) not in AC.

17. **Program list display after rename** — AC verifies new name appears; sort order, pagination position, and whether Description is shown in list are unspecified.

18. **Accessibility** (keyboard navigation to edit icon, focus trap in modal, ARIA labels, screen reader announcements on save) not mentioned.

19. **Test data setup** — AC assumes program exists but does not define how programs are created for isolated test execution (API seed vs UI create).

20. **Delete vs edit** — no AC clarifying whether edit and delete actions coexist on the same row or share a menu; scope of "other fields" in preservation AC is limited to Name and Description only.
