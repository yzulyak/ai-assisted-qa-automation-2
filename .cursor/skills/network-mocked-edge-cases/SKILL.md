---
name: network-mocked-edge-cases
description: >
  Writes deterministic programs-flow edge-case Playwright tests with
  page.route network mocks. Use when covering API failure (500/503),
  timeout, empty list, malformed payload, or other HTTP status edge
  cases (401/403/404/5xx/3xx) for Didaxis programs — even if the user
  does not say "mock" or "route".
---

# Network-mocked edge cases (programs flow)

Prefer `page.route` for deterministic edge cases on the programs flow.
Do not invent UI copy. Do not change happy-path specs that hit the real API.

## Before writing assertions

1. Open the real Programs UI with agent-browser or Playwright MCP.
2. Force or observe each case and **read the actual** error / empty-state /
   crash-guard copy the app renders.
3. Assert only strings you observed. If the app renders nothing for a case,
   say so in the handoff — do not guess.

## Never mock the endpoint under test

- If the test verifies the **real** API contract or happy-path save/list,
  do **not** mock that endpoint.
- Mock only when the test verifies the **UI reaction** to a controlled
  API outcome (error banner, empty state, no crash).

## Route targets (`/api/programs`)

Fulfill with `page.route` matching the programs API (method + URL). Typical cases:

| Case | Mock | Assert (after observing real UI) |
|------|------|----------------------------------|
| (a) Save failure | POST → **503** (also cover **500**) | UI error state |
| (b) Empty list | GET → **200** `[]` | Empty-state message |
| (c) Bad payload | GET or POST → **200** malformed body | App does not crash |
| Timeout | GET/POST → `route.abort("timedout")` or delayed fulfill | Observed timeout/error UI (or note if none) |
| Auth | GET/POST → **401**, **403** | Observed auth/error UI (or note if none) |
| Missing | GET/POST → **404** | Observed not-found/error UI (or note if none) |
| Upstream | GET/POST → **500**, **501**, **502**, **503** | Observed error UI (or note if none) |
| Redirect-ish | GET/POST → **300** (and other 3xx if relevant) | Observed handling (or note if none) |

Add further statuses the plan calls for the same way — observe first, then assert.

## Test shape

- Drive every click/fill/nav through existing POMs (`ProgramsPage`,
  `NewProgramModal`). No inline locators in the spec.
- **One tag per test** (e.g. `{ tag: "@network" }`) — never multiple tags.
- Scope the route narrowly (programs API only); `route.continue()` everything else.
- Unroute or let the test end cleanly; do not leave broad `**/*` aborts unless
  the scenario requires it (prefer status/`fulfill` over `abort`).
- Keep waits web-first; never `waitForTimeout`.

## Example sketch (copy must come from the live UI)

```typescript
test(
  "TC-NNN — Programs empty state when API returns no programs",
  { tag: "@network" },
  async ({ page }) => {
    await page.route("**/api/programs**", async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "[]",
        });
      }
      return route.continue();
    });

    const programsPage = new ProgramsPage(page);
    await programsPage.goto();
    // Assert observed empty-state copy via POM locator — do not invent text.
    await expect(programsPage.emptyStateMessage).toBeVisible();
  },
);
```

## Handoff

Report: which statuses were covered, which UI strings were observed (or
“renders nothing”), and any missing POM locators for error/empty states.
