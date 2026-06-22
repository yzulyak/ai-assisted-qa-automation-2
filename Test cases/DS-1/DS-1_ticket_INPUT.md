# DS-1 — Create New Academic Program

## Role

You are a senior QA engineer reviewing the feature described below.

## Task

Create a detailed test plan for the **Create new academic program** feature.

## Feature Description

Admin users can create a new academic program from the Programs page via a **+ New Program** action that opens a program creation form/modal.

## Acceptance Criteria

### Scenario: Navigate to program creation form

```gherkin
Given I am logged in as admin
When I navigate to the Programs page
And I click "+ New Program"
Then I see the program creation form with fields: Program Name, Description
```

### Scenario: Successfully create a program

```gherkin
Given I am on the program creation form
When I fill in Program Name with "Web Development 2026"
And I fill in Description with "Full-stack web development program"
And I click Create
Then the modal closes
And the program list shows "Web Development 2026"
```

### Scenario: Validation prevents empty program name

```gherkin
Given I am on the program creation form
When I leave the Program Name field empty
Then the Create button is disabled
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
| Form fields | Program Name, Description |
| Submit button | Create |
| Example program name | Web Development 2026 |
| Example description | Full-stack web development program |
| Required role | admin |
