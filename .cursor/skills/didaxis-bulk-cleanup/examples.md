# Bulk vs per-test cleanup

## Bulk cleanup (this skill)

One-off reset of **all** programs in Didaxis Studio. Requires explicit user request and confirmation.

```bash
# Dry run — lists programs, deletes nothing
node scripts/delete-all-programs.mjs

# After user confirms — deletes every program
node scripts/delete-all-programs.mjs --confirm
```

## Per-test cleanup (Playwright)

Tests that create programs must track and delete only what they created. Do not use the bulk script for teardown.

```typescript
import { test, expect } from "../fixtures/cleanup.fixture";

test("creates a program", async ({ page, trackProgram }) => {
  // ... create program ...
  trackProgram(uuid); // fixture deletes via DELETE /api/programs/<uuid>
});
```

See [playwright-test-cleanup](../playwright-test-cleanup/SKILL.md) for full patterns.
