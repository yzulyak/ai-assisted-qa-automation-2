# DS-5 — Program List Filtering and Display

## Role

You are a senior QA engineer reviewing the feature described below.

## Task

Create a detailed test plan for the **Program list filtering and display** feature.

## Feature Description

Admin users navigate to the Programs page to view all academic programs in the system. When programs exist, the page displays a list showing each program's key details. When no programs exist, the page displays an empty state with guidance to create the first program.

## Acceptance Criteria

### Scenario: Display program list with key details

```gherkin
Given programs exist in the system
When I navigate to the Programs page
Then I see a list showing each program's name and description
```

### Scenario: Empty state when no programs exist

```gherkin
Given no programs exist
When I navigate to the Programs page
Then I see a message indicating no programs have been created
And I see a prompt to create the first program
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
| Action button | + New Program |
| List fields | Program Name, Description |
| Example program name | Web Development 2026 |
| Example alternate program name | Data Science Fundamentals |
| Example special-char name | Informatique & IA - Niveau 2 |
| Example description | Full-stack web development program |
| Required role | admin |
