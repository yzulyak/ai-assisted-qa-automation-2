---
name: explore-and-generate
description: Explores a live UI for untested user flows and outputs a Gherkin test plan when there is no Jira ticket. MUST use when the user says "find what we're not testing", "explore <page> for untested flows", "expand coverage", or asks to discover coverage gaps without a ticket. Do NOT use when a ticket already exists — that is jira-ticket-to-gherkin; this skill is only for when there's no ticket.
---

# Explore and Generate

Read-only exploration. Map existing coverage, crawl the target UI, find the
highest-value gap, and hand a Gherkin plan to the test-writer. Do not write
or edit Playwright specs, POMs, or application source.

## When to use

- No Jira ticket — pure coverage discovery
- Triggers: "find what we're not testing", "explore \<page\> for untested
  flows", "expand coverage"

## When NOT to use

- A ticket already exists → use **jira-ticket-to-gherkin** instead

## Steps

1. **Map covered flows** — Read `tests/` (and related feature files if
   present). List the user flows already automated so gaps are measurable.

2. **Crawl the target** — Open the page/area via the Agent-Browser. Read
   the accessibility tree (roles, names, states), not pixels or screenshots
   as the primary signal.

3. **Enumerate real user flows** — From the a11y tree and UI affordances,
   list the flows the UI actually supports (create, edit, delete, navigate,
   validate, empty/error states, etc.).

4. **Diff for the coverage gap** — Compare supported flows (step 3) against
   covered flows (step 1). Produce the uncovered set.

5. **Pick one highest-value uncovered flow** — Choose a single flow per
   run. State why it ranks highest (risk, frequency, blast radius, missing
   happy path, etc.). Do not batch multiple plans in one run.

6. **Output a Gherkin test plan** — For the test-writer to implement:
   - One positive path scenario
   - One edge-case scenario
   - Every `Then` must be assertable (observable UI/API outcome — no vague
     “it works”)

## Output format

```gherkin
Feature: <uncovered flow name>
  Coverage gap — <one-line why this flow was chosen>

  # Happy path

  Scenario: <positive path>
    Given ...
    When ...
    Then ...

  # Edge case

  Scenario: <edge case>
    Given ...
    When ...
    Then ...
```

After the Gherkin, briefly list:
- Covered flows considered
- Other uncovered flows deferred (for a later run)

## Guardrails

- Read-only: explore and plan only — no test implementation in this skill
- One flow → one plan per invocation
- Prefer a11y tree over visual/pixel inspection
