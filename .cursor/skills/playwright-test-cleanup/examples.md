# Before / After: Playwright Test Data Cleanup

## Anti-pattern: create without cleanup

```typescript
import { test, expect } from "@playwright/test";

test("creates a program", async ({ page }) => {
  await loginAsAdmin(page);
  await goToPrograms(page);

  const name = uniqueName("Web Development");
  await createProgram(page, name, "Full-stack program");

  await expect(programInList(page, name)).toBeVisible();
  // Program remains in Didaxis after the test
});
```

## Correct: track UUID via cleanup fixture

```typescript
import { test, expect } from "../fixtures/cleanup.fixture";

test("creates a program", async ({ page, trackProgram }) => {
  await loginAsAdmin(page);
  await goToPrograms(page);

  const name = uniqueName("Web Development");

  const createResponsePromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/programs") &&
      res.request().method() === "POST" &&
      res.ok(),
  );

  await createProgram(page, name, "Full-stack program");

  const createResponse = await createResponsePromise;
  const body = await createResponse.json();
  trackProgram(body.data.id); // or body.id — match the API shape

  await expect(programInList(page, name)).toBeVisible();
});
```

## Anti-pattern: manual `afterAll` / UI teardown

```typescript
import { test, expect } from "@playwright/test";

const createdIds: string[] = [];

test("creates a program", async ({ page }) => {
  // ... create program, push id into createdIds ...
});

test.afterAll(async ({ request }) => {
  for (const id of createdIds) {
    await request.delete(`https://didaxis.studio/api/programs/${id}`, {
      headers: { Authorization: `Bearer ${process.env.DIDAXIS_API_TOKEN}` },
    });
  }
});

// Also wrong: deleting via the Programs UI only for teardown
```

## Correct: fixture owns teardown

```typescript
import { test, expect } from "../fixtures/cleanup.fixture";

test("creates a program", async ({ page, trackProgram }) => {
  // Capture UUID as soon as the program exists, then trackProgram(uuid).
  // No afterAll / afterEach — the fixture deletes via DELETE /api/programs/<uuid>.
});
```

## Multiple programs in one test

```typescript
import { test, expect } from "../fixtures/cleanup.fixture";

test("creates several programs", async ({ page, trackProgram }) => {
  await loginAsAdmin(page);
  await goToPrograms(page);

  for (const base of ["Alpha", "Beta"]) {
    const name = uniqueName(base);
    const createResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/programs") &&
        res.request().method() === "POST" &&
        res.ok(),
    );
    await createProgram(page, name);
    const body = await (await createResponsePromise).json();
    trackProgram(body.data.id);
  }

  // Assertions...
});
```

Track every UUID immediately after each create — do not wait until the loop ends.
