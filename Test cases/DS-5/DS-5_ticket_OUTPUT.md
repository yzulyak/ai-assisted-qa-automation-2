# DS-5 — Test Plan: Program List Filtering and Display

**Feature:** Program list filtering and display  
**Role:** Admin  
**Scope:** Programs page — program list rendering, key field display, and empty state

---

## Positive Flows

### TC-001 — Each program in the list displays its name and description

**Title:** Program list shows **Program Name** and **Description** for every seeded program when programs exist in the system

**Preconditions:**

- Admin user account exists (e.g. `admin@example.com`)
- Admin is logged in
- The following programs exist (seeded via API, fixture, or direct DB setup — not dependent on another test case):
  - **"Web Development 2026"** with **Description** `"Full-stack web development program"`
  - **"Data Science Fundamentals"** with **Description** `"Introductory data science curriculum"`
  - **"Cloud Computing 2026"** with **Description** `"Intro to cloud platforms and services"`

**Steps:**

1. ```gherkin
   Given programs exist in the system
   And I am logged in as admin
   When I navigate to the Programs page
   Then I see a program list
   And the program list displays "Web Development 2026"
   And the program list displays "Full-stack web development program" for "Web Development 2026"
   And the program list displays "Data Science Fundamentals"
   And the program list displays "Introductory data science curriculum" for "Data Science Fundamentals"
   And the program list displays "Cloud Computing 2026"
   And the program list displays "Intro to cloud platforms and services" for "Cloud Computing 2026"
   And the program list contains exactly 3 programs
   ```

**Expected result:** Each program row (or card) shows its **Program Name** and **Description**; all three seeded programs are visible with correct, paired values.

**Priority:** High

**Maps to AC:** Display program list with key details

---

### TC-002 — Empty state message and create prompt are shown when no programs exist

**Title:** Programs page shows a no-programs message and a prompt to create the first program when the system has zero programs

**Preconditions:**

- Admin user account exists
- Admin is logged in
- No programs exist in the system (database/fixture cleared or isolated empty tenant — not dependent on another test case)

**Steps:**

1. ```gherkin
   Given no programs exist in the system
   And I am logged in as admin
   When I navigate to the Programs page
   Then I do not see any program rows in the program list
   And I see a message indicating no programs have been created
   And I see a prompt to create the first program
   And the "+ New Program" button is visible and enabled
   ```

**Expected result:** Empty state is shown instead of a program list; message clearly states no programs exist; **+ New Program** serves as the create-first-program prompt and is actionable.

**Priority:** High

**Maps to AC:** Empty state when no programs exist

---

## Negative Flows

### TC-003 — Empty state is not shown when programs exist

**Title:** Program list is displayed and the no-programs empty state is hidden when at least one program exists

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Cybersecurity Essentials"** exists with **Program Name** `"Cybersecurity Essentials"` and **Description** `"Foundational cybersecurity training"` (seeded independently)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And program "Cybersecurity Essentials" exists in the system
   When I navigate to the Programs page
   Then I see a program list
   And the program list displays "Cybersecurity Essentials"
   And I do not see a message indicating no programs have been created
   And I do not see an empty-state prompt to create the first program
   ```

**Expected result:** With data present, the list renders normally; empty-state messaging and first-program prompt are absent.

**Priority:** High

---

### TC-004 — Non-admin user cannot view the admin program list

**Title:** Program list is unavailable or access is denied for users without admin role

**Preconditions:**

- Non-admin user account exists (e.g. `teacher@example.com`)
- Non-admin user is logged in
- Program **"Mobile App Development"** exists in the system (seeded independently)

**Steps:**

1. ```gherkin
   Given I am logged in as a non-admin user
   And program "Mobile App Development" exists in the system
   When I navigate to the Programs page
   Then I do not see the admin program list with "Mobile App Development"
   Or I see an unauthorized or access-denied message
   And the "+ New Program" button is not available
   ```

**Expected result:** Non-admin cannot view or interact with the admin program list as defined for this feature.

**Priority:** High

---

### TC-005 — Server error on load does not display the empty state

**Title:** A failed program-list fetch shows an error state instead of the no-programs empty state

**Preconditions:**

- Admin user account exists
- Admin is logged in
- At least one program exists in the system (seeded independently)
- The programs list API is configured to return an error for this test (e.g. simulated 500)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And programs exist in the system
   And the programs list API will return an error
   When I navigate to the Programs page
   Then I see an error message indicating the program list could not be loaded
   And I do not see a message indicating no programs have been created
   And I do not see program rows with stale or fabricated data
   ```

**Expected result:** Load failure is distinguished from a genuine empty dataset; user is not misled into thinking no programs exist.

**Priority:** Medium

---

### TC-006 — Program list does not display unrelated or internal fields

**Title:** Program list rows show only name and description, not internal identifiers or metadata

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Test Program"** exists with **Program Name** `"Test Program"`, **Description** `"Sample program for list display testing"`, and a known internal ID (seeded independently)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And program "Test Program" exists in the system
   When I navigate to the Programs page
   Then the program list displays "Test Program"
   And the program list displays "Sample program for list display testing"
   And the program list does not display the program's internal database ID
   And the program list does not display created-at or updated-at timestamps
   Unless those fields are explicitly part of the program list design
   ```

**Expected result:** List exposes the key details defined in AC (**name**, **description**) without leaking unintended internal fields.

**Priority:** Medium

---

## Edge Cases

### TC-007 — Special characters in name and description render correctly in the list

**Title:** Program names and descriptions containing ampersands, hyphens, accents, and punctuation display without encoding or layout errors

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Informatique & IA - Niveau 2"** exists with **Program Name** `"Informatique & IA - Niveau 2"` and **Description** `"Parcours avancé — IA & data (2026)"` (seeded independently)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And program "Informatique & IA - Niveau 2" exists in the system
   When I navigate to the Programs page
   Then the program list displays "Informatique & IA - Niveau 2"
   And the program list displays "Parcours avancé — IA & data (2026)" for "Informatique & IA - Niveau 2"
   And the characters "&", "-", "—", and "é" render correctly without HTML entities or broken layout
   ```

**Expected result:** Special characters are displayed literally and readably; no XSS rendering or mojibake.

**Priority:** Medium

---

### TC-008 — Maximum-length program name displays correctly in the list

**Title:** A program whose name is at the maximum allowed length (255 characters) is fully visible or gracefully truncated in the list

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program exists with **Program Name** set to a 255-character string: `"Advanced Web Development and Cloud Architecture Certification Program Track Level Nine Extended Curriculum Design Specialization Module for Professional Engineers and Software Architects in Modern Enterprise Environments Including DevOps Security Scalability Microservices Containerization and Continuous Integration Delivery Pipelines Edition 2026 Final Version Release Candidate Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda Mu Nu Xi Omicron Pi Rho Sigma Tau Upsilon Phi Chi Psi Omega End"` and **Description** `"Max-length name display test"` (seeded independently)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And a program with a 255-character name exists in the system
   When I navigate to the Programs page
   Then the program list displays the 255-character program name
   And the program list displays "Max-length name display test" for that program
   And the program list row does not break the page layout
   And the full name is accessible via tooltip or expand if truncated in the UI
   ```

**Expected result:** Max-length name is handled without overflow breakage; description remains paired with the correct row.

**Priority:** Low

---

### TC-009 — Program with empty description still appears in the list with its name

**Title:** A program with an empty **Description** is listed with its name and an appropriate empty-description presentation

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Standalone Certificate"** exists with **Program Name** `"Standalone Certificate"` and **Description** `""` (empty string, seeded independently)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And program "Standalone Certificate" exists with an empty Description
   When I navigate to the Programs page
   Then the program list displays "Standalone Certificate"
   And the Description area for "Standalone Certificate" is empty or shows a neutral placeholder such as "—" or "No description"
   And the program list does not hide the row because Description is empty
   ```

**Expected result:** Name-only programs still appear; empty description is handled consistently, not as missing data or a broken row.

**Priority:** Medium

---

### TC-010 — Long description displays without breaking list layout

**Title:** A program with a lengthy description is shown in the list without corrupting row alignment or hiding the program name

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Technical Writing Workshop"** exists with **Program Name** `"Technical Writing Workshop"` and **Description** set to a 500-character paragraph describing curriculum scope, prerequisites, delivery format, assessment methods, and certification outcomes (seeded independently)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And program "Technical Writing Workshop" exists with a 500-character Description
   When I navigate to the Programs page
   Then the program list displays "Technical Writing Workshop"
   And the Description for "Technical Writing Workshop" is visible or truncated with ellipsis
   And the program name remains visible and aligned with its description
   And no horizontal scrollbar or overlapping text breaks the list layout
   ```

**Expected result:** Long descriptions wrap or truncate gracefully; **Program Name** remains readable and associated with the correct row.

**Priority:** Low

---

### TC-011 — Multiple programs with similar names are displayed as distinct list entries

**Title:** Programs sharing a name prefix appear as separate rows with their own descriptions

**Preconditions:**

- Admin user account exists
- Admin is logged in
- The following programs exist (seeded independently):
  - **"Test Program"** with **Description** `"Baseline test program"`
  - **"Test Program Advanced"** with **Description** `"Advanced test program track"`
  - **"Test Program Basics"** with **Description** `"Introductory test program track"`

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And programs "Test Program", "Test Program Advanced", and "Test Program Basics" exist in the system
   When I navigate to the Programs page
   Then the program list displays "Test Program" with "Baseline test program"
   And the program list displays "Test Program Advanced" with "Advanced test program track"
   And the program list displays "Test Program Basics" with "Introductory test program track"
   And the program list contains exactly 3 programs
   ```

**Expected result:** Similar names do not collapse or merge; each program shows the correct name–description pair.

**Priority:** Medium

---

### TC-012 — Page refresh preserves the program list content

**Title:** Program list content remains accurate after a browser refresh on the Programs page

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Programs **"Web Development 2026"** and **"Data Science Fundamentals"** exist (seeded independently)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And programs "Web Development 2026" and "Data Science Fundamentals" exist in the system
   When I navigate to the Programs page
   And I refresh the page
   Then I see a program list
   And the program list displays "Web Development 2026"
   And the program list displays "Data Science Fundamentals"
   And the program list contains exactly 2 programs
   ```

**Expected result:** List is reloaded from the server on refresh; no stale cache or spurious empty state.

**Priority:** Low

---

## Coverage Summary

| Acceptance Criteria | Test Case(s) |
|---|---|
| Display program list with key details | TC-001, TC-003, TC-006, TC-011 |
| Empty state when no programs exist | TC-002, TC-003, TC-005 |

**Total test cases:** 12

- Positive: 2
- Negative: 4
- Edge: 6

---

## Ambiguities and Gaps in Acceptance Criteria

1. **Filtering not specified** — The feature title references *filtering*, but no AC defines search, sort, category filter, or status filter behavior. Scope of "filtering" is undefined; no filter test cases are included.

2. **Exact empty-state copy** — AC requires a message that no programs exist and a create prompt, but does not define exact wording, iconography, or whether the prompt is inline text, a button label (**+ New Program**), or a separate link.

3. **List layout** — AC does not specify table vs. card layout, column headers (**Program Name**, **Description**), row actions (edit/delete icons from DS-2/DS-4), or responsive/mobile behavior.

4. **Required role** — AC does not state who may view the Programs page; admin-only access is assumed from related tickets (TC-004).

5. **Sort order** — No AC for default ordering (alphabetical, created date, manual). TC-001 does not assert order.

6. **Pagination / virtual scroll** — AC does not define behavior when many programs exist (page size, "load more", infinite scroll).

7. **Description optional vs. required in list** — AC pairs name and description, but empty-description display rules are unspecified (TC-009 assumes a placeholder or blank is acceptable).

8. **Max field lengths** — No AC limit for name or description length in the list view; TC-008 assumes **255 characters** for name based on related program features.

9. **Loading state** — AC covers populated and empty states only; spinner/skeleton behavior while fetching is undefined (TC-005 covers error only).

10. **Soft-deleted or hidden programs** — AC does not clarify whether archived, draft, or soft-deleted programs appear in the list.

11. **Accessibility** — No AC for screen-reader structure (table semantics, aria labels for empty state, keyboard navigation through list rows).

12. **Internationalization** — Empty-state message localization and RTL layout for special-character program names are not addressed.

13. **Real-time updates** — AC does not state whether the list auto-refreshes when another admin creates or deletes a program while the page is open.

14. **Empty state with pre-existing navigation** — AC does not clarify whether sidebar/header chrome (e.g. **Programs** nav item) differs between empty and populated states beyond the list area itself.
