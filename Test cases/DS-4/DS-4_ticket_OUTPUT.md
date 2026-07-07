# DS-4 — Test Plan: Delete Program with Confirmation

**Feature:** Delete program with confirmation  
**Role:** Admin  
**Scope:** Program row delete action on the Programs page (delete icon → browser confirmation dialog)  
**Jira:** [DS-4 — Delete program with confirmation](https://legionqaschool.atlassian.net/browse/DS-4)  
**Confluence:** [Architecture Overview](https://legionqaschool.atlassian.net/wiki/spaces/DS/pages/233013249/Architecture+Overview), [Program Setup — UI Behavior](https://legionqaschool.atlassian.net/wiki/spaces/DS/pages/233111568/Program+Setup+UI+Behavior), [Program Setup — Field Definitions](https://legionqaschool.atlassian.net/wiki/spaces/DS/pages/233078785/Program+Setup+Field+Definitions)

**MCP page exploration (2026-07-06):** Programs page at `/programs` shows heading **Programs** (h2), subtitle “Manage academic programs and semesters”, **+ New Program** button, table with program name + description preview per row, **Edit {name}** / **Delete {name}** action buttons (Mantine ActionIcon with `aria-label`), and semester panel placeholder “Select a program to manage semesters”. Delete opens a **native browser `confirm` dialog** (not a custom modal) with message: `Delete program "{name}"? All its semesters and courses will be removed. This cannot be undone.` Cancel/dismiss preserves the program; OK removes it from the list immediately without page refresh.

---

## Jira Ticket Summary

**Title:** Delete program with confirmation

**User story:** As an admin user, I want to delete a program I no longer need, with a confirmation step to prevent accidental deletion.

**Acceptance Criteria:**

```gherkin
Scenario: Delete program with confirmation
  Given a program "Test Program" exists
  When I click the delete icon for "Test Program"
  Then I see a confirmation dialog
  When I confirm deletion
  Then "Test Program" is removed from the program list

Scenario: Cancel program deletion
  Given I click the delete icon for a program
  When I see the confirmation dialog
  And I click Cancel
  Then the program still exists in the list
```

---

## Confluence — Architecture Overview (MCP evidence)

Didaxis Studio uses a **three-layer architecture** separating curriculum intent from schedule and student workload:

| Layer | What | Example |
|---|---|---|
| **Layer 1 — Session Templates** | Curriculum structure without dates | Lecture: Introduction to Java, Lab: Build REST API |
| **Layer 2 — Scheduled Sessions** | Actual calendar entries (`source`: MANUAL \| GENERATED \| TEMPLATE; `status`: LOCKED \| PLANNED) | Sep 8 — Java Lecture — Intro to Java — Room 301 |
| **Layer 3 — Assignments** | Student deliverables with assigned_date, due_date, estimated_hours | Lab Report due Sep 15, 4 hours estimated |

**Key invariants:** Calendar is the live data source; MANUAL and LOCKED sessions are immovable anchors; validation runs after every mutation (debounced 500ms); generator is deterministic.

---

## Positive Flows

### TC-001 — Confirmed deletion removes program from the list

**Title:** Program is permanently removed from the program list after the user confirms deletion in the dialog

**Preconditions:**

- Admin user account exists (e.g. `admin@didaxis.studio`)
- Admin is logged in
- Program exists (seeded via UI create in test — not dependent on another test case)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains "Test Program"
   When I click the delete icon on "Test Program"
   Then I see a native browser confirmation dialog
   And the confirmation dialog displays "Test Program"
   And the confirmation dialog displays "All its semesters and courses will be removed"
   When I click OK in the confirmation dialog
   Then the confirmation dialog closes
   And the Programs page program list does not display "Test Program"
   ```

**Expected result:** Confirmation dialog appears before removal; after clicking **OK**, the dialog closes and the program no longer appears in the program list (list refreshes without manual page reload per Confluence).

**Priority:** High

**Maps to AC:** Delete program with confirmation

---

### TC-002 — Cancel on confirmation dialog preserves the program in the list

**Title:** Program remains in the list when the user cancels deletion from the confirmation dialog

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Web Development 2026"** exists (seeded independently)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains "Web Development 2026"
   When I click the delete icon on "Web Development 2026"
   Then I see a native browser confirmation dialog
   When I click Cancel in the confirmation dialog
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
- Program **"Data Science Fundamentals"** exists (seeded independently)

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

- Non-admin user account exists (requires `DIDAXIS_NON_ADMIN_EMAIL` / `DIDAXIS_NON_ADMIN_PASSWORD` in `.env`)
- Non-admin user is logged in
- Program **"Cloud Computing Basics"** exists in the system (seeded independently)

**Steps:**

1. ```gherkin
   Given I am logged in as a non-admin user
   And I navigate to the Programs page
   And the program list contains "Cloud Computing Basics"
   Then the delete icon is not visible on "Cloud Computing Basics"
   And "Cloud Computing Basics" remains in the program list
   ```

**Expected result:** Non-admin cannot initiate program deletion via the UI; the program remains in the list.

**Priority:** High

**Note:** Skipped in automation when non-admin credentials are not configured.

---

### TC-005 — Failed server-side deletion keeps the program in the list

**Title:** Program remains listed and an error is shown when the delete request fails on the server

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Mobile App Development"** exists (seeded independently)
- Server delete endpoint is configured to return an error for this test (simulated 500)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains "Mobile App Development"
   And the delete API will return an error for "Mobile App Development"
   When I click the delete icon on "Mobile App Development"
   And I click OK in the confirmation dialog
   Then I see an error message indicating the program could not be deleted
   And the Programs page program list still displays "Mobile App Development"
   ```

**Expected result:** On server failure, the program is not removed from the list; user receives a clear error message.

**Priority:** Medium

**Bug found:** [DS-155](https://legionqaschool.atlassian.net/browse/DS-155) — program stays in list (correct) but **no error message is shown** (confirmed 2026-07-06).

---

## Edge Cases

### TC-006 — Program with special characters in name is deleted after confirmation

**Title:** Program whose name contains ampersands, hyphens, and accented characters is removed correctly after confirmed deletion

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program **"Informatique & IA - Niveau 2"** exists (seeded independently)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains "Informatique & IA - Niveau 2"
   When I click the delete icon on "Informatique & IA - Niveau 2"
   Then I see a confirmation dialog
   And the confirmation dialog displays "Informatique & IA - Niveau 2"
   When I click OK in the confirmation dialog
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
   And I click OK in the confirmation dialog
   Then the Programs page program list does not display "Test Program"
   And the Programs page program list still displays "Test Program Advanced"
   And the Programs page program list still displays "Test Program Basics"
   ```

**Expected result:** Only the selected program is deleted; similarly named programs remain untouched.

**Priority:** High

---

### TC-008 — Deleting the sole program shows an empty program list state

**Title:** Programs page displays the Confluence empty state after the last program is deleted

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
   And I click OK in the confirmation dialog
   Then the confirmation dialog closes
   And the Programs page program list does not display "Standalone Program"
   And the Programs page displays "No programs yet. Create your first program to get started."
   And the "Create Program" button remains visible and enabled
   ```

**Expected result:** After deleting the last program, the list is empty with the Confluence empty-state message; **Create Program** button is available (distinct from header **+ New Program**).

**Priority:** Medium

**Note:** Skipped in automation when other programs already exist in the shared test environment.

---

### TC-009 — Cancel via native confirm dismiss preserves the program

**Title:** Program remains in the list when the native browser confirmation dialog is dismissed via Cancel twice

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
   Then I see a native browser confirmation dialog
   When I click Cancel in the confirmation dialog
   Then the confirmation dialog closes
   And the Programs page program list still displays "Cybersecurity Essentials"
   When I click the delete icon on "Cybersecurity Essentials" again
   And I click Cancel in the confirmation dialog again
   Then the Programs page program list still displays "Cybersecurity Essentials"
   ```

**Expected result:** Dismissing via **Cancel** does not delete the program. Note: delete uses a native browser `confirm` dialog — there is no modal backdrop; Escape behavior is browser-dependent and not covered here.

**Priority:** Medium

**Maps to AC:** Cancel program deletion

---

### TC-010 — Program with maximum-length name is deleted after confirmation

**Title:** Program whose name is at the documented maximum length (100 characters) is removed successfully after confirmed deletion

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program exists with **Program Name** at **100 characters** (Confluence Field Definitions max; seeded independently)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains the 100-character program name
   When I click the delete icon on that program row
   Then I see a confirmation dialog
   And the confirmation dialog references the program being deleted
   When I click OK in the confirmation dialog
   Then the confirmation dialog closes
   And the Programs page program list does not display that program
   ```

**Expected result:** Max-length program name is handled correctly in both the dialog and deletion; no truncation or layout breakage prevents successful deletion.

**Priority:** Low

---

### TC-011 — Delete confirmation dialog displays Confluence warning text

**Title:** Native confirm dialog message matches Program Setup — UI Behavior specification

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program exists (seeded independently)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains a program
   When I click the delete icon on that program
   Then I see a native browser confirmation dialog
   And the dialog message is exactly:
     Delete program "{name}"? All its semesters and courses will be removed. This cannot be undone.
   When I click Cancel
   And I click the delete icon again and click OK
   Then the program is removed from the list
   ```

**Expected result:** Dialog text matches Confluence Delete Program Flow specification exactly.

**Priority:** Medium

**Note:** Discovered during MCP exploration 2026-07-06; confirms AC “confirmation dialog” content.

---

### TC-012 — Double-clicking delete icon opens a single confirmation dialog

**Title:** Double-click on the delete action does not trigger multiple confirmation dialogs

**Preconditions:**

- Admin user account exists
- Admin is logged in
- Program exists (seeded independently)

**Steps:**

1. ```gherkin
   Given I am logged in as admin
   And I am on the Programs page
   And the program list contains a program
   When I double-click the delete icon on that program
   Then exactly one confirmation dialog appears
   And the program remains in the list if I cancel
   ```

**Expected result:** Only one confirmation dialog per delete attempt; double-click should not queue multiple dialogs.

**Priority:** Medium

**Bug found:** [DS-156](https://legionqaschool.atlassian.net/browse/DS-156) — double-click opens **two** confirmation dialogs (confirmed 2026-07-06).

---

## Bugs Logged (Jira sub-tasks of DS-4)

| Key | Title | Test | Status |
|---|---|---|---|
| [DS-155](https://legionqaschool.atlassian.net/browse/DS-155) | Yaroslav: No error message shown when program delete API fails | `tests/ds4.spec.ts` TC-005 (line 207) | Open — **confirmed 2026-07-06** |
| [DS-156](https://legionqaschool.atlassian.net/browse/DS-156) | Yaroslav: Double-clicking delete icon opens two confirmation dialogs | `tests/ds4.spec.ts` TC-012 (line 327) | Open — **confirmed 2026-07-06** |

**Evidence:**
- `test-evidence/DS-4/yaroslav-bug-no-error-on-failed-delete-tc005.png`
- `test-evidence/DS-4/yaroslav-bug-double-click-delete-tc012.png`

---

## Coverage Summary

| Acceptance Criteria | Test Case(s) |
|---|---|
| Delete program with confirmation | TC-001, TC-003, TC-007, TC-011 |
| Cancel program deletion | TC-002, TC-009 |

**Total test cases:** 12

- Positive: 2
- Negative: 3
- Edge: 7

**Automation results (2026-07-06):** 8 passed, 2 failed (bugs DS-155, DS-156), 2 skipped (TC-004 non-admin creds, TC-008 sole-program empty state)

---

## Ambiguities and Gaps in Acceptance Criteria

1. **Confirmation dialog type** — AC says “confirmation dialog” but Confluence specifies a **native browser `confirm`** with OK/Cancel (not a custom modal). TC-011 validates exact message text.

2. **Confirm button label** — AC says “I confirm deletion”; live UI uses browser-native **OK** / **Cancel** buttons.

3. **Hard delete vs soft delete** — AC states the program is “removed from the program list”; Confluence confirms permanent removal of semesters and courses (“This cannot be undone”).

4. **Programs with dependencies** — Confluence warning mentions semesters and courses are removed; no AC for blocked deletion when dependencies exist server-side (TC-005 assumes an error is shown).

5. **Success feedback** — AC covers list removal only. No toast or snackbar observed after successful deletion (TC-003 asserts no premature success message).

6. **Delete icon placement** — Live UI uses accessible button **Delete {program name}** per row alongside **Edit {program name}** (Mantine ActionIcon).

7. **Non-admin access** — Confluence: delete visible to ADMIN and EDITOR; TC-004 assumes non-admin has no delete button (requires viewer/non-admin credentials).

8. **Dialog dismissal methods** — AC covers **Cancel** only. Native confirm has no backdrop; Escape is browser-dependent (TC-009 uses Cancel only).

9. **Empty state after last delete** — Confluence specifies exact text and **Create Program** button (TC-008); distinct from header **+ New Program**.

10. **Max-length program name** — Confluence specifies **100 characters** for Program Name (TC-010); not 255.

11. **List refresh** — Confluence requires immediate list update after delete without manual refresh (verified in TC-001).

12. **Server error UX** — TC-005 expected error message not implemented (DS-155).

13. **Double-click guard** — Not in AC; TC-012 found duplicate dialog on double-click (DS-156).
