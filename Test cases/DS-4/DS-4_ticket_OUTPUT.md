# DS-4 — Test Plan: Delete Program with Confirmation

**Feature:** Delete program with confirmation  
**Role:** Admin  
**Scope:** Program row delete action on the Programs page (delete icon → confirmation dialog)

---

## Positive Flows

### TC-001 — Confirmed deletion removes program from the list

**Title:** Program is permanently removed from the program list after the user confirms deletion in the dialog

**Preconditions:**

- Admin user account exists (e.g. `admin@example.com`)
- Admin is logged in
- Program **"Test Program"** exists with **Program Name** `"Test Program"` and **Description** `"Sample program for deletion testing"` (seeded via API, fixture, or direct DB setup — not dependent on another test case)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains "Test Program"
   When I click the delete icon on "Test Program"
   Then I see a confirmation dialog
   And the confirmation dialog displays "Test Program"
   When I click "Delete" in the confirmation dialog
   Then the confirmation dialog closes
   And the Programs page program list does not display "Test Program"
   ```

**Expected result:** Confirmation dialog appears before removal; after clicking **Delete**, the dialog closes and **"Test Program"** no longer appears in the program list.

**Priority:** High

**Maps to AC:** Delete program with confirmation

---

### TC-002 — Cancel on confirmation dialog preserves the program in the list

**Title:** Program remains in the list when the user cancels deletion from the confirmation dialog

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Web Development 2026"** exists with **Program Name** `"Web Development 2026"` and **Description** `"Full-stack web development program"` (seeded independently)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains "Web Development 2026"
   When I click the delete icon on "Web Development 2026"
   Then I see a confirmation dialog
   When I click "Cancel" in the confirmation dialog
   Then the confirmation dialog closes
   And the Programs page program list still displays "Web Development 2026"
   ```

**Expected result:** Dialog closes on **Cancel**; **"Web Development 2026"** remains visible and unchanged in the program list.

**Priority:** High

**Maps to AC:** Cancel program deletion

---

## Negative Flows

### TC-003 — Delete icon does not remove the program before confirmation

**Title:** Clicking the delete icon alone does not remove the program from the list

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Data Science Fundamentals"** exists with **Program Name** `"Data Science Fundamentals"` and **Description** `"Introductory data science curriculum"` (seeded independently)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains "Data Science Fundamentals"
   When I click the delete icon on "Data Science Fundamentals"
   Then I see a confirmation dialog
   And the Programs page program list still displays "Data Science Fundamentals"
   And no success toast or deletion confirmation message is shown
   ```

**Expected result:** Program is not deleted on delete-icon click alone; it remains in the list until explicit confirmation.

**Priority:** High

---

### TC-004 — Non-admin user cannot delete a program

**Title:** Delete action is unavailable or blocked for users without admin role

**Preconditions:**

- Non-admin user account exists (e.g. `teacher@example.com`)
- Non-admin user is logged in
- Program **"Cloud Computing Basics"** exists in the system (seeded independently)

**Steps:**

1. ```gherkin
   Given I am logged in as a non-admin user
   And I navigate to the Programs page
   And the program list contains "Cloud Computing Basics"
   Then the delete icon is not visible on "Cloud Computing Basics"
   Or the delete action is disabled with an authorization message
   And "Cloud Computing Basics" remains in the program list
   ```

**Expected result:** Non-admin cannot initiate program deletion via the UI; the program remains in the list.

**Priority:** High

---

### TC-005 — Failed server-side deletion keeps the program in the list

**Title:** Program remains listed and an error is shown when the delete request fails on the server

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Mobile App Development"** exists (seeded independently)
- Server delete endpoint is configured to return an error for this test (e.g. simulated 500 or dependency conflict)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains "Mobile App Development"
   And the delete API will return an error for "Mobile App Development"
   When I click the delete icon on "Mobile App Development"
   And I click "Delete" in the confirmation dialog
   Then I see an error message indicating the program could not be deleted
   And the Programs page program list still displays "Mobile App Development"
   ```

**Expected result:** On server failure, the program is not removed from the list; user receives a clear error message.

**Priority:** Medium

---

## Edge Cases

### TC-006 — Program with special characters in name is deleted after confirmation

**Title:** Program whose name contains ampersands, hyphens, and accented characters is removed correctly after confirmed deletion

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Informatique & IA - Niveau 2"** exists with **Program Name** `"Informatique & IA - Niveau 2"` and **Description** `"Advanced informatics and AI track"` (seeded independently)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains "Informatique & IA - Niveau 2"
   When I click the delete icon on "Informatique & IA - Niveau 2"
   Then I see a confirmation dialog
   And the confirmation dialog displays "Informatique & IA - Niveau 2"
   When I click "Delete" in the confirmation dialog
   Then the confirmation dialog closes
   And the Programs page program list does not display "Informatique & IA - Niveau 2"
   ```

**Expected result:** Special characters in the program name are displayed correctly in the dialog and the program is removed without UI or encoding errors.

**Priority:** Medium

---

### TC-007 — Only the targeted program is removed when multiple programs exist

**Title:** Deleting one program does not affect other programs in the list

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Programs **"Test Program"**, **"Test Program Advanced"**, and **"Test Program Basics"** all exist (seeded independently)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains "Test Program"
   And the program list contains "Test Program Advanced"
   And the program list contains "Test Program Basics"
   When I click the delete icon on "Test Program"
   And I click "Delete" in the confirmation dialog
   Then the Programs page program list does not display "Test Program"
   And the Programs page program list still displays "Test Program Advanced"
   And the Programs page program list still displays "Test Program Basics"
   ```

**Expected result:** Only the selected program is deleted; similarly named programs remain untouched.

**Priority:** High

---

### TC-008 — Deleting the sole program shows an empty program list state

**Title:** Programs page displays an appropriate empty state after the last program is deleted

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Standalone Program"** is the only program in the system (seeded independently; no other programs exist)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains exactly one program named "Standalone Program"
   When I click the delete icon on "Standalone Program"
   And I click "Delete" in the confirmation dialog
   Then the confirmation dialog closes
   And the Programs page program list does not display "Standalone Program"
   And the Programs page displays an empty state message for the program list
   And the "+ New Program" button remains visible and enabled
   ```

**Expected result:** After deleting the last program, the list is empty with a clear empty-state message; **+ New Program** remains available.

**Priority:** Medium

---

### TC-009 — Dismissing the confirmation dialog without confirming preserves the program

**Title:** Program remains in the list when the confirmation dialog is dismissed without clicking Delete

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Cybersecurity Essentials"** exists (seeded independently)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains "Cybersecurity Essentials"
   When I click the delete icon on "Cybersecurity Essentials"
   Then I see a confirmation dialog
   When I press the Escape key
   Then the confirmation dialog closes
   And the Programs page program list still displays "Cybersecurity Essentials"
   When I click the delete icon on "Cybersecurity Essentials" again
   And I click outside the confirmation dialog on the backdrop
   Then the confirmation dialog closes
   And the Programs page program list still displays "Cybersecurity Essentials"
   ```

**Expected result:** Dismissing via **Escape** or backdrop click does not delete the program; same outcome as **Cancel**.

**Priority:** Medium

---

### TC-010 — Program with maximum-length name is deleted after confirmation

**Title:** Program whose name is at the maximum allowed length (255 characters) is removed successfully after confirmed deletion

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program exists with **Program Name** set to a 255-character string: `"Advanced Web Development and Cloud Architecture Certification Program Track Level Nine Extended Curriculum Design Specialization Module for Professional Engineers and Software Architects in Modern Enterprise Environments Including DevOps Security Scalability Microservices Containerization and Continuous Integration Delivery Pipelines Edition 2026 Final Version Release Candidate Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda Mu Nu Xi Omicron Pi Rho Sigma Tau Upsilon Phi Chi Psi Omega End"` (seeded independently)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains the 255-character program name
   When I click the delete icon on that program row
   Then I see a confirmation dialog
   And the confirmation dialog references the program being deleted
   When I click "Delete" in the confirmation dialog
   Then the confirmation dialog closes
   And the Programs page program list does not display that program
   ```

**Expected result:** Max-length program name is handled correctly in both the dialog and deletion; no truncation or layout breakage prevents successful deletion.

**Priority:** Low

---

## Coverage Summary

| Acceptance Criteria | Test Case(s) |
|---|---|
| Delete program with confirmation | TC-001, TC-003, TC-007 |
| Cancel program deletion | TC-002, TC-009 |

**Total test cases:** 10

- Positive: 2
- Negative: 3
- Edge: 5

---

## Ambiguities and Gaps in Acceptance Criteria

1. **Confirmation dialog content** — AC requires that a confirmation dialog appears but does not specify title, body text, whether the program name is shown, or warning language (e.g. “This action cannot be undone”).

2. **Confirm button label** — AC says “I confirm deletion” but does not define the button text (**Delete**, **Confirm**, **Yes**, etc.).

3. **Hard delete vs soft delete** — AC states the program is “removed from the program list” but does not clarify whether deletion is permanent, soft-deleted (recoverable), or hidden from UI only.

4. **Programs with dependencies** — No AC for programs linked to courses, enrollments, or other entities. Behavior when deletion is blocked by dependencies is undefined (TC-005 assumes an error is shown).

5. **Success feedback** — AC covers list removal only. No specification for toast, snackbar, or inline success message after confirmed deletion.

6. **Delete icon placement** — AC references a delete icon but does not state whether it appears per row alongside the edit icon or inside an overflow/actions menu (noted as a gap in DS-2).

7. **Non-admin access** — AC assumes delete is available but does not define behavior for non-admin users (TC-004 assumes icon hidden or action blocked).

8. **Dialog dismissal methods** — AC covers **Cancel** only. Behavior for **Escape**, backdrop click, or browser back navigation is unspecified (TC-009).

9. **Keyboard accessibility** — No AC for keyboard navigation (Tab focus order, Enter to confirm, Escape to cancel) or screen-reader announcements.

10. **Concurrent deletion** — Two admins deleting the same program simultaneously is not addressed; expected behavior for the second request is undefined.

11. **Pagination and search** — AC does not state whether deletion updates a paginated or filtered list correctly when the deleted program is not on the current page or matches an active search filter.

12. **Test data setup** — AC assumes a program exists but does not define isolated test setup (API seed vs UI create); independence requires explicit seeding strategy.

13. **Max-length program name** — No AC limit is specified for program name length; TC-010 assumes **255 characters** based on related program features — replace with actual spec limit.

14. **Undo / recovery** — No AC for undo after accidental deletion or admin restore of deleted programs.

15. **Audit trail** — AC does not require logging who deleted a program or when; relevant for compliance testing but out of scope per AC.
