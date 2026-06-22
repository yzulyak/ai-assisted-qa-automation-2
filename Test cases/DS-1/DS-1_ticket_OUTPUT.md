# DS-1 — Test Plan: Create New Academic Program

**Feature:** Create new academic program  
**Role:** Admin  
**Scope:** Program creation modal from the Programs page

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
- Max length for Program Name is known (assume **255 characters** if unspecified)
- A 255-character unique name is prepared (e.g. `"A" * 255`)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   And I fill in "Program Name" with a 255-character string
   And I fill in "Description" with "Max length boundary test"
   And I click "Create"
   Then the program creation modal closes
   And the Programs page program list displays the full 255-character program name
   ```

**Expected result:** Max-length name saved and displayed without truncation.

**Priority:** Medium

---

### TC-014 — Program Name exceeding maximum length is rejected or truncated

**Title:** Program Name longer than max length cannot be saved as invalid data

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Max length for Program Name is known (assume **255 characters**)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   And I fill in "Program Name" with a 256-character string
   And I fill in "Description" with "Over max length test"
   Then either the input prevents typing beyond 255 characters
   Or the "Create" button is disabled
   Or an validation error is shown for "Program Name"
   And no program with a 256-character name appears in the program list
   ```

**Expected result:** Over-limit input blocked or rejected; no corrupt entry in list.

**Priority:** Medium

---

### TC-015 — Description at maximum allowed length

**Title:** Long Description within max limit is saved with the program

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Max length for Description is known (assume **2000 characters** if unspecified)
- Program **"Cloud Computing 2026"** does not already exist

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   And I fill in "Program Name" with "Cloud Computing 2026"
   And I fill in "Description" with a 2000-character string
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

## Coverage Summary

| Acceptance Criteria | Test Case(s) |
|---|---|
| Navigate to program creation form | TC-001 |
| Successfully create a program | TC-002 |
| Validation prevents empty program name | TC-003, TC-005, TC-010, TC-017 |

**Total test cases:** 17

- Positive: 4
- Negative: 5
- Edge: 8

---

## Ambiguities and Gaps in Acceptance Criteria

1. **Description required or optional?** AC lists Description on the form but only validates Program Name. TC-004 assumes Description is optional; confirm with product owner.

2. **Max length limits** not specified for Program Name or Description. TC-013–TC-015 assume 255 / 2000 characters; replace with actual limits from spec or UI.

3. **Duplicate name policy** not in AC. TC-009 and TC-016 assume duplicates are blocked; case sensitivity is undefined.

4. **Modal dismiss behavior** not specified (Cancel button, X, Escape, click outside). TC-008 assumes at least one dismiss path exists.

5. **Success feedback** not defined — only "modal closes" and list update. No AC for toast, snackbar, or inline confirmation.

6. **Program list sort/order** after create not specified (top, alphabetical, created date).

7. **Trimming whitespace** in Program Name not specified. TC-010 assumes whitespace-only is invalid; leading/trailing trim on save is unclear.

8. **Role model** beyond "admin" not defined. TC-006 assumes non-admin cannot create; other roles (super-admin, editor) not mentioned.

9. **Direct URL / deep link** to creation form not covered in AC; access control for direct navigation unknown.

10. **Network/server errors** on Create not in AC — no expected behavior for 500, timeout, or offline.

11. **Concurrent creation** (two admins creating same name simultaneously) not addressed.

12. **Field-level validation messages** not specified — AC only states button disabled, not inline error text for empty name.

13. **Description validation** (empty vs max length vs special characters/HTML injection) not in AC.

14. **Accessibility** (keyboard navigation, focus trap in modal, ARIA labels) not mentioned.

15. **Localization** — whether field labels **Program Name** / **Description** are fixed English or i18n keys is unspecified.
