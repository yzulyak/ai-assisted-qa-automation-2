Feature: Dashboard displaying the right components
  DS-119 — Admin sees Programs, Calendar, Validation, and AI Assist blocks on the Dashboard and can navigate via each card

  # Happy paths

  @TC-001 @AC-NavigateToDashboard
  Scenario: Admin sees the four Dashboard blocks
    Given I am logged in as admin
    When I navigate to the Dashboard page
    Then I see the Dashboard heading
    And I see the "Programs" card
    And I see the "Calendar" card
    And I see the "Validation" card
    And I see the "AI Assist" card

  @TC-002 @AC-NavigateToPrograms
  Scenario: Clicking the Programs card opens the Programs page
    Given I am logged in as admin
    And I am on the Dashboard page
    When I click the "Programs" card
    Then I am navigated to the Programs page at "/programs"
    And I see the Programs page heading

  @TC-003 @AC-NavigateToCalendar
  Scenario: Clicking the Calendar card opens the Calendar page
    Given I am logged in as admin
    And I am on the Dashboard page
    When I click the "Calendar" card
    Then I am navigated to the Calendar page at "/calendar"

  @TC-004 @AC-NavigateToValidation
  Scenario: Clicking the Validation card opens the Validation page
    Given I am logged in as admin
    And I am on the Dashboard page
    When I click the "Validation" card
    Then I am navigated to the Validation page at "/validation"

  @TC-005 @AC-NavigateToAIAssist
  Scenario: Clicking the AI Assist card opens the AI Assist page
    Given I am logged in as admin
    And I am on the Dashboard page
    When I click the "AI Assist" card
    Then I am navigated to the AI Assist page at "/cli"

  # Negative

  @TC-006
  Scenario: Dashboard does not show unrelated navigation blocks as cards
    Given I am logged in as admin
    When I navigate to the Dashboard page
    Then I see exactly the four cards Programs, Calendar, Validation, and AI Assist
    And I do not see a Dashboard card named "Settings"
    And I do not see a Dashboard card named "Export"
    And I do not see a Dashboard card named "Scheduler"

  @TC-007
  Scenario: Sidebar Dashboard link returns to the Dashboard without losing the four cards
    Given I am logged in as admin
    And I am on the Programs page
    When I click the "Dashboard" item in the sidebar
    Then I am on the Dashboard page
    And I see the "Programs" card
    And I see the "Calendar" card
    And I see the "Validation" card
    And I see the "AI Assist" card

  # Edge cases

  @TC-008
  Scenario: Each Dashboard card is keyboard-focusable and activatable with Enter
    Given I am logged in as admin
    And I am on the Dashboard page
    When I focus the "Programs" card with the keyboard
    And I press Enter
    Then I am navigated to the Programs page at "/programs"

  @TC-009
  Scenario: Rapid sequential card clicks still land on the last selected destination
    Given I am logged in as admin
    And I am on the Dashboard page
    When I click the "Calendar" card
    And I navigate back to the Dashboard page
    And I click the "Validation" card
    Then I am navigated to the Validation page at "/validation"

  @TC-010
  Scenario: Browser back from a card destination returns to the Dashboard with all cards visible
    Given I am logged in as admin
    And I am on the Dashboard page
    When I click the "Programs" card
    And I use the browser back button
    Then I am on the Dashboard page
    And I see the "Programs" card
    And I see the "Calendar" card
    And I see the "Validation" card
    And I see the "AI Assist" card

  # Ambiguities and gaps
  # - Ticket ACs say "Given I am on Dashboardx" (typo) — treated as Dashboard.
  # - Exact Dashboard URL is not stated; prior coverage used "/" or "/dashboard" — confirm against the live app.
  # - AI Assist destination "/cli" comes from prior DS-119 CI notes, not from the ticket text.
  # - Linked DS-120: Calendar, Validation, and AI Assist cards may not navigate (known defect).
  # - Linked DS-121: Dashboard block cards may not be keyboard-focusable or activatable (known defect).
  # - Confluence "Program Setup — Overview" covers Programs CRUD, not Dashboard card layout — card labels/routes rely on ticket ACs + prior test notes.
  # - Whether cards are <a>, <button>, or clickable <div> is unspecified; affects keyboard scenario TC-008.
