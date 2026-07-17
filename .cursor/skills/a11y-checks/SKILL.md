---
name: a11y-checks
description: Adds @axe-core/playwright accessibility scans when generating or reviewing Playwright tests for new pages or components. Apply whenever creating, extending, or reviewing UI tests — even if the user does not mention accessibility, a11y, or axe.
---

# Accessibility Checks

Every Playwright test for a new page or component **must** include an axe-core scan. This is not optional and does not require the user to ask for it. If you are generating or reviewing a UI test, add or verify an a11y check before considering the work complete.

## When to apply

Apply this skill when you:

- Generate a new Playwright spec or test case for a page or component
- Extend an existing test to cover a new page, modal, drawer, or widget
- Review or refactor any UI test — even functional or E2E tests with no a11y mention

If the test navigates to or interacts with UI, it needs an axe scan.

## Required pattern

1. Import `AxeBuilder` from `@axe-core/playwright`.
2. Navigate to the target UI and wait for it to be ready (use POM methods + web-first `expect` visibility checks first).
3. Run the scan:

```typescript
import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

const results = await new AxeBuilder({ page }).analyze();

await expect(results.violations).toEqual([]);
```

4. Use web-first `expect` on `results.violations` — never use bare `assert`, `if (violations.length)`, or manual length checks.

## Scoping

| Target | Scope |
|--------|-------|
| Full page | No `.include()` — scan the whole page |
| Modal, drawer, panel, or component | Chain `.include(selector)` to limit the scan |

For component-level scans, derive the include selector from a role-based POM locator (see `NewProgramModal.axeIncludeSelector()`). Do not use brittle CSS selectors unrelated to the component under test.

```typescript
const results = await new AxeBuilder({ page })
  .include(await modal.axeIncludeSelector())
  .analyze();

await expect(results.violations).toEqual([]);
```

## disableRules — strict policy

`.disableRules()` is allowed **only** when a rule produces a known false positive that cannot be fixed in the test or app right now.

Rules:

- **Always** add an inline comment on the same line or the line above explaining **why** the rule is disabled and what tracks fixing it (ticket, upstream issue, or environmental limitation).
- **Never** use `.disableRules()` to silence a real accessibility failure.
- **Never** disable rules preemptively "just in case."
- Prefer fixing the violation or scoping with `.include()` before disabling anything.

```typescript
// color-contrast: modal overlay uses design-system tokens with insufficient contrast — tracked in PROJ-1234
.disableRules(["color-contrast"])
```

If you cannot justify the disable with a specific reason, do not disable the rule.

## File placement

- Dedicated a11y coverage: `tests/<feature>.a11y.spec.ts` (see `tests/programs.a11y.spec.ts`)
- Or add an axe assertion at the end of an existing functional test when it already reaches the target UI state

Keep axe scans in test files, not in Page Objects. POMs may expose helpers like `axeIncludeSelector()`; assertions stay in specs.

## Generating tests checklist

- [ ] Target UI is loaded and visible before scanning
- [ ] `AxeBuilder({ page }).analyze()` is called
- [ ] Component-level scans use `.include()`
- [ ] `await expect(results.violations).toEqual([])` asserts zero violations
- [ ] Any `.disableRules()` has a commented reason — none added without justification

## Reviewing tests checklist

When reviewing any UI test, verify:

- [ ] An axe scan covers every new page or component introduced by the change
- [ ] Scans run after the UI is in the state under test (modal open, form filled, etc.)
- [ ] Violations are asserted with web-first `expect`, not manual checks
- [ ] No `.disableRules()` without a documented reason
- [ ] No missing a11y coverage because the user didn't say "accessibility"

If any item fails, add or fix the a11y check before considering the test complete.
