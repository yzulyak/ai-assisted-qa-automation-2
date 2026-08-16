---
name: exploratory-charter
description: Turns a feature plus a risk into an exploratory test charter and a findings template. Use when the user asks for a charter, an exploratory session plan, session-based testing notes, or "feature + risk → charter". Do NOT explore the live UI or write Playwright specs — format only; the human does the thinking.
---

# Exploratory Charter

The thinking is human; the skill just keeps the format.

Input: a **feature** and a **risk**. Output: a filled **charter** and a blank **findings** template for the session.

## When to use

- "Write a charter for …"
- "Exploratory session on …"
- Feature + risk given; need structure before freeform testing

## When NOT to use

- Coverage gap → Gherkin plan → **explore-and-generate**
- Ticket → Gherkin → **jira-ticket-to-gherkin**
- Implementing or healing Playwright tests

## Steps

1. Confirm **feature** (what to explore) and **risk** (what could go wrong / what to hunt).
2. If either is missing, ask once — do not invent product knowledge.
3. Emit the charter (filled) and findings template (blank rows ready to use).
4. Stop. Do not run the session, browse the app, or draft automation.

## Charter format

```markdown
# Charter

- **Feature:** <feature>
- **Risk:** <risk>
- **Mission:** Explore <feature> with attention to <risk>
- **Boundaries:** <in scope / out of scope — ask if unclear, else "TBD by tester">
- **Time box:** <e.g. 45–90 min — ask if unclear, else "TBD">
- **Notes / setup:** <accounts, data, builds — only what the user supplied>
```

## Findings template

```markdown
# Findings

| # | Type | Summary | Evidence | Severity | Follow-up |
|---|------|---------|----------|----------|-----------|
| 1 | bug / question / idea / note |  |  | S1–S4 / — | file bug / ask / ignore |
```

Type meanings:

| Type | Use for |
|------|---------|
| `bug` | Suspected product defect |
| `question` | Ambiguous expected behavior |
| `idea` | Coverage or design suggestion |
| `note` | Observation that is not actionable yet |

## Guardrails

- Format only — no exploration, no specs, no POM edits
- Do not invent acceptance criteria or fill findings for the human
- One charter per invocation
