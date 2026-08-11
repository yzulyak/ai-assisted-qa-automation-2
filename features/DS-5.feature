Feature: Program list filtering and display
  DS-5 — Admin sees all programs in a clear list with name and description, or an empty-state prompt when none exist

  # Happy paths

  @TC-001 @High @AC-DisplayProgramList
  Scenario: Display program list with key details
    Given I am logged in as admin
    And programs exist in the system
    When I navigate to the Programs page
    Then I see a list showing each program's name and description

  @TC-002 @High @AC-EmptyState
  Scenario: Empty state when no programs exist
    Given I am logged in as admin
    And no programs exist
    When I navigate to the Programs page
    Then I see the message "No programs yet. Create your first program to get started."
    And I see a prompt to create the first program ("+ New Program")

  # Negative

  @TC-003 @High
  Scenario: Empty state is not shown when programs exist
    Given I am logged in as admin
    And the program "Cybersecurity Essentials" exists with description "Foundational cybersecurity training"
    When I navigate to the Programs page
    Then I see "Cybersecurity Essentials" and its description in the list
    And I do not see the empty-state message

  @TC-004 @High
  Scenario: Unauthenticated user cannot view the program list
    Given I am not logged in
    When I navigate to the Programs page
    Then I am redirected to the login page
    And I do not see the program list

  @TC-005 @High
  Scenario: Server error on load does not display the empty state
    Given I am logged in as admin
    And the programs list API returns HTTP 500
    When I navigate to the Programs page
    Then I see an error indicating programs could not be loaded
    And I do not see the empty-state message

  @TC-006 @Medium
  Scenario: Program list does not display unrelated or internal fields
    Given I am logged in as admin
    And the program "Test Program" exists with description "Sample program for list display testing"
    When I navigate to the Programs page
    Then the row for "Test Program" shows the name and description
    And the row does not show a UUID
    And the row does not show a raw timestamp

  # Edge cases

  @TC-007 @Medium
  Scenario: Special characters in name and description render correctly in the list
    Given I am logged in as admin
    And I am on the Programs page
    When I create a program named "Informatique & IA — Niveau 2" with description "Parcours avancé — IA & data (2026)"
    Then the list shows the exact name and description
    And the row does not HTML-escape the characters as &amp; or &lt;

  @TC-008 @Medium
  Scenario: Maximum-length program name displays correctly in the list
    Given I am logged in as admin
    And I am on the Programs page
    When I create a program whose name is 100 characters long
    Then the program appears in the list
    And the page layout does not overflow horizontally

  @TC-009 @Medium
  Scenario: Program with empty description still appears in the list with its name
    Given I am logged in as admin
    And I am on the Programs page
    When I create a program named "Standalone Certificate" with an empty description
    Then I see "Standalone Certificate" in the list

  @TC-010 @Medium
  Scenario: Long description displays without breaking list layout
    Given I am logged in as admin
    And I am on the Programs page
    When I create a program named "Technical Writing Workshop" with a 500-character description
    Then the program appears in the list
    And the page layout does not overflow horizontally

  @TC-011 @Medium
  Scenario: Multiple programs with similar names are displayed as distinct list entries
    Given I am logged in as admin
    And I am on the Programs page
    When I create programs named "Test Program", "Test Program Advanced", and "Test Program Basics"
    Then I see three distinct rows, one for each name and description

  @TC-012 @Medium
  Scenario: Page refresh preserves the program list content
    Given I am logged in as admin
    And I am on the Programs page
    And programs "Web Development 2026" and "Data Science Fundamentals" exist
    When I refresh the page
    Then I still see both programs with their names and descriptions

  @TC-013 @Medium
  Scenario: Programs page displays heading, subtitle, and program table
    Given I am logged in as admin
    When I navigate to the Programs page
    Then I see the "Programs" heading
    And I see the subtitle "Manage academic programs and semesters"
    And I see either the program table or the empty-state message

  @TC-014 @Medium
  Scenario: Program row exposes Edit and Delete action buttons
    Given I am logged in as admin
    And the program "Action Buttons Program" exists
    When I navigate to the Programs page
    Then I see an Edit button for that program
    And I see a Delete button for that program

  @TC-015 @High @network
  Scenario: Programs empty state when API returns no programs
    Given I am logged in as admin
    And GET /api/programs returns HTTP 200 with an empty list
    When I navigate to the Programs page
    Then I see the message "No programs yet. Create your first program to get started."
    And I see the "+ New Program" button

  @TC-016 @High @network
  Scenario: Malformed programs API response shows error instead of blank list
    Given I am logged in as admin
    And GET /api/programs returns HTTP 200 with a malformed body
    When I navigate to the Programs page
    Then I see an error indicating programs could not be loaded
    And I do not see the empty-state message

  @TC-017 @High @network
  Scenario: Programs API 503 does not display the empty state
    Given I am logged in as admin
    And GET /api/programs returns HTTP 503
    When I navigate to the Programs page
    Then I see an error indicating programs could not be loaded
    And I do not see the empty-state message

  @TC-018 @Medium @a11y
  Scenario: Programs page has no WCAG 2 A/AA axe violations
    Given I am logged in as admin
    When I navigate to the Programs page
    Then an axe scan with tags wcag2a and wcag2aa reports no violations

  @TC-019 @Medium @a11y
  Scenario: Keyboard path opens the New Program dialog from the primary CTA
    Given I am logged in as admin
    And I am on the Programs page
    When I tab to the "+ New Program" button
    Then the "+ New Program" button is focused
    When I press Enter
    Then I see a dialog titled "New Program"

  # Ambiguities and gaps
  # - Ticket title mentions "filtering" but acceptance criteria only cover list display and empty state. No search/filter control is specified or present in the Programs POM — filtering is not covered.
  # - Empty-state copy is taken from the live Programs UI: "No programs yet. Create your first program to get started."
  # - Non-admin list visibility is unspecified; only admin credentials are assumed for happy paths.
  # - API failure UX (500/503/malformed) is not specified in the ticket. Linked bugs DS-35, DS-72, DS-112 report that HTTP 500 currently shows the empty state instead of an error. Tests assert the correct product behavior (error, not empty state); mark as known defect if the live app still shows empty state.
  # - Linked DS-113: Programs page WCAG 2 AA color-contrast failures. Axe tests must not use .disableRules() to go green — report real violations.
  # - Linked DS-114: malformed GET /api/programs blanks the view with no error UI.
  # - Maximum Program Name length (100) comes from Confluence Program Setup — Field Definitions, not the ticket body.
