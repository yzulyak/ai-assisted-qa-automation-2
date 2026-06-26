# TodoMVC — Test Plan

**Application:** [TodoMVC Demo (Playwright)](https://demo.playwright.dev/todomvc/#/)  
**Feature:** Todo list — create, complete, and delete todos  
**Scope:** Main todo list interactions on the default **All** filter view

---

## Positive Flows

### TC-001 — New todo appears in the list after creation

**Title:** A typed todo is added to the list when the user submits the new-todo input

**Preconditions:**

- Browser is open
- No todos exist in the current session (fresh page load)

**Steps:**

1. ```gherkin
   Given I navigate to "https://demo.playwright.dev/todomvc/#/"
   When I type "Buy groceries" into the "What needs to be done?" input
   And I press Enter
   Then the todo list displays an item with label "Buy groceries"
   And the todo item "Buy groceries" is not marked as completed
   And the footer shows "1 item left"
   ```

**Expected result:** **Buy groceries** appears as an active (unchecked) todo; footer count is **1 item left**.

**Priority:** High

**Maps to AC:** User can create new todo and add it to the list

---

### TC-002 — Todo is marked as completed when its checkbox is toggled

**Title:** An active todo shows completed styling after the user checks its toggle

**Preconditions:**

- Browser is open
- No todos exist in the current session (fresh page load)

**Steps:**

1. ```gherkin
   Given I navigate to "https://demo.playwright.dev/todomvc/#/"
   When I type "Walk the dog" into the "What needs to be done?" input
   And I press Enter
   And I click the toggle checkbox for "Walk the dog"
   Then the todo item "Walk the dog" is marked as completed
   And the todo item "Walk the dog" displays completed styling
   And the footer shows "0 items left"
   ```

**Expected result:** **Walk the dog** is checked, visually completed (strikethrough), and the active count is **0 items left**.

**Priority:** High

**Maps to AC:** User can mark todo as completed

---

### TC-003 — Todo is removed from the list when deleted

**Title:** A todo no longer appears in the list after the user deletes it

**Preconditions:**

- Browser is open
- No todos exist in the current session (fresh page load)

**Steps:**

1. ```gherkin
   Given I navigate to "https://demo.playwright.dev/todomvc/#/"
   When I type "Call dentist" into the "What needs to be done?" input
   And I press Enter
   And I delete the todo item "Call dentist"
   Then the todo list does not display "Call dentist"
   And the main todo section footer is not visible
   ```

**Expected result:** **Call dentist** is removed; the list is empty and the footer (item count / filters) is hidden.

**Priority:** High

**Maps to AC:** User can delete todo

---

### TC-004 — Multiple todos can be created independently in one session

**Title:** Each submitted todo is appended to the list without replacing existing items

**Preconditions:**

- Browser is open
- No todos exist in the current session (fresh page load)

**Steps:**

1. ```gherkin
   Given I navigate to "https://demo.playwright.dev/todomvc/#/"
   When I type "Read email" into the "What needs to be done?" input
   And I press Enter
   And I type "Prepare slides" into the "What needs to be done?" input
   And I press Enter
   Then the todo list displays "Read email"
   And the todo list displays "Prepare slides"
   And the footer shows "2 items left"
   ```

**Expected result:** Both **Read email** and **Prepare slides** are visible as separate active todos; footer shows **2 items left**.

**Priority:** Medium

**Maps to AC:** User can create new todo and add it to the list

---

### TC-005 — Completed todo can be toggled back to active

**Title:** A completed todo returns to active state when its checkbox is unchecked

**Preconditions:**

- Browser is open
- No todos exist in the current session (fresh page load)

**Steps:**

1. ```gherkin
   Given I navigate to "https://demo.playwright.dev/todomvc/#/"
   When I type "Water plants" into the "What needs to be done?" input
   And I press Enter
   And I click the toggle checkbox for "Water plants"
   And the todo item "Water plants" is marked as completed
   When I click the toggle checkbox for "Water plants" again
   Then the todo item "Water plants" is not marked as completed
   And the footer shows "1 item left"
   ```

**Expected result:** **Water plants** is unchecked and active again; footer count returns to **1 item left**.

**Priority:** Medium

**Maps to AC:** User can mark todo as completed

---

## Negative Flows

### TC-006 — Empty todo is not added to the list

**Title:** Submitting the new-todo input with no text does not create a list item

**Preconditions:**

- Browser is open
- No todos exist in the current session (fresh page load)

**Steps:**

1. ```gherkin
   Given I navigate to "https://demo.playwright.dev/todomvc/#/"
   When I focus the "What needs to be done?" input
   And I press Enter without typing any text
   Then the todo list is empty
   And the main todo section footer is not visible
   ```

**Expected result:** No todo is created; list remains empty.

**Priority:** High

---

### TC-007 — Whitespace-only todo is not added to the list

**Title:** Submitting only spaces in the new-todo input does not create a list item

**Preconditions:**

- Browser is open
- No todos exist in the current session (fresh page load)

**Steps:**

1. ```gherkin
   Given I navigate to "https://demo.playwright.dev/todomvc/#/"
   When I type "   " into the "What needs to be done?" input
   And I press Enter
   Then the todo list is empty
   And the main todo section footer is not visible
   ```

**Expected result:** No todo is created after submitting whitespace-only input.

**Priority:** High

---

### TC-008 — Deleting one todo does not remove other todos

**Title:** Remaining todos stay in the list when a single item is deleted

**Preconditions:**

- Browser is open
- No todos exist in the current session (fresh page load)

**Steps:**

1. ```gherkin
   Given I navigate to "https://demo.playwright.dev/todomvc/#/"
   When I type "Todo A" into the "What needs to be done?" input
   And I press Enter
   And I type "Todo B" into the "What needs to be done?" input
   And I press Enter
   And I delete the todo item "Todo A"
   Then the todo list does not display "Todo A"
   And the todo list displays "Todo B"
   And the footer shows "1 item left"
   ```

**Expected result:** Only **Todo A** is removed; **Todo B** remains active.

**Priority:** High

**Maps to AC:** User can delete todo

---

### TC-009 — Completing one todo does not mark other todos as completed

**Title:** Only the selected todo changes to completed state

**Preconditions:**

- Browser is open
- No todos exist in the current session (fresh page load)

**Steps:**

1. ```gherkin
   Given I navigate to "https://demo.playwright.dev/todomvc/#/"
   When I type "Pay rent" into the "What needs to be done?" input
   And I press Enter
   And I type "Buy milk" into the "What needs to be done?" input
   And I press Enter
   And I click the toggle checkbox for "Pay rent"
   Then the todo item "Pay rent" is marked as completed
   And the todo item "Buy milk" is not marked as completed
   And the footer shows "1 item left"
   ```

**Expected result:** **Pay rent** is completed; **Buy milk** stays active; active count is **1 item left**.

**Priority:** High

**Maps to AC:** User can mark todo as completed

---

### TC-010 — Deleted todo cannot be interacted with

**Title:** A deleted todo is not available for completion or further deletion

**Preconditions:**

- Browser is open
- No todos exist in the current session (fresh page load)

**Steps:**

1. ```gherkin
   Given I navigate to "https://demo.playwright.dev/todomvc/#/"
   When I type "Temporary task" into the "What needs to be done?" input
   And I press Enter
   And I delete the todo item "Temporary task"
   Then the todo list does not display "Temporary task"
   And there is no toggle checkbox for "Temporary task"
   And there is no delete control for "Temporary task"
   ```

**Expected result:** **Temporary task** is fully removed from the DOM/list with no lingering controls.

**Priority:** Medium

**Maps to AC:** User can delete todo

---

## Edge Cases

### TC-011 — Todo text with special characters is stored and displayed literally

**Title:** Special characters in todo text appear correctly in the list

**Preconditions:**

- Browser is open
- No todos exist in the current session (fresh page load)

**Steps:**

1. ```gherkin
   Given I navigate to "https://demo.playwright.dev/todomvc/#/"
   When I type "Review PR #42 @team & fix \"bug\" <test>" into the "What needs to be done?" input
   And I press Enter
   Then the todo list displays "Review PR #42 @team & fix \"bug\" <test>"
   And the page does not execute injected script from the todo text
   ```

**Expected result:** Todo text is shown as entered; no HTML/script execution from user input.

**Priority:** Medium

---

### TC-012 — Duplicate todo titles are both retained in the list

**Title:** Two todos with the same label can coexist as separate items

**Preconditions:**

- Browser is open
- No todos exist in the current session (fresh page load)

**Steps:**

1. ```gherkin
   Given I navigate to "https://demo.playwright.dev/todomvc/#/"
   When I type "Buy milk" into the "What needs to be done?" input
   And I press Enter
   And I type "Buy milk" into the "What needs to be done?" input
   And I press Enter
   Then the todo list contains 2 items labeled "Buy milk"
   And the footer shows "2 items left"
   ```

**Expected result:** Both **Buy milk** entries exist as separate list items.

**Priority:** Medium

---

### TC-013 — Very long todo text is accepted and displayed

**Title:** A todo with a long description is added without truncation on create

**Preconditions:**

- Browser is open
- No todos exist in the current session (fresh page load)

**Steps:**

1. ```gherkin
   Given I navigate to "https://demo.playwright.dev/todomvc/#/"
   When I type a 500-character string starting with "Long todo:" into the "What needs to be done?" input
   And I press Enter
   Then the todo list displays an item whose label starts with "Long todo:"
   And the displayed label length is at least 500 characters
   ```

**Expected result:** Full long text is stored and visible in the list item label.

**Priority:** Low

---

### TC-014 — Todo with leading and trailing spaces is normalized on save

**Title:** Extra whitespace around todo text is trimmed when the item is created

**Preconditions:**

- Browser is open
- No todos exist in the current session (fresh page load)

**Steps:**

1. ```gherkin
   Given I navigate to "https://demo.playwright.dev/todomvc/#/"
   When I type "  Schedule meeting  " into the "What needs to be done?" input
   And I press Enter
   Then the todo list displays "Schedule meeting"
   And the todo list does not display "  Schedule meeting  "
   ```

**Expected result:** Saved label is **Schedule meeting** without leading/trailing spaces.

**Priority:** Medium

---

### TC-015 — Unicode and emoji characters are preserved in todo text

**Title:** Non-ASCII characters render correctly in the todo label

**Preconditions:**

- Browser is open
- No todos exist in the current session (fresh page load)

**Steps:**

1. ```gherkin
   Given I navigate to "https://demo.playwright.dev/todomvc/#/"
   When I type "Café résumé 🚀 日本語" into the "What needs to be done?" input
   And I press Enter
   Then the todo list displays "Café résumé 🚀 日本語"
   ```

**Expected result:** Unicode and emoji characters appear unchanged in the list.

**Priority:** Low

---

### TC-016 — Deleting the last todo hides the footer and filters

**Title:** UI returns to initial empty state after the final todo is removed

**Preconditions:**

- Browser is open
- No todos exist in the current session (fresh page load)

**Steps:**

1. ```gherkin
   Given I navigate to "https://demo.playwright.dev/todomvc/#/"
   When I type "Only item" into the "What needs to be done?" input
   And I press Enter
   And the footer is visible
   When I delete the todo item "Only item"
   Then the todo list is empty
   And the main todo section footer is not visible
   And the filter links "All", "Active", and "Completed" are not visible
   ```

**Expected result:** App returns to empty-state UI: no list items, no footer, no filters.

**Priority:** Medium

---

### TC-017 — New todo input is cleared after successful creation

**Title:** The input field is empty and ready for the next entry after adding a todo

**Preconditions:**

- Browser is open
- No todos exist in the current session (fresh page load)

**Steps:**

1. ```gherkin
   Given I navigate to "https://demo.playwright.dev/todomvc/#/"
   When I type "First task" into the "What needs to be done?" input
   And I press Enter
   Then the "What needs to be done?" input is empty
   When I type "Second task" into the "What needs to be done?" input
   And I press Enter
   Then the todo list displays "First task"
   And the todo list displays "Second task"
   ```

**Expected result:** Input clears after each successful add; both todos are present.

**Priority:** Low

---

## Coverage Summary

| Acceptance Criteria | Test Case(s) |
|---|---|
| User can create new todo and add it to the list | TC-001, TC-004, TC-017 |
| User can mark todo as completed | TC-002, TC-005, TC-009 |
| User can delete todo | TC-003, TC-008, TC-010, TC-016 |

**Total test cases:** 17

- Positive: 5
- Negative: 5
- Edge: 7

---

## Ambiguities and Gaps in Acceptance Criteria

1. **Typo in AC:** "add it the list" — assumed to mean "add it **to** the list." TC-001 covers this intent.

2. **Delete interaction not specified.** AC says "delete todo" but does not define whether deletion is via the per-item destroy control (×), keyboard shortcut, swipe, or bulk **Clear completed**. TC-003 assumes the standard TodoMVC per-item destroy button.

3. **Completion scope not specified.** AC covers marking complete but not un-completing (toggle back to active), bulk **Toggle all**, or **Clear completed**. TC-005 covers un-complete as related behavior; bulk actions are out of scope unless added to AC.

4. **Filter behavior not in AC.** **All**, **Active**, and **Completed** filters exist in the demo but are not mentioned. TC-016 only asserts filter visibility in empty state.

5. **Edit-in-place not in AC.** TodoMVC supports double-click edit; no AC for renaming an existing todo.

6. **Persistence not defined.** No AC states whether todos survive page refresh, browser restart, or local storage clearing. Tests assume in-session behavior only.

7. **Maximum todo length not specified.** TC-013 uses 500 characters as a boundary probe; actual max (if any) is unknown.

8. **Whitespace handling not specified.** TC-007 and TC-014 assume whitespace-only input is rejected and surrounding spaces are trimmed — confirm against product rules.

9. **Duplicate policy not specified.** TC-012 assumes duplicates are allowed (standard TodoMVC behavior).

10. **Accessibility not mentioned.** Keyboard-only create/complete/delete, focus order, and ARIA labels for toggle/destroy controls are undefined.

11. **Empty vs invalid input feedback not specified.** No AC for inline validation message when submitting empty or whitespace-only todos (TodoMVC typically adds silently).

12. **Concurrent actions not addressed.** Rapid Enter presses, double-delete, or complete-then-delete race conditions are undefined.

13. **Visual completion criteria not explicit.** AC says "mark as completed" but does not define strikethrough, checkbox state, or footer count update. TC-002 asserts checkbox, styling, and **items left** count.

14. **Priority of operations not defined.** Order of list items (FIFO vs LIFO) after multiple creates is unspecified; TC-004 assumes append order.
