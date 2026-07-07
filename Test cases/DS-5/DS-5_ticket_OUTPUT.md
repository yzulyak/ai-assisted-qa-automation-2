# DS-5 — Test Plan: Program List Filtering and Display

**Jira:** [DS-5 — Program list filtering and display](https://legionqaschool.atlassian.net/browse/DS-5)  
**Feature:** Program list filtering and display  
**Role:** Admin  
**Scope:** Programs page — program list rendering, key field display, and empty state  
**Playwright spec:** `tests/ds5.spec.ts`  
**Evidence:** `test-evidence/DS-5/*.png`, `test-evidence/DS-5/exploration-findings.json`

---

## Jira Ticket Summary

**Title:** Program list filtering and display

**User story:** As an admin user, I want to see all programs in a clear list so that I can quickly find and manage them.

**Acceptance Criteria:**

```gherkin
Scenario: Display program list with key details
  Given programs exist in the system
  When I navigate to the Programs page
  Then I see a list showing each program's name and description

Scenario: Empty state when no programs exist
  Given no programs exist
  When I navigate to the Programs page
  Then I see a message indicating no programs have been created
  And I see a prompt to create the first program
```

---

## Confluence — Architecture Overview (MCP Evidence)

**Page:** [Architecture Overview](https://legionqaschool.atlassian.net/wiki/spaces/DS/pages/233013249/Architecture+Overview) (space: DS, page ID: 233013249)

**Summary pulled via Atlassian MCP:**

Didaxis Studio uses a **three-layer architecture** separating curriculum intent from schedule and student workload:

| Layer | What | Example |
|---|---|---|
| **Layer 1 — Session Templates** | Curriculum structure without dates | Lecture: Introduction to Java, Lab: Build REST API |
| **Layer 2 — Scheduled Sessions** | Calendar entries with `source` (MANUAL \| GENERATED \| TEMPLATE) and `status` (LOCKED \| PLANNED) | Sep 8 — Java Lecture — Intro to Java — Room 301 |
| **Layer 3 — Assignments** | Student deliverables with assigned_date, due_date, estimated_hours | Lab Report due Sep 15, 4 hours estimated |

**Key invariants:**
- Calendar is the live data source — changes propagate to hour totals, template status, validation
- MANUAL and LOCKED sessions are immovable anchors — generator cannot move them
- Validation runs after every mutation, debounced at 500ms
- Generator is deterministic — same inputs produce identical schedules

---

## Live Page Exploration (2026-07-06)

Explored `https://test.didaxis.studio/programs` after admin login (credentials from `.env`).

| UI Element | Observed Locator / Value |
|---|---|
| Page heading | `getByRole('heading', { name: 'Programs', level: 2 })` |
| Subtitle | `Manage academic programs and semesters` |
| Helper text | `Select a program to manage semesters` |
| Create button | `getByRole('button', { name: '+ New Program' })` |
| Table | `table tbody` with column header `Program` + actions column |
| Row layout | Program **name** (bold) + **description** (gray, below name) in first column |
| Row actions | `Edit {name}`, `Delete {name}` icon buttons |
| New Program dialog | `role=dialog, name='New Program'` |
| Program Name field | `dialog.getByLabel('Program Name')` (must be dialog-scoped) |
| Description field | `dialog.getByLabel('Description')` (must be dialog-scoped — unscoped matches table action buttons) |
| Empty description | Row shows name only; no `—` / `No description` placeholder |
| Programs on load | 332+ rows (empty-state TC-002 not runnable in shared env) |

**Screenshots:** `test-evidence/DS-5/programs-page.png`, `new-program-modal.png`, `program-created-in-list.png`, `empty-description-row.png`

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

**Title:** A program whose name is at the maximum allowed length (100 characters) is fully visible or gracefully truncated in the list

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program exists with **Program Name** set to a 100-character string: `"Advanced Web Development and Cloud Architecture Certification Program Track Level Nine Extended Curriculum Design Specialization Module for Professional Engineers and Software Architects in Modern Enterprise Environments Including DevOps Security Scalability Microservices Containerization and Continuous Integration Delivery Pipelines Edition 2026 Final Version Release Candidate Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda Mu Nu Xi Omicron Pi Rho Sigma Tau Upsilon Phi Chi Psi Omega End"` (trimmed to 100 chars at runtime) and **Description** `"Max-length name display test"` (seeded independently)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And a program with a 100-character name exists in the system
   When I navigate to the Programs page
   Then the program list displays the 100-character program name
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

### TC-013 — Programs page displays heading, subtitle, and program table

**Title:** Programs page chrome includes heading, subtitle, table header, and helper text

**Preconditions:**
- Admin user account exists
- Admin is logged in

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   When I navigate to the Programs page
   Then I see heading "Programs"
   And I see subtitle "Manage academic programs and semesters"
   And I see table column header "Program"
   And I see helper text "Select a program to manage semesters"
   ```

**Expected result:** Page chrome matches live UI observed during exploration.

**Priority:** Medium  
**Observed (2026-07-06):** Passes.

---

### TC-014 — Program row exposes Edit and Delete action buttons

**Title:** Each program row in the list shows Edit and Delete management actions

**Preconditions:**
- Admin user account exists
- Admin is logged in
- Program **"Action Buttons Program"** exists (created in-test)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And program "Action Buttons Program" exists in the system
   When I navigate to the Programs page
   Then the row for "Action Buttons Program" shows an Edit button
   And the row for "Action Buttons Program" shows a Delete button
   ```

**Expected result:** Row-level management actions are visible for admin users.

**Priority:** Medium  
**Observed (2026-07-06):** Passes.

---

### TC-015 — Description field locator must be scoped to modal

**Title:** Description input is uniquely addressable inside the New Program dialog

**Preconditions:**
- Admin user account exists
- Admin is logged in
- At least one program exists in the list (table action buttons include "Description" in aria-labels)

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

### TC-016 — Malformed programs API response shows error instead of blank list

**Title:** Invalid JSON from the programs list API shows an error state, not raw response text

**Preconditions:**
- Admin user account exists
- Admin is logged in
- The programs list API is configured to return HTTP 200 with body `not-json`

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And the programs list API will return invalid JSON
   When I navigate to the Programs page
   Then I see an error message indicating the program list could not be loaded
   And I do not see a message indicating no programs have been created
   And I do not see the raw API response body rendered on the page
   ```

**Expected result:** Parse/load failure is distinguished from a genuine empty dataset; user is not shown raw response text.

**Priority:** High  
**Observed (2026-07-06):** **Fail** — page renders literal `not-json` with no error UI.

---

## Coverage Summary

| Acceptance Criteria | Test Case(s) | Live Status |
|---|---|---|
| Display program list with key details | TC-001, TC-003, TC-006, TC-011, TC-013, TC-014 | Pass |
| Empty state when no programs exist | TC-002, TC-003, TC-005, TC-016 | TC-002 skipped (shared env has data); TC-005 pass; TC-016 **fail** |

**Total test cases:** 16

- Positive: 2
- Negative: 4
- Edge: 10

**Playwright run (2026-07-06):** 13 passed, 2 skipped, 1 failed (TC-016)

---

## Bugs Logged (Jira sub-tasks of DS-5)

| Jira | Summary | Test | Line | Evidence |
|---|---|---|---|---|
| [DS-157](https://legionqaschool.atlassian.net/browse/DS-157) | Yaroslav: Malformed programs API response renders raw body with no error UI | TC-016 | `tests/ds5.spec.ts:471` | `test-evidence/DS-5/yaroslav-bug-malformed-api-tc016.png` |

---

## Ambiguities and Gaps in Acceptance Criteria

1. **Filtering not specified** — The feature title references *filtering*, but no AC defines search, sort, category filter, or status filter behavior. Scope of "filtering" is undefined; no filter test cases are included.

2. **Exact empty-state copy** — AC requires a message that no programs exist and a create prompt, but does not define exact wording. Live UI uses **+ New Program** as the create prompt.

3. **List layout** — Live UI uses a **table** with a single **Program** column (name + description stacked) and a separate actions column with Edit/Delete icons (TC-014).

4. **Required role** — AC does not state who may view the Programs page; admin-only access is assumed from related tickets (TC-004).

5. **Sort order** — No AC for default ordering (alphabetical, created date, manual). TC-001 does not assert order.

6. **Pagination / virtual scroll** — AC does not define behavior when many programs exist (332+ observed). No pagination or search/filter UI present despite feature title referencing *filtering*.

7. **Description optional vs. required in list** — Live UI shows empty description as blank space below the name (no `—` / `No description` placeholder).

8. **Max field lengths** — Confluence specifies **100** characters for program name. TC-008 updated accordingly.

9. **Loading state** — TC-005 covers HTTP 500; TC-016 covers malformed JSON (fails — DS-157).

10. **Soft-deleted or hidden programs** — AC does not clarify whether archived, draft, or soft-deleted programs appear in the list.

11. **Accessibility** — Live table actions column header is empty (related DS-117). Description locator must be dialog-scoped (TC-015).

12. **Internationalization** — Empty-state message localization and RTL layout for special-character program names are not addressed.

13. **Real-time updates** — AC does not state whether the list auto-refreshes when another admin creates or deletes a program while the page is open.

14. **Empty state with pre-existing navigation** — AC does not clarify whether sidebar/header chrome differs between empty and populated states beyond the list area itself.

15. **API error handling** — Malformed JSON (HTTP 200) renders raw body `not-json` instead of an error state (DS-157).
