# DS-3 — Program Name Validation and Duplicate Prevention

## Role

You are a senior QA engineer reviewing the feature described below.

## Task

Create a detailed test plan for the **Program name validation and duplicate prevention** feature.

## Feature Description

When an admin creates a new academic program from the Programs page via **+ New Program**, the system validates the **Program Name** field before submission. Validation rules include rejecting whitespace-only names, accepting names with special characters, and preventing duplicate program names.

## Acceptance Criteria

### Scenario: Reject program name with only whitespace

```gherkin
Given I am on the program creation form
When I enter "   " as the program name
And I click Create
Then the form is not submitted (name is trimmed, treated as empty)
```

### Scenario: Accept program name with special characters

```gherkin
Given I am on the program creation form
When I enter "Informatique & IA - Niveau 2" as the program name
And I fill other required fields
And I click Create
Then the program is created successfully
```

### Scenario: Reject duplicate program name

```gherkin
Given a program "Web Development 2026" already exists
When I try to create a new program with the same name
Then I see an error indicating the name already exists
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
| Example special-char name | Informatique & IA - Niveau 2 |
| Example description | Full-stack web development program |
| Required role | admin |
