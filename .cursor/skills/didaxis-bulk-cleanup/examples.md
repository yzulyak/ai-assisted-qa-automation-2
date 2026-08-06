# Didaxis Bulk Cleanup Examples

## Typical user request

> "Delete all programs from Didaxis test environment"

**Agent steps:**

1. Run dry run: `node scripts/delete-all-programs.mjs`
2. Tell the user how many programs were found and show a sample of names/UUIDs
3. Ask for confirmation
4. On approval: `node scripts/delete-all-programs.mjs --confirm`

## Example dry-run output

```
Target: https://test.didaxis.studio
Programs found: 3
- abc-123 | QA Program 1712345678
- def-456 | Cleanup Diagnostic 1712345679
- ghi-789 | Smoke Test Program

Dry run only. Re-run with --confirm to delete all listed programs.
```

## Example confirmed run

```
Target: https://test.didaxis.studio
Programs found: 3
...
Deleted abc-123 (QA Program 1712345678)
Deleted def-456 (Cleanup Diagnostic 1712345679)
Deleted ghi-789 (Smoke Test Program)

Done. Deleted: 3, failed: 0
```

## Wrong tool for the job

**User:** "Add cleanup to this Playwright test that creates one program"

Use `fixtures/cleanup.fixture.ts` and `trackProgram(uuid)` — not this bulk script.

**User:** "Clean up leftover programs after tests failed"

If they mean all programs in the environment → bulk script (with confirmation).

If they mean only programs created by tests → fix the test to call `trackProgram(uuid)`.
