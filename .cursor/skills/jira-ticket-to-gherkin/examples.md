# Example: DS-1

Abbreviated excerpt from `features/DS-1.feature` style output for "Create new academic program".

```gherkin
Feature: Create new academic program
  DS-1 — Admin creates a new academic program from the Programs page

  # Happy paths

  @TC-001 @High @AC-NavigateToForm
  Scenario: Program creation form opens with required fields
    Given I am logged in as admin
    And I am on the Programs page
    When I click "+ New Program"
    Then I see a dialog titled "New Program"
    And the "Program Name" field is visible and editable
    And the "Description" field is visible and editable
    And the "Create" button is present and disabled

  @TC-002 @High @AC-SuccessfulCreate
  Scenario: Program is created successfully with valid name and description
    Given I am logged in as admin
    And I am on the program creation form
    When I fill in "Program Name" with "Web Development 2026"
    And I fill in "Description" with "Full-stack web development program"
    And I click "Create"
    Then the modal closes
    And the program list shows "Web Development 2026"

  @TC-004 @High @AC-EmptyNameValidation
  Scenario: Create button is disabled when Program Name is empty
    Given I am logged in as admin
    And I am on the program creation form
    When I leave "Program Name" empty
    Then the "Create" button is disabled
    And no program is created

  # Negative

  @TC-007 @High
  Scenario: Whitespace-only Program Name does not create a program
    Given I am logged in as admin
    And I am on the program creation form
    When I fill in "Program Name" with "   "
    And I fill in "Description" with "Valid description text"
    Then the "Create" button remains disabled
    And no program is created

  @TC-011 @High
  Scenario: Duplicate Program Name is rejected with an error
    Given I am logged in as admin
    And the program "Web Development 2026" already exists in the program list
    And I am on the program creation form
    When I fill in "Program Name" with "Web Development 2026"
    And I fill in "Description" with "Another description for duplicate name"
    And I click "Create"
    Then creation is blocked with a clear duplicate-name error
    And exactly one program with that name remains in the list

  # Edge cases

  @TC-015 @Medium
  Scenario: Program Name at maximum allowed length (100 characters) is accepted
    Given I am logged in as admin
    And I am on the program creation form
    When I fill in "Program Name" with a 100-character string
    And I fill in "Description" with "Max length boundary test"
    And I click "Create"
    Then the program is created with the full name displayed correctly in the list

  @TC-017 @Medium
  Scenario: Special characters in Program Name are handled correctly
    Given I am logged in as admin
    And I am on the program creation form
    When I fill in "Program Name" with "Web Dev & Design — 2026 (Cohort #1)"
    And I fill in "Description" with "Special characters test"
    And I click "Create"
    Then the program is created with the exact name preserved
    And the name displays correctly in the program list

  # Ambiguities and gaps
  # - Non-admin access: only admin credentials available; non-admin behavior not verified
  # - Single-character name: minimum length rule not documented in ticket
  # - API failure UX: error message content and modal state on failure not specified
```
