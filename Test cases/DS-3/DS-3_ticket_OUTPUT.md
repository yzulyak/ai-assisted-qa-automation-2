# DS-3 — Test Plan: Program Name Validation and Duplicate Prevention

**Feature:** Program name validation and duplicate prevention  
**Role:** Admin  
**Scope:** Program creation form/modal on the Programs page (`+ New Program`)

---

## Positive Flows

### TC-001 — Program with special characters in name is created successfully

**Title:** Program name containing ampersands, hyphens, and accented characters is accepted and persisted

**Preconditions:**

- Admin user account exists (e.g. `admin@example.com`)
- Admin is logged in
- Program **"Informatique & IA - Niveau 2"** does not already exist in the program list

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

---

### TC-002 — Valid Program Name with leading and trailing whitespace is saved after trim

**Title:** Non-empty name surrounded by whitespace is accepted and stored without outer whitespace

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Data Science Fundamentals"** does not already exist

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

**Expected result:** Leading and trailing whitespace is trimmed before save; program appears under the trimmed name.

**Priority:** Medium

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

---

### TC-006 — Valid unique Program Name does not trigger a duplicate error

**Title:** New program with a unique name is not falsely rejected as a duplicate

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Web Development 2026"** already exists in the program list
- Program **"Mobile App Development 2026"** does not already exist

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
- Program **"X"** does not already exist

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

**Title:** Program Name at the documented maximum length (255 characters) is saved and displayed in full

**Preconditions:**

- Admin user account exists
- Admin is logged in
- A unique 255-character Program Name is prepared (e.g. `"A" * 255`)
- That 255-character name does not already exist

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

**Expected result:** Max-length name is accepted without truncation or validation failure.

**Priority:** Medium

---

### TC-010 — Program Name exceeding maximum length is rejected

**Title:** Program Name longer than the allowed limit cannot be saved

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Maximum Program Name length is known (assume **255 characters** if unspecified)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   When I click "+ New Program"
   And I fill in "Program Name" with a 256-character string
   And I fill in "Description" with "Over max length test"
   Then either the input prevents typing beyond 255 characters
   Or the "Create" button is disabled
   Or a validation error is shown for "Program Name"
   And no program with a 256-character name appears in the program list
   ```

**Expected result:** Over-limit input is blocked or rejected; no invalid program entry is created.

**Priority:** Medium

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

**Expected result:** Case-insensitive duplicate is rejected (verify expected behavior with product owner if names are defined as case-sensitive).

**Priority:** Medium

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

---

## Coverage Summary

| Acceptance Criteria | Test Case(s) |
|---|---|
| Reject program name with only whitespace | TC-003, TC-007, TC-013 |
| Accept program name with special characters | TC-001 |
| Reject duplicate program name | TC-005, TC-011, TC-012 |

**Total test cases:** 13

- Positive: 2
- Negative: 4
- Edge: 7

---

## Ambiguities and Gaps in Acceptance Criteria

1. **Whitespace rejection mechanism** — AC states the form is “not submitted” after clicking **Create**, but TC-003 assumes **Create** is disabled before click. Confirm whether whitespace-only input disables the button, shows an inline error on click, or both.

2. **Exact duplicate error message** — AC requires “an error indicating the name already exists” but does not specify wording, placement (inline vs toast), or whether the error clears when the name is corrected.

3. **Case sensitivity for duplicates** — AC uses exact string **"Web Development 2026"**; TC-011 assumes case-insensitive matching. Product must confirm whether **"WEB DEVELOPMENT 2026"** is a duplicate.

4. **Trim behavior on save** — AC implies trim for whitespace-only rejection, but does not state whether leading/trailing whitespace on otherwise valid names is trimmed before save (TC-002) or preserved.

5. **“Other required fields”** — AC for special characters says to fill other required fields, but only **Program Name** is explicitly validated. **Description** is assumed optional based on related program-creation behavior; confirm with product owner.

6. **Max length limits** — No limit is specified for **Program Name**. TC-009 and TC-010 assume **255 characters**; replace with actual UI/spec limits.

7. **Allowed special characters** — AC validates one example (`&`, `-`, accented letters). It is unclear whether quotes, slashes, HTML/script characters, or emoji are allowed or sanitized.

8. **Duplicate scope** — Unclear whether uniqueness is global, tenant-scoped, or limited to active/non-deleted programs. Soft-deleted program with the same name is not addressed.

9. **Concurrent duplicate creation** — Two admins submitting the same new name simultaneously is not covered; expected behavior (second request error vs race) is undefined.

10. **Server-side vs client-side validation** — AC does not specify whether duplicate and whitespace rules are enforced only in the UI or also via API; bypass via direct API call is not in scope but may matter for security testing.

11. **Program list refresh after failed duplicate** — AC does not define whether the modal retains entered **Description** and corrected **Program Name** after a duplicate error.

12. **Non-admin access** — AC assumes access to the program creation form but does not define behavior if a non-admin reaches the form; validation rules for unauthorized users are unspecified.
