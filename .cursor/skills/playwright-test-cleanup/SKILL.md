---
name: playwright-test-cleanup
description: Ensures Playwright tests clean up the data they create. Use whenever generating or reviewing tests that create programs (or any persistent records) in Didaxis, so test data does not accumulate. Apply this to every test that creates data — even if cleanup isn't explicitly requested.
---

# Playwright Test Data Cleanup

Ensures Playwright tests clean up the data they create. Use whenever generating or reviewing tests that create programs (or any persistent records) in Didaxis, so test data does not accumulate. Apply this to every test that creates data — even if cleanup isn't explicitly requested.

## API Cleanup for Test Data

Tests that create data must remove it. Leftover data slows the app and
makes test runs unreliable. Every test that creates a program must track
its UUID and delete it via the API afterwards.

## Steps

1. Use the shared cleanup fixture in `fixtures/cleanup.fixture.ts`.
   Import `test` from there, not from `@playwright/test`.

2. When a test creates a program, capture the program's UUID from the POST
   response (`response.data.id`) and call `trackProgram(uuid)` immediately.

3. Do not write manual `afterAll` blocks for cleanup — the fixture
   handles teardown for every test that uses it.

4. Cleanup uses the DELETE API, not the UI:
   `DELETE /api/programs/<uuid>` with a Bearer token. The fixture uses
   `DIDAXIS_API_TOKEN` when valid; otherwise it logs in via
   `POST /api/auth/login` using `DIDAXIS_EMAIL` / `DIDAXIS_PASSWORD`.

5. Never hardcode the token. Never delete data the test did not create.

## Reference

- Endpoint: DELETE https://didaxis.studio/api/programs/<uuid>
- Auth: Authorization: Bearer ${DIDAXIS_API_TOKEN}

## Generating tests

```typescript
import { test, expect } from "../fixtures/cleanup.fixture";

test("creates a program", async ({ page, trackProgram }) => {
  // ... create program via UI ...
  const uuid = /* capture from API response, URL, or network intercept */;
  trackProgram(uuid);
  // ... assertions ...
});
```

Capture the UUID as soon as the program exists — do not defer tracking to the end of the test.

## Reviewing tests

When reviewing or editing any test that creates persistent Didaxis data, verify:

- [ ] Imports `test` from `fixtures/cleanup.fixture.ts` (not `@playwright/test`)
- [ ] Every created program UUID is passed to `trackProgram(uuid)`
- [ ] No manual `afterAll` / `afterEach` cleanup blocks
- [ ] No UI-based deletion for teardown
- [ ] No hardcoded API tokens
- [ ] Cleanup targets only data created within that test

If any item fails, fix it before considering the test complete.

## Additional resources

- For before/after patterns, see [examples.md](examples.md)
