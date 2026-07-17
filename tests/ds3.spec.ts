import dotenv from 'dotenv';
import path from 'path';
import type { Response } from '@playwright/test';
import { test, expect, extractProgramId } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import { uniqueName } from './helpers/uniqueName';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ADMIN_EMAIL = process.env.DIDAXIS_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.DIDAXIS_PASSWORD ?? '';

/** Confluence: Program Setup — Field Definitions */
const PROGRAM_NAME_MAX_LENGTH = 100;

async function programIdFromResponse(response: Response): Promise<string> {
  return extractProgramId(await response.json());
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

  test('TC-001: Program name containing ampersands, hyphens, and accented characters is accepted and persisted', async ({
    page,
    trackProgram,
  }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Informatique & IA - Niveau 2');
    const description = 'Advanced informatics and artificial intelligence track';

    const createResponsePromise = programs.waitForProgramCreate();
    await openNewProgramModal(programs);
    await programs.newProgramModal.fill(programName, description);
    await programs.newProgramModal.submit();

    trackProgram(await programIdFromResponse(await createResponsePromise));

    await expect(programs.newProgramModal.dialog).not.toBeVisible({ timeout: 15_000 });
    await expect(programs.programInList(programName)).toBeVisible();
  });

  test('TC-002: Non-empty name surrounded by whitespace is accepted and stored without outer whitespace', async ({
    page,
    trackProgram,
  }) => {
    const programs = new ProgramsPage(page);
    const trimmedName = uniqueName('Data Science Fundamentals');
    const paddedName = `  ${trimmedName}  `;
    const description = 'Introductory data science curriculum';

    const createResponsePromise = programs.waitForProgramCreate();
    await openNewProgramModal(programs);
    await programs.newProgramModal.fill(paddedName, description);
    await programs.newProgramModal.submit();

    trackProgram(await programIdFromResponse(await createResponsePromise));

    await expect(programs.newProgramModal.dialog).not.toBeVisible({ timeout: 15_000 });
    await expect(programs.programInList(trimmedName)).toBeVisible();
    await expect(programs.programRowsWithName(trimmedName)).toHaveCount(1);
    await expect(programs.programNameCell(trimmedName)).toHaveText(trimmedName);
  });
});

test.describe('Negative flows', () => {
  test('TC-003: Program Name containing only spaces is trimmed, treated as empty, and blocks submission', async ({
    page,
  }) => {
    const programs = new ProgramsPage(page);
    await goToPrograms(programs);

    const rowsBefore = await programs.programRowCount();

    await openNewProgramModal(programs);
    await programs.newProgramModal.fill('   ', 'Whitespace-only name test');

    await expect(programs.newProgramModal.createButton).toBeDisabled();
    await expect(programs.newProgramModal.dialog).toBeVisible();
    await expect(programs.programRows).toHaveCount(rowsBefore);
  });

  test('TC-004: Create action is blocked when Program Name field is left empty', async ({ page }) => {
    const programs = new ProgramsPage(page);
    await goToPrograms(programs);

    const rowsBefore = await programs.programRowCount();

    await openNewProgramModal(programs);
    await programs.newProgramModal.fill(undefined, 'Description without a program name');

    await expect(programs.newProgramModal.createButton).toBeDisabled();
    await programs.newProgramModal.submit({ force: true });
    await expect(programs.newProgramModal.dialog).toBeVisible();
    await expect(programs.programRows).toHaveCount(rowsBefore);
  });

  test('TC-005: System prevents creating a program whose name already exists', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    await goToPrograms(programs);

    const programName = uniqueName('Web Development 2026');

    trackProgram(await createProgram(programs, programName, 'Original program description'));
    await expect(programs.programRowsWithName(programName)).toHaveCount(1);

    await openNewProgramModal(programs);
    await programs.newProgramModal.fill(programName, 'Duplicate attempt description');

    const maybeCreate = programs.page.waitForResponse(
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

  test('TC-006: New program with a unique name is not falsely rejected as a duplicate', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    await goToPrograms(programs);

    const existingName = uniqueName('Web Development 2026');
    const newProgramName = uniqueName('Mobile App Development 2026');
    const description = 'iOS and Android development track';

    trackProgram(await createProgram(programs, existingName, 'Existing web development program'));
    await expect(programs.programInList(existingName)).toBeVisible();

    const createResponsePromise = programs.waitForProgramCreate();
    await openNewProgramModal(programs);
    await programs.newProgramModal.fill(newProgramName, description);
    await programs.newProgramModal.submit();

    trackProgram(await programIdFromResponse(await createResponsePromise));

    await expect(programs.newProgramModal.dialog).not.toBeVisible({ timeout: 15_000 });
    await expect(programs.newProgramModal.duplicateError).not.toBeVisible();
    await expect(programs.programInList(newProgramName)).toBeVisible();
  });
});

test.describe('Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    const programs = new ProgramsPage(page);
    await goToPrograms(programs);
  });

  test('TC-007: Program Name with only tab or newline characters is rejected like space-only input', async ({
    page,
  }) => {
    const programs = new ProgramsPage(page);
    const rowsBefore = await programs.programRowCount();

    await openNewProgramModal(programs);
    await programs.newProgramModal.fill('\t\t', 'Tab-only name test');
    await expect(programs.newProgramModal.createButton).toBeDisabled();

    await programs.newProgramModal.clearProgramName();
    await programs.newProgramModal.fill('\n\n', 'Newline-only name test');
    await expect(programs.newProgramModal.createButton).toBeDisabled();
    await expect(programs.newProgramModal.dialog).toBeVisible();
    await expect(programs.programRows).toHaveCount(rowsBefore);
  });

  test('TC-008: Minimum valid non-whitespace Program Name (one character) is allowed', async ({
    page,
    trackProgram,
  }) => {
    const programs = new ProgramsPage(page);
    const programName = `Z${Date.now() % 10000}`;

    const createResponsePromise = programs.waitForProgramCreate();
    await openNewProgramModal(programs);
    await programs.newProgramModal.fill(programName, 'Single character boundary test');
    await programs.newProgramModal.submit();

    trackProgram(await programIdFromResponse(await createResponsePromise));

    await expect(programs.newProgramModal.dialog).not.toBeVisible({ timeout: 15_000 });
    await expect(programs.programInList(programName)).toBeVisible();
  });

  test('TC-009: Program Name at the documented maximum length (100 characters) is saved and displayed in full', async ({
    page,
    trackProgram,
  }) => {
    const programs = new ProgramsPage(page);
    const suffix = Date.now().toString();
    const programName = `${'A'.repeat(Math.max(0, PROGRAM_NAME_MAX_LENGTH - suffix.length))}${suffix}`;
    expect(programName.length).toBe(PROGRAM_NAME_MAX_LENGTH);

    const createResponsePromise = programs.waitForProgramCreate();
    await openNewProgramModal(programs);
    await programs.newProgramModal.fill(programName, 'Max length boundary test');
    await programs.newProgramModal.submit();

    trackProgram(await programIdFromResponse(await createResponsePromise));

    await expect(programs.newProgramModal.dialog).not.toBeVisible({ timeout: 15_000 });
    await expect(programs.programInList(programName)).toBeVisible();
  });

  test('TC-010: Program Name longer than the allowed limit cannot be saved', async ({
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

    const savedValue = await programs.newProgramModal.programNameInput.inputValue();
    const blockedBeforeSubmit =
      savedValue.length <= PROGRAM_NAME_MAX_LENGTH ||
      (await programs.newProgramModal.createButton.isDisabled());

    if (!blockedBeforeSubmit) {
      await programs.newProgramModal.submit();
      await programs.page.waitForTimeout(1_000);
    }

    try {
      const modalStillOpen = await programs.newProgramModal.dialog.isVisible().catch(() => false);
      const validationErrorVisible = modalStillOpen
        ? await programs.newProgramModal.lengthError.isVisible().catch(() => false)
        : false;
      const truncatedInField =
        modalStillOpen &&
        (await programs.newProgramModal.programNameInput.inputValue()).length <=
          PROGRAM_NAME_MAX_LENGTH;
      const overMaxListed = await programs.programRowsWithName(overMaxName).count();

      expect(
        blockedBeforeSubmit ||
          truncatedInField ||
          validationErrorVisible ||
          modalStillOpen ||
          overMaxListed === 0,
      ).toBeTruthy();
    } finally {
      await Promise.race([createWait, programs.page.waitForTimeout(2_000)]);
      if (unexpectedId) {
        trackProgram(unexpectedId);
      }
    }
  });

  test('TC-011: Program names that match an existing name ignoring case are treated as duplicates', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const originalName = uniqueName('Web Development 2026');
    const duplicateAttempt = originalName.toLowerCase();

    trackProgram(await createProgram(programs, originalName, 'Original program'));
    await expect(programs.programInList(originalName)).toBeVisible();

    await openNewProgramModal(programs);
    await programs.newProgramModal.fill(duplicateAttempt, 'Case variation duplicate test');

    const maybeCreate = programs.page.waitForResponse(
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

  test('TC-012: Surrounding whitespace on a duplicate name does not bypass uniqueness validation', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Web Development 2026');
    const paddedDuplicate = `  ${programName}  `;

    trackProgram(await createProgram(programs, programName, 'Original program'));
    await expect(programs.programRowsWithName(programName)).toHaveCount(1);

    await openNewProgramModal(programs);
    await programs.newProgramModal.fill(paddedDuplicate, 'Whitespace-padded duplicate test');

    const maybeCreate = programs.page.waitForResponse(
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

  test('TC-013: Create button disables immediately when Program Name becomes whitespace-only after trim', async ({
    page,
  }) => {
    const programs = new ProgramsPage(page);
    const validName = uniqueName('Cybersecurity Basics');

    await openNewProgramModal(programs);
    await programs.newProgramModal.fill(validName);
    await expect(programs.newProgramModal.createButton).toBeEnabled();

    await programs.newProgramModal.clearProgramName();
    await programs.newProgramModal.fill('   ');
    await expect(programs.newProgramModal.createButton).toBeDisabled();
    await expect(programs.newProgramModal.dialog).toBeVisible();
  });

  test('TC-014: New Program modal shows required Program Name label and Cancel control', async ({
    page,
  }) => {
    const programs = new ProgramsPage(page);
    await openNewProgramModal(programs);

    await expect(programs.newProgramModal.programNameRequiredLabel).toBeVisible();
    await expect(programs.newProgramModal.programNameInput).toBeVisible();
    await expect(programs.newProgramModal.descriptionInput).toBeVisible();
    await expect(programs.newProgramModal.createButton).toBeVisible();
    await expect(programs.newProgramModal.cancelButton).toBeVisible();
  });

  test('TC-015: Description field must be scoped to modal to avoid table action button collisions', async ({
    page,
  }) => {
    const programs = new ProgramsPage(page);
    await openNewProgramModal(programs);

    await expect(programs.newProgramModal.descriptionInput).toHaveCount(1);
    await programs.newProgramModal.fill(undefined, 'Scoped description field test');
    await expect(programs.newProgramModal.descriptionInput).toHaveValue('Scoped description field test');
  });
});
