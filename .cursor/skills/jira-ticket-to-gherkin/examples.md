# Example: DS-1 → `features/DS-1.feature`

Derived from [DS-1 — Create new academic program](https://legionqaschool.atlassian.net/browse/DS-1).

## Ticket summary (from Jira)

**Title:** Create new academic program  
**User story:** As an admin user, I want to create a new academic program so that I can begin designing its curriculum structure.

**Acceptance criteria (minimum coverage):**

| AC | Behavior |
|---|---|
| Navigate to form | Admin opens Programs → "+ New Program" → form with Program Name and Description |
| Successful create | Name "Web Development 2026", Description "Full-stack web development program" → modal closes; list shows the program |
| Empty name validation | Empty Program Name → Create button disabled |

ACs were already written as Gherkin in the ticket — treat them as minimum coverage and still add negative and edge scenarios.

## Output file

Save as `features/DS-1.feature`:

```gherkin
Feature: Create new academic program
  DS-1 — Admin creates a new academic program from the Programs page

  # Happy paths

  @TC-001 @AC-NavigateToForm
  Scenario: Admin sees Program Name and Description after opening New Program
    Given I am logged in as admin
    When I navigate to the Programs page
    And I click "+ New Program"
    Then I see the program creation form
    And the form displays the "Program Name" field
    And the form displays the "Description" field
    And the form displays a "Create" button

  @TC-002 @AC-SuccessfulCreate
  Scenario: Valid program is created and appears in the list
    Given I am logged in as admin
    And I am on the Programs page
    And the program list does not contain "Web Development 2026"
    When I click "+ New Program"
    And I fill in "Program Name" with "Web Development 2026"
    And I fill in "Description" with "Full-stack web development program"
    And I click "Create"
    Then the program creation modal closes
    And the Programs page program list displays "Web Development 2026"

  @TC-003 @AC-EmptyNameValidation
  Scenario: Create button is disabled when Program Name is empty
    Given I am logged in as admin
    And I am on the Programs page
    When I click "+ New Program"
    And I leave the "Program Name" field empty
    And I fill in "Description" with "Optional description text"
    Then the "Create" button is disabled

  @TC-004
  Scenario: Program can be created with Description empty
    Given I am logged in as admin
    And I am on the Programs page
    And the program list does not contain "Data Science Fundamentals"
    When I click "+ New Program"
    And I fill in "Program Name" with "Data Science Fundamentals"
    And I leave the "Description" field empty
    And I click "Create"
    Then the program creation modal closes
    And the Programs page program list displays "Data Science Fundamentals"

  # Negative

  @TC-005 @AC-EmptyNameValidation
  Scenario: No program is created when Program Name is empty
    Given I am logged in as admin
    And I am on the Programs page
    And I note the current program list entries
    When I click "+ New Program"
    And I leave the "Program Name" field empty
    And I fill in "Description" with "Should not be saved without a name"
    Then the "Create" button is disabled
    And no new program appears in the program list
    And the program creation modal remains open

  @TC-006
  Scenario: Non-admin user cannot open program creation
    Given I am logged in as a non-admin user
    When I navigate to the Programs page
    Then I do not see the "+ New Program" button
    And I cannot open the program creation form

  @TC-007
  Scenario: Unauthenticated user cannot create a program
    Given I am not logged in
    When I attempt to navigate to the Programs page
    Then I am redirected to the login page
    And I do not see the program creation form

  @TC-008
  Scenario: Closing the modal without Create does not persist the program
    Given I am logged in as admin
    And I am on the Programs page
    When I click "+ New Program"
    And I fill in "Program Name" with "Cybersecurity Basics"
    And I fill in "Description" with "Intro to security concepts"
    And I close the modal without clicking "Create"
    Then the program creation modal closes
    And the Programs page program list does not display "Cybersecurity Basics"

  @TC-009
  Scenario: Duplicate program name is rejected
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

  # Edge cases

  @TC-010
  Scenario: Whitespace-only Program Name is treated as empty
    Given I am logged in as admin
    And I am on the Programs page
    When I click "+ New Program"
    And I fill in "Program Name" with "   "
    And I fill in "Description" with "Whitespace name test"
    Then the "Create" button is disabled

  @TC-011
  Scenario: Program Name with special characters is created and displayed
    Given I am logged in as admin
    And I am on the Programs page
    And the program list does not contain "AI & ML (2026) — Cohort #1"
    When I click "+ New Program"
    And I fill in "Program Name" with "AI & ML (2026) — Cohort #1"
    And I fill in "Description" with "Covers AI, ML, and data pipelines"
    And I click "Create"
    Then the program creation modal closes
    And the Programs page program list displays "AI & ML (2026) — Cohort #1"

  @TC-012
  Scenario: Single-character Program Name is accepted
    Given I am logged in as admin
    And I am on the Programs page
    And the program list does not contain "X"
    When I click "+ New Program"
    And I fill in "Program Name" with "X"
    And I fill in "Description" with "Single character name boundary test"
    And I click "Create"
    Then the program creation modal closes
    And the Programs page program list displays "X"

  @TC-013
  Scenario: Program Name at maximum length 100 is accepted
    Given I am logged in as admin
    And I am on the Programs page
    When I click "+ New Program"
    And I fill in "Program Name" with a 100-character unique string
    And I fill in "Description" with "Max length boundary test"
    And I click "Create"
    Then the program creation modal closes
    And the Programs page program list displays the full 100-character program name

  @TC-014
  Scenario: Program Name longer than 100 characters is rejected
    Given I am logged in as admin
    And I am on the Programs page
    When I click "+ New Program"
    And I fill in "Program Name" with a 101-character string
    And I fill in "Description" with "Over max length test"
    Then the input prevents typing beyond 100 characters
    Or the "Create" button is disabled
    Or a validation error is shown for "Program Name"
    And no program with a 101-character name appears in the program list

  @TC-015
  Scenario: Description at maximum length 500 is saved with the program
    Given I am logged in as admin
    And I am on the Programs page
    And the program list does not contain "Cloud Computing 2026"
    When I click "+ New Program"
    And I fill in "Program Name" with "Cloud Computing 2026"
    And I fill in "Description" with a 500-character string
    And I click "Create"
    Then the program creation modal closes
    And the Programs page program list displays "Cloud Computing 2026"

  # Ambiguities and gaps
  # - AC does not state whether Description is required (assumed optional)
  # - AC does not define duplicate-name behavior (unique per org assumed from Confluence Field Definitions)
  # - AC does not define max lengths (Name 100 / Description 500 from Confluence)
  # - AC does not specify non-admin or unauthenticated access rules
  # - AC does not specify Cancel / X / outside-click dismiss behavior
  # - Case-sensitivity of duplicate names is unspecified
```

## Notes on this example

- Every Jira AC has at least one tagged scenario (`@AC-…`).
- Negative and edge scenarios go beyond the ticket ACs, as the skill requires.
- Values are concrete (`Web Development 2026`, `+ New Program`, field labels) — no placeholders.
- Ambiguities are listed at the end for QA review before Playwright work starts.
