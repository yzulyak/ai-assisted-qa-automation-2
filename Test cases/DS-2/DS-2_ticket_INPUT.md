# DS-2 — Edit Existing Program Details

## Role

You are a senior QA engineer reviewing the feature described below.

## Task

Create a detailed test plan for the **Edit existing program details** feature.

## Feature Description

Admin users can edit an existing academic program from the Programs page by clicking the edit icon on a program row, which opens a program edit form/modal pre-populated with the program's current data.

## Acceptance Criteria

### Scenario: Open program for editing

```gherkin
Given I am on the Programs page
And a program "Web Development 2026" exists
When I click the edit icon on "Web Development 2026"
Then I see the edit form pre-populated with the program's current data
```

### Scenario: Successfully edit a program name

```gherkin
Given I am editing "Web Development 2026"
When I change the Name to "Web Development 2026 - Updated"
And I click Save
Then the modal closes
And the program list immediately shows "Web Development 2026 - Updated"
```

### Scenario: Edit preserves unchanged fields

```gherkin
Given I am editing a program
When I only change the Description
And I click Save
Then the Name and other fields remain unchanged
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
| Row action | Edit icon |
| Form fields | Program Name, Description |
| Submit button | Save |
| Example program name | Web Development 2026 |
| Example updated name | Web Development 2026 - Updated |
| Example description | Full-stack web development program |
| Required role | admin |
