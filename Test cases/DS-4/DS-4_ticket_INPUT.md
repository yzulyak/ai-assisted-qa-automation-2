# DS-4 — Delete Program with Confirmation

## Role

You are a senior QA engineer reviewing the feature described below.

## Task

Create a detailed test plan for the **Delete program with confirmation** feature.

## Feature Description

Admin users can delete an existing academic program from the Programs page by clicking the delete icon on a program row. Before the program is removed, the system displays a confirmation dialog. The user may confirm deletion to remove the program from the list, or cancel to keep it.

## Acceptance Criteria

### Scenario: Delete program with confirmation

```gherkin
Given a program "Test Program" exists
When I click the delete icon for "Test Program"
Then I see a confirmation dialog
When I confirm deletion
Then "Test Program" is removed from the program list
```

### Scenario: Cancel program deletion

```gherkin
Given I click the delete icon for a program
When I see the confirmation dialog
And I click Cancel
Then the program still exists in the list
```

## Requirements for the Test Cases

- All test cases must be in **Gherkin language**
- Cover every Acceptance Criteria with at least one test case
- Test cases should be **independent** of one another — not rely on execution, data, or state created by any other test case
- Test cases should be **executable individually in any order**
- Aim for **maximum test coverage** with **minimum number of test cases**
- Add **edge cases** the Acceptance Criteria don't mention:
  - Boundary values
  - Empty inputs
  - Special characters
  - Duplicates
  - Max-length
- Add **negative test cases** (what should NOT happen)
- Structure each test case as:
  - **ID** (TC-001, TC-002, etc.)
  - **Title** (expected behavior, not action)
  - **Preconditions**
  - **Steps** (numbered)
  - **Expected result**
  - **Priority** (High / Medium / Low)
- Group by: **Positive flows**, **Negative flows**, **Edge cases**

## Output Format

- Structured test plan in Markdown
- Use real field names and values, not placeholders
- At the end: list any ambiguities or gaps in the ACs

## Known UI Elements

| Element | Value |
|---|---|
| Page | Programs page |
| Row action | Delete icon |
| Confirmation dialog | Delete program confirmation |
| Confirm button | Delete |
| Cancel button | Cancel |
| Example program name | Test Program |
| Example alternate program name | Web Development 2026 |
| Example special-char name | Informatique & IA - Niveau 2 |
| Example description | Full-stack web development program |
| Required role | admin |
