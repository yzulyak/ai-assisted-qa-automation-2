import dotenv from 'dotenv';
import path from 'path';
import type { Page, Response } from '@playwright/test';
import { test, expect, extractProgramId } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import { LoginPage } from '../pages/LoginPage';
import { uniqueName } from './helpers/uniqueName';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ADMIN_EMAIL = process.env.DIDAXIS_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.DIDAXIS_PASSWORD ?? '';
const NON_ADMIN_EMAIL = process.env.DIDAXIS_NON_ADMIN_EMAIL ?? '';
const NON_ADMIN_PASSWORD = process.env.DIDAXIS_NON_ADMIN_PASSWORD ?? '';

/** Confluence: Program Setup — Field Definitions */
const PROGRAM_NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;

async function programIdFromResponse(response: Response): Promise<string> {
  return extractProgramId(await response.json());
}

async function login(page: Page, email: string, password: string): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.login(email, password);
  await expect(loginPage.signOutButton).toBeVisible({ timeout: 15_000 });
}

async function goToPrograms(programs: ProgramsPage): Promise<void> {
  await programs.goto();
  await expect(programs.newProgramButton).toBeVisible();
  await expect(programs.heading).toBeVisible();
  await expect(programs.tableOrEmptyState).toBeVisible({ timeout: 15_000 });
}

async function openNewProgramModal(programs: ProgramsPage): Promise<void> {
  await programs.openNewProgramForm();
  await expect(programs.newProgramModal.dialog).toBeVisible();
  await expect(programs.newProgramModal.programNameInput).toBeVisible();
}

async function createProgram(
  programs: ProgramsPage,
  name: string,
  description?: string,
): Promise<string> {
  const createResponsePromise = programs.waitForProgramCreate();
  await programs.createProgram(name, description);
  await expect(programs.newProgramModal.dialog).not.toBeVisible({ timeout: 15_000 });
  await expect(programs.programInList(name)).toBeVisible({ timeout: 15_000 });
  return programIdFromResponse(await createResponsePromise);
}

async function expectDuplicateNameError(programs: ProgramsPage): Promise<void> {
  await expect(programs.newProgramModal.duplicateError).toBeVisible();
}

/** Wait for create API + list refresh so duplicate checks don't pass on a brief error flash. */
const DUPLICATE_CHECK_SETTLE_MS = 1_000;

async function expectDuplicateSubmissionRejected(
  programs: ProgramsPage,
  options: { listName: string; expectedRowCount: number },
): Promise<void> {
  const rows = programs.programRowsWithName(options.listName);
  const countBefore = await rows.count();
  expect(countBefore).toBe(options.expectedRowCount);

  const createResponse = programs.page.waitForResponse(
    (response) => response.request().method() === 'POST',
    { timeout: 15_000 },
  );

  await programs.newProgramModal.submit();
  await createResponse.catch(() => null);
  await programs.page.waitForTimeout(DUPLICATE_CHECK_SETTLE_MS);

  await expect(rows).toHaveCount(options.expectedRowCount);
  await expect(programs.newProgramModal.dialog).toBeVisible();
  await expectDuplicateNameError(programs);
}

test.beforeEach(async () => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'Set DIDAXIS_EMAIL and DIDAXIS_PASSWORD in .env',
  );
});

test.describe('Positive flows', () => {
  test.beforeEach(async ({ page }) => {
    const programs = new ProgramsPage(page);
    await goToPrograms(programs);
  });

  test('TC-001: Program creation form displays required fields', async ({ page }) => {
    const programs = new ProgramsPage(page);
    await openNewProgramModal(programs);

    await expect(programs.newProgramModal.dialog).toBeVisible();
    await expect(programs.newProgramModal.programNameInput).toBeVisible();
    await expect(programs.newProgramModal.descriptionInput).toBeVisible();
    await expect(programs.newProgramModal.createButton).toBeVisible();
    await expect(programs.newProgramModal.cancelButton).toBeVisible();
    await expect(programs.newProgramModal.programNameRequiredLabel).toBeVisible();
  });

  test('TC-002: Valid program is created and appears in the list', async ({
    page,
    trackProgram,
  }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Web Development 2026');
    const description = 'Full-stack web development program';

    const createResponsePromise = programs.waitForProgramCreate();
    await openNewProgramModal(programs);
    await programs.newProgramModal.fill(programName, description);
    await programs.newProgramModal.submit();

    trackProgram(await programIdFromResponse(await createResponsePromise));

    await expect(programs.newProgramModal.dialog).not.toBeVisible();
    await expect(programs.programInList(programName)).toBeVisible();
    await expect(programs.programRow(programName)).toContainText(description);
  });

  test('TC-003: Create button is disabled when Program Name is empty', async ({ page }) => {
    const programs = new ProgramsPage(page);
    await openNewProgramModal(programs);
    await programs.newProgramModal.fill(undefined, 'Optional description text');

    await expect(programs.newProgramModal.createButton).toBeDisabled();
    await programs.newProgramModal.submit({ force: true });
    await expect(programs.newProgramModal.dialog).toBeVisible();
  });

  test('TC-004: Program can be created with Description empty', async ({
    page,
    trackProgram,
  }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Data Science Fundamentals');

    const createResponsePromise = programs.waitForProgramCreate();
    await openNewProgramModal(programs);
    await programs.newProgramModal.fill(programName);
    await expect(programs.newProgramModal.descriptionInput).toHaveValue('');
    await expect(programs.newProgramModal.createButton).toBeEnabled();
    await programs.newProgramModal.submit();

    trackProgram(await programIdFromResponse(await createResponsePromise));

    await expect(programs.newProgramModal.dialog).not.toBeVisible();
    await expect(programs.programInList(programName)).toBeVisible();
  });
});

test.describe('Negative flows', () => {
  test('TC-005: Program is not created when submission is attempted with empty Program Name', async ({
    page,
  }) => {
    const programs = new ProgramsPage(page);
    await goToPrograms(programs);

    const rowsBefore = await programs.programRowCount();

    await openNewProgramModal(programs);
    await programs.newProgramModal.fill(undefined, 'Should not be saved without a name');

    await expect(programs.newProgramModal.createButton).toBeDisabled();
    await programs.newProgramModal.submit({ force: true });

    await expect(programs.newProgramModal.dialog).toBeVisible();
    await expect(programs.programRows).toHaveCount(rowsBefore);
  });

  test.describe('without admin session', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('TC-006: Non-admin user cannot access program creation', async ({ page }) => {
      test.skip(
        !NON_ADMIN_EMAIL || !NON_ADMIN_PASSWORD,
        'Set DIDAXIS_NON_ADMIN_EMAIL and DIDAXIS_NON_ADMIN_PASSWORD in .env',
      );

      const programs = new ProgramsPage(page);
      await login(page, NON_ADMIN_EMAIL, NON_ADMIN_PASSWORD);
      await programs.goto();

      await expect(programs.newProgramButton).not.toBeVisible();
      await expect(programs.newProgramModal.dialog).not.toBeVisible();
    });

    test('TC-007: Unauthenticated user cannot create a program', async ({ page }) => {
      const programs = new ProgramsPage(page);
      const loginPage = new LoginPage(page);
      await programs.goto();

      await expect(page).toHaveURL(/\/login/);
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(programs.newProgramModal.dialog).not.toBeVisible();
    });
  });

  test('TC-008: Canceling or closing the modal does not create a program', async ({ page }) => {
    const programs = new ProgramsPage(page);
    await goToPrograms(programs);

    const programName = uniqueName('Cybersecurity Basics');

    await openNewProgramModal(programs);
    await programs.newProgramModal.fill(programName, 'Intro to security concepts');
    await programs.newProgramModal.closeWithoutSaving();

    await expect(programs.newProgramModal.dialog).not.toBeVisible();
    await expect(programs.programInList(programName)).not.toBeVisible();
  });

  test('TC-009: Duplicate program name is rejected', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    await goToPrograms(programs);

    const programName = uniqueName('Web Development 2026');

    trackProgram(await createProgram(programs, programName, 'Original program description'));
    await expect(programs.programRowsWithName(programName)).toHaveCount(1);

    await openNewProgramModal(programs);
    await programs.newProgramModal.fill(programName, 'Duplicate attempt description');

    const maybeCreate = page.waitForResponse(
      (res) =>
        res.url().includes('/api/programs') &&
        res.request().method() === 'POST' &&
        res.ok(),
      { timeout: 15_000 },
    );
    try {
      await expectDuplicateSubmissionRejected(programs, {
        listName: programName,
        expectedRowCount: 1,
      });
    } finally {
      const unexpected = await maybeCreate.catch(() => null);
      if (unexpected) {
        trackProgram(await programIdFromResponse(unexpected));
      }
    }
  });
});

test.describe('Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    const programs = new ProgramsPage(page);
    await goToPrograms(programs);
  });

  test('TC-010: Program Name with leading and trailing whitespace is handled consistently', async ({
    page,
  }) => {
    const programs = new ProgramsPage(page);
    await openNewProgramModal(programs);
    await programs.newProgramModal.fill('   ', 'Whitespace name test');

    await expect(programs.newProgramModal.createButton).toBeDisabled();
  });

  test('TC-011: Program Name accepts special characters', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('AI & ML (2026) — Cohort #1');

    const createResponsePromise = programs.waitForProgramCreate();
    await openNewProgramModal(programs);
    await programs.newProgramModal.fill(programName, 'Covers AI, ML, and data pipelines');
    await programs.newProgramModal.submit();

    trackProgram(await programIdFromResponse(await createResponsePromise));

    await expect(programs.newProgramModal.dialog).not.toBeVisible();
    await expect(programs.programInList(programName)).toBeVisible();
  });

  test('TC-012: Program Name at minimum valid length (single character)', async ({
    page,
    trackProgram,
  }) => {
    const programs = new ProgramsPage(page);
    const programName = String.fromCharCode(65 + (Date.now() % 26));

    const createResponsePromise = programs.waitForProgramCreate();
    await openNewProgramModal(programs);
    await programs.newProgramModal.fill(programName, 'Single character name boundary test');
    await programs.newProgramModal.submit();

    trackProgram(await programIdFromResponse(await createResponsePromise));

    await expect(programs.newProgramModal.dialog).not.toBeVisible();
    await expect(programs.programInList(programName)).toBeVisible();
  });

  test('TC-013: Program Name at maximum allowed length', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const suffix = Date.now().toString();
    const programName = `${'A'.repeat(Math.max(0, PROGRAM_NAME_MAX_LENGTH - suffix.length))}${suffix}`;
    expect(programName.length).toBe(PROGRAM_NAME_MAX_LENGTH);

    const createResponsePromise = programs.waitForProgramCreate();
    await openNewProgramModal(programs);
    await programs.newProgramModal.fill(programName, 'Max length boundary test');
    await programs.newProgramModal.submit();

    trackProgram(await programIdFromResponse(await createResponsePromise));

    await expect(programs.newProgramModal.dialog).not.toBeVisible();
    await expect(programs.programInList(programName)).toBeVisible();
  });

  test('TC-014: Program Name exceeding maximum length is rejected or truncated', async ({
    page,
    trackProgram,
  }) => {
    const programs = new ProgramsPage(page);
    const suffix = Date.now().toString();
    const overMaxName = `${'A'.repeat(Math.max(0, PROGRAM_NAME_MAX_LENGTH + 1 - suffix.length))}${suffix}`;
    expect(overMaxName.length).toBe(PROGRAM_NAME_MAX_LENGTH + 1);

    let unexpectedId: string | undefined;
    const createWait = programs
      .waitForProgramCreate()
      .then(async (res) => {
        unexpectedId = await programIdFromResponse(res);
      })
      .catch(() => undefined);

    await openNewProgramModal(programs);
    await programs.newProgramModal.fill(overMaxName, 'Over max length test');
    await programs.newProgramModal.submit();

    try {
      await expect(programs.newProgramModal.dialog).toBeVisible({ timeout: 15_000 });
      await expect(programs.programRowsWithName(overMaxName)).toHaveCount(0);
    } finally {
      await Promise.race([createWait, page.waitForTimeout(2_000)]);
      if (unexpectedId) {
        trackProgram(unexpectedId);
      }
    }
  });

  test('TC-015: Description at maximum allowed length', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Cloud Computing 2026');
    const description = 'D'.repeat(DESCRIPTION_MAX_LENGTH);

    const createResponsePromise = programs.waitForProgramCreate();
    await openNewProgramModal(programs);
    await programs.newProgramModal.fill(programName, description);
    await programs.newProgramModal.submit();

    trackProgram(await programIdFromResponse(await createResponsePromise));

    await expect(programs.newProgramModal.dialog).not.toBeVisible();
    await expect(programs.programInList(programName)).toBeVisible();
  });

  test('TC-016: Duplicate program name is case-insensitive (if applicable)', async ({
    page,
    trackProgram,
  }) => {
    const programs = new ProgramsPage(page);
    const suffix = Date.now();
    const originalName = `Web Development 2026-${suffix}`;
    const duplicateAttempt = `web development 2026-${suffix}`;

    trackProgram(await createProgram(programs, originalName, 'Original program'));
    await expect(programs.programRowsWithName(originalName)).toHaveCount(1);

    await openNewProgramModal(programs);
    await programs.newProgramModal.fill(duplicateAttempt, 'Case variation duplicate test');

    const maybeCreate = page.waitForResponse(
      (res) =>
        res.url().includes('/api/programs') &&
        res.request().method() === 'POST' &&
        res.ok(),
      { timeout: 15_000 },
    );
    try {
      await expectDuplicateSubmissionRejected(programs, {
        listName: duplicateAttempt,
        expectedRowCount: 0,
      });
      await expect(programs.programRowsWithName(originalName)).toHaveCount(1);
    } finally {
      const unexpected = await maybeCreate.catch(() => null);
      if (unexpected) {
        trackProgram(await programIdFromResponse(unexpected));
      }
    }
  });

  test('TC-017: Create button enables when Program Name becomes non-empty', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Mobile App Development');

    await openNewProgramModal(programs);

    await expect(programs.newProgramModal.createButton).toBeDisabled();

    await programs.newProgramModal.fill(programName);
    await expect(programs.newProgramModal.createButton).toBeEnabled();

    await programs.newProgramModal.clearProgramName();
    await expect(programs.newProgramModal.createButton).toBeDisabled();
  });

  test('TC-018: Programs page displays heading, subtitle, and program table', async ({ page }) => {
    const programs = new ProgramsPage(page);
    await expect(programs.heading).toBeVisible();
    await expect(programs.subtitle).toBeVisible();

    if (await programs.emptyStateExact.isVisible()) {
      await expect(programs.emptyStateExact).toBeVisible();
      await expect(programs.newProgramButton).toBeVisible();
      return;
    }

    await expect(programs.table).toBeVisible();
    await expect(programs.programColumnHeader).toBeVisible();
    await expect(programs.semesterPanelPlaceholder).toBeVisible();
  });

  test('TC-019: New Program modal exposes AI generation defaults', async ({ page }) => {
    const programs = new ProgramsPage(page);
    await openNewProgramModal(programs);

    await expect(programs.newProgramModal.showAiConfigButton).toBeVisible();
    await expect(programs.newProgramModal.totalProgramHoursLabel).toBeVisible();
    await expect(programs.newProgramModal.targetAudienceLabel).toBeVisible();
    await expect(programs.newProgramModal.focusAreasLabel).toBeVisible();
    await expect(programs.newProgramModal.syncAsyncRatioLabel).toBeVisible();
    await expect(programs.newProgramModal.defaultSessionHoursInput).toHaveValue('4');
    await expect(programs.newProgramModal.defaultExamHoursInput).toHaveValue('3');
  });

  test('TC-020: Description exceeding maximum length is rejected', async ({
    page,
    trackProgram,
  }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Over Max Description');
    const description = 'D'.repeat(DESCRIPTION_MAX_LENGTH + 1);

    let unexpectedId: string | undefined;
    const createWait = programs
      .waitForProgramCreate()
      .then(async (res) => {
        unexpectedId = await programIdFromResponse(res);
      })
      .catch(() => undefined);

    await openNewProgramModal(programs);
    await programs.newProgramModal.fill(programName, description);
    await programs.newProgramModal.submit();

    try {
      await expect(programs.newProgramModal.dialog).toBeVisible({ timeout: 15_000 });
      await expect(programs.programInList(programName)).not.toBeVisible();
    } finally {
      await Promise.race([createWait, page.waitForTimeout(2_000)]);
      if (unexpectedId) {
        trackProgram(unexpectedId);
      }
    }
  });

  test('TC-021: Double-clicking Create creates exactly one program', async ({
    page,
    trackProgram,
  }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Double Click Guard');
    const description = 'Idempotency test';

    const createdIds: string[] = [];
    const onResponse = async (res: Response) => {
      if (
        res.url().includes('/api/programs') &&
        res.request().method() === 'POST' &&
        res.ok()
      ) {
        try {
          createdIds.push(await programIdFromResponse(res));
        } catch {
          // ignore
        }
      }
    };
    page.on('response', onResponse);

    try {
      await openNewProgramModal(programs);
      await programs.newProgramModal.fill(programName, description);
      await programs.newProgramModal.submitByDoubleClick();

      await expect(programs.newProgramModal.dialog).not.toBeVisible({ timeout: 15_000 });
      await expect(programs.programRowsWithName(programName)).toHaveCount(1);
    } finally {
      await page.waitForTimeout(500);
      page.off('response', onResponse);
      for (const id of createdIds) {
        trackProgram(id);
      }
    }
  });

  test('TC-022: AI Generation Config section collapses and expands', async ({ page }) => {
    const programs = new ProgramsPage(page);
    await openNewProgramModal(programs);

    await expect(programs.newProgramModal.showAiConfigButton).toBeVisible();
    await expect(programs.newProgramModal.totalProgramHoursLabel).toBeVisible();

    await programs.newProgramModal.showAiConfig();
    await expect(programs.newProgramModal.hideAiConfigButton).toBeVisible();
    await expect(programs.newProgramModal.targetAudienceLabel).toBeVisible();

    await programs.newProgramModal.hideAiConfig();
    await expect(programs.newProgramModal.showAiConfigButton).toBeVisible();
  });
});
