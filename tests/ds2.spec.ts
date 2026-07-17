import dotenv from 'dotenv';
import path from 'path';
import type { Response } from '@playwright/test';
import { test, expect, extractProgramId } from '../fixtures/cleanup.fixture';
import { LoginPage } from '../pages/LoginPage';
import { ProgramsPage } from '../pages/ProgramsPage';
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

async function login(loginPage: LoginPage, email: string, password: string): Promise<void> {
  await loginPage.login(email, password);
  await expect(loginPage.signOutButton).toBeVisible({ timeout: 15_000 });
}

async function goToPrograms(programs: ProgramsPage): Promise<void> {
  await programs.goto();
  await expect(programs.newProgramButton).toBeVisible();
  await expect(programs.heading).toBeVisible();
  await expect(programs.tableOrEmptyState).toBeVisible({ timeout: 15_000 });
}

async function createProgram(
  programs: ProgramsPage,
  name: string,
  description?: string,
): Promise<string> {
  const createResponsePromise = programs.waitForProgramCreate();
  await programs.createProgram(name, description);
  await expect(programs.newProgramModal.dialog).not.toBeVisible({ timeout: 15_000 });
  await expect(programs.programRow(name)).toHaveCount(1, { timeout: 15_000 });
  return programIdFromResponse(await createResponsePromise);
}

async function openEditModal(programs: ProgramsPage, programName: string): Promise<void> {
  await programs.openEditForm(programName);
  await expect(programs.editProgramModal.dialog).toBeVisible();
  await expect(programs.editProgramModal.programNameInput).toBeVisible();
}

async function closeEditModalWithoutSaving(programs: ProgramsPage): Promise<void> {
  await programs.editProgramModal.closeWithoutSaving();
  await expect(programs.editProgramModal.dialog).not.toBeVisible();
}

async function expectDuplicateNameError(programs: ProgramsPage): Promise<void> {
  await expect(programs.editProgramModal.duplicateError).toBeVisible();
}

const DUPLICATE_CHECK_SETTLE_MS = 1_000;

async function expectDuplicateEditRejected(
  programs: ProgramsPage,
  options: { listName: string; expectedRowCount: number },
): Promise<void> {
  const rows = programs.programRowsWithName(options.listName);
  const countBefore = await rows.count();
  expect(countBefore).toBe(options.expectedRowCount);

  const saveResponse = programs.page.waitForResponse(
    (response) => ['PUT', 'PATCH', 'POST'].includes(response.request().method()),
    { timeout: 15_000 },
  );

  await programs.editProgramModal.save();
  await saveResponse.catch(() => null);
  await programs.page.waitForTimeout(DUPLICATE_CHECK_SETTLE_MS);

  await expect(rows).toHaveCount(options.expectedRowCount);
  await expect(programs.editProgramModal.dialog).toBeVisible();
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

  test('TC-001: Edit form displays current program data on open', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Web Development 2026');
    const description = 'Full-stack web development program';

    trackProgram(await createProgram(programs, programName, description));
    await openEditModal(programs, programName);

    await expect(programs.editProgramModal.programNameInput).toHaveValue(programName);
    await expect(programs.editProgramModal.descriptionInput).toHaveValue(description);
    await expect(programs.editProgramModal.saveButton).toBeVisible();
    await expect(programs.editProgramModal.cancelButton).toBeVisible();
  });

  test('TC-002: Program name update is saved and reflected in the list', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Web Development 2026');
    const updatedName = `${programName} - Updated`;
    const description = 'Full-stack web development program';

    trackProgram(await createProgram(programs, programName, description));
    await openEditModal(programs, programName);
    await programs.editProgramModal.fill(updatedName);
    await programs.editProgramModal.save();

    await expect(programs.editProgramModal.dialog).not.toBeVisible({ timeout: 15_000 });
    await expect(programs.programInList(updatedName)).toBeVisible();
    await expect(programs.programInList(programName)).not.toBeVisible();
  });

  test('TC-003: Unchanged fields are preserved when only Description is edited', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Web Development 2026');
    const originalDescription = 'Full-stack web development program';
    const updatedDescription = 'Updated full-stack curriculum for 2026';

    trackProgram(await createProgram(programs, programName, originalDescription));
    await openEditModal(programs, programName);
    await programs.editProgramModal.fill(undefined, updatedDescription);
    await programs.editProgramModal.save();

    await expect(programs.editProgramModal.dialog).not.toBeVisible({ timeout: 15_000 });
    await expect(programs.programInList(programName)).toBeVisible();

    await openEditModal(programs, programName);
    await expect(programs.editProgramModal.programNameInput).toHaveValue(programName);
    await expect(programs.editProgramModal.descriptionInput).toHaveValue(updatedDescription);
  });

  test('TC-004: Save succeeds when no field values are changed', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Cloud Computing 2026');
    const description = 'Intro to cloud platforms and services';

    trackProgram(await createProgram(programs, programName, description));
    await openEditModal(programs, programName);
    await programs.editProgramModal.save();

    await expect(programs.editProgramModal.dialog).not.toBeVisible({ timeout: 15_000 });
    await expect(programs.programInList(programName)).toBeVisible();

    await openEditModal(programs, programName);
    await expect(programs.editProgramModal.programNameInput).toHaveValue(programName);
    await expect(programs.editProgramModal.descriptionInput).toHaveValue(description);
  });
});

test.describe('Negative flows', () => {
  test('TC-005: Program is not updated when Program Name is cleared', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    await goToPrograms(programs);

    const programName = uniqueName('Web Development 2026');
    const description = 'Full-stack web development program';

    trackProgram(await createProgram(programs, programName, description));
    await openEditModal(programs, programName);
    await programs.editProgramModal.clearProgramName();

    await expect(programs.editProgramModal.saveButton).toBeDisabled();
    await programs.editProgramModal.save({ force: true });
    await expect(programs.editProgramModal.dialog).toBeVisible();

    await closeEditModalWithoutSaving(programs);
    await openEditModal(programs, programName);
    await expect(programs.editProgramModal.programNameInput).toHaveValue(programName);
    await expect(programs.editProgramModal.descriptionInput).toHaveValue(description);
  });

  test('TC-006: Dismissing the edit modal does not persist changes', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    await goToPrograms(programs);

    const programName = uniqueName('Cybersecurity Basics');
    const description = 'Intro to security concepts';

    trackProgram(await createProgram(programs, programName, description));
    await openEditModal(programs, programName);
    await programs.editProgramModal.fill('Cybersecurity Advanced', 'Should not be saved');
    await closeEditModalWithoutSaving(programs);

    await expect(programs.programInList(programName)).toBeVisible();
    await expect(programs.programInList('Cybersecurity Advanced')).not.toBeVisible();

    await openEditModal(programs, programName);
    await expect(programs.editProgramModal.programNameInput).toHaveValue(programName);
    await expect(programs.editProgramModal.descriptionInput).toHaveValue(description);
  });

  test.describe('without admin session', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('TC-007: Non-admin user cannot edit a program', async ({ page }) => {
      test.skip(
        !NON_ADMIN_EMAIL || !NON_ADMIN_PASSWORD,
        'Set DIDAXIS_NON_ADMIN_EMAIL and DIDAXIS_NON_ADMIN_PASSWORD in .env',
      );

      const loginPage = new LoginPage(page);
      const programs = new ProgramsPage(page);

      await login(loginPage, NON_ADMIN_EMAIL, NON_ADMIN_PASSWORD);
      await programs.goto();
      await expect(programs.table).toBeVisible({ timeout: 15_000 });

      await expect(programs.anyEditButton).not.toBeVisible();
      await expect(programs.editProgramModal.dialog).not.toBeVisible();
    });

    test('TC-008: Unauthenticated user cannot edit a program', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const programs = new ProgramsPage(page);

      await programs.goto();

      await expect(page).toHaveURL(/\/login/);
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(programs.editProgramModal.dialog).not.toBeVisible();
    });
  });

  test('TC-009: Renaming a program to an existing name is rejected', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    await goToPrograms(programs);

    const firstName = uniqueName('Web Development 2026');
    const secondName = uniqueName('Data Science Fundamentals');

    trackProgram(await createProgram(programs, firstName, 'Full-stack web development program'));
    trackProgram(await createProgram(programs, secondName, 'Foundations of data science'));

    await openEditModal(programs, firstName);
    await programs.editProgramModal.fill(secondName);
    await expectDuplicateEditRejected(programs, {
      listName: secondName,
      expectedRowCount: 1,
    });

    await expect(programs.programInList(firstName)).toBeVisible();
    await expect(programs.programInList(secondName)).toBeVisible();
  });

  test('TC-010: Failed edit attempt does not create a duplicate program entry', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    await goToPrograms(programs);

    const programName = uniqueName('Mobile App Development');

    trackProgram(await createProgram(programs, programName, 'iOS and Android development'));
    await openEditModal(programs, programName);
    await programs.editProgramModal.clearProgramName();

    await expect(programs.editProgramModal.saveButton).toBeDisabled();
    await programs.editProgramModal.save({ force: true });

    await expect(programs.editProgramModal.dialog).toBeVisible();
    await expect(programs.programRowsWithName(programName)).toHaveCount(1);
  });
});

test.describe('Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    const programs = new ProgramsPage(page);
    await goToPrograms(programs);
  });

  test('TC-011: Whitespace-only Program Name is treated as invalid on edit', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Web Development 2026');

    trackProgram(await createProgram(programs, programName, 'Full-stack web development program'));
    await openEditModal(programs, programName);
    await programs.editProgramModal.fill('   ');

    await expect(programs.editProgramModal.saveButton).toBeDisabled();
    await expect(programs.programInList(programName)).toBeVisible();
  });

  test('TC-012: Edited Program Name with special characters is saved and displayed correctly', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Web Development 2026');
    const specialName = uniqueName('AI & ML (2026) — Cohort #1');

    trackProgram(await createProgram(programs, programName, 'Full-stack web development program'));
    await openEditModal(programs, programName);
    await programs.editProgramModal.fill(specialName);
    await programs.editProgramModal.save();

    await expect(programs.editProgramModal.dialog).not.toBeVisible({ timeout: 15_000 });
    await expect(programs.programInList(specialName)).toBeVisible();
  });

  test('TC-013: Program Name can be edited to a single non-whitespace character', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Temporary Program');
    const singleCharName = String.fromCharCode(65 + (Date.now() % 26));

    trackProgram(await createProgram(programs, programName, 'Boundary test program'));
    await openEditModal(programs, programName);
    await programs.editProgramModal.fill(singleCharName);
    await programs.editProgramModal.save();

    await expect(programs.editProgramModal.dialog).not.toBeVisible({ timeout: 15_000 });
    await expect(programs.programInList(singleCharName)).toBeVisible();
  });

  test('TC-014: Program Name at maximum allowed length is accepted on edit', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Web Development 2026');
    const suffix = Date.now().toString();
    const maxName = `${'B'.repeat(Math.max(0, PROGRAM_NAME_MAX_LENGTH - suffix.length))}${suffix}`;
    expect(maxName.length).toBe(PROGRAM_NAME_MAX_LENGTH);

    trackProgram(await createProgram(programs, programName, 'Full-stack web development program'));
    await openEditModal(programs, programName);
    await programs.editProgramModal.fill(maxName);
    await programs.editProgramModal.save();

    await expect(programs.editProgramModal.dialog).not.toBeVisible({ timeout: 15_000 });
    await expect(programs.programInList(maxName)).toBeVisible();
  });

  test('TC-015: Program Name exceeding maximum length is rejected or blocked on edit', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Web Development 2026');
    const suffix = Date.now().toString();
    const overMaxName = `${'B'.repeat(Math.max(0, PROGRAM_NAME_MAX_LENGTH + 1 - suffix.length))}${suffix}`;
    expect(overMaxName.length).toBe(PROGRAM_NAME_MAX_LENGTH + 1);

    trackProgram(await createProgram(programs, programName, 'Full-stack web development program'));
    await openEditModal(programs, programName);
    await programs.editProgramModal.fill(overMaxName);

    const savedValue = await programs.editProgramModal.programNameInput.inputValue();
    const blockedBeforeSubmit =
      savedValue.length <= PROGRAM_NAME_MAX_LENGTH ||
      (await programs.editProgramModal.saveButton.isDisabled());

    if (!blockedBeforeSubmit) {
      await programs.editProgramModal.save();
      await programs.page.waitForTimeout(DUPLICATE_CHECK_SETTLE_MS);
    }

    const modalStillOpen = await programs.editProgramModal.dialog.isVisible().catch(() => false);
    const validationErrorVisible = modalStillOpen
      ? await programs.editProgramModal.lengthError.isVisible().catch(() => false)
      : false;
    const truncatedInField =
      modalStillOpen &&
      (await programs.editProgramModal.programNameInput.inputValue()).length <= PROGRAM_NAME_MAX_LENGTH;
    const overMaxListed = await programs.programRowsWithName(overMaxName).count();

    expect(
      blockedBeforeSubmit ||
        truncatedInField ||
        validationErrorVisible ||
        modalStillOpen ||
        overMaxListed === 0,
    ).toBeTruthy();
    await expect(programs.programInList(programName)).toBeVisible();
  });

  test('TC-016: Description at maximum allowed length is saved on edit', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Cloud Computing 2026');
    const description = 'D'.repeat(DESCRIPTION_MAX_LENGTH);

    trackProgram(await createProgram(programs, programName, 'Intro to cloud platforms'));
    await openEditModal(programs, programName);
    await programs.editProgramModal.fill(undefined, description);
    await programs.editProgramModal.save();

    await expect(programs.editProgramModal.dialog).not.toBeVisible({ timeout: 15_000 });
    await openEditModal(programs, programName);
    await expect(programs.editProgramModal.descriptionInput).toHaveValue(description);
  });

  test('TC-017: Duplicate Program Name check is case-insensitive on edit (if applicable)', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const firstName = uniqueName('Web Development 2026');
    const secondName = uniqueName('Data Science Fundamentals');
    const duplicateAttempt = secondName.toLowerCase();

    trackProgram(await createProgram(programs, firstName, 'Full-stack web development program'));
    trackProgram(await createProgram(programs, secondName, 'Foundations of data science'));

    await openEditModal(programs, firstName);
    await programs.editProgramModal.fill(duplicateAttempt);
    await expectDuplicateEditRejected(programs, {
      listName: duplicateAttempt,
      expectedRowCount: 0,
    });
    await expect(programs.programInList(firstName)).toBeVisible();
    await expect(programs.programRowsWithName(secondName)).toHaveCount(1);
  });

  test('TC-018: Save button state updates dynamically when Program Name is edited', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Web Development 2026');

    trackProgram(await createProgram(programs, programName, 'Full-stack web development program'));
    await openEditModal(programs, programName);

    await expect(programs.editProgramModal.saveButton).toBeEnabled();

    await programs.editProgramModal.clearProgramName();
    await expect(programs.editProgramModal.saveButton).toBeDisabled();

    await programs.editProgramModal.fill(`${programName} - Revised`);
    await expect(programs.editProgramModal.saveButton).toBeEnabled();

    await programs.editProgramModal.fill('   ');
    await expect(programs.editProgramModal.saveButton).toBeDisabled();
  });

  test('TC-019: Description can be cleared to empty on edit', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Data Science Fundamentals');
    const description = 'Foundations of data science';

    trackProgram(await createProgram(programs, programName, description));
    await openEditModal(programs, programName);
    await programs.editProgramModal.clearDescription();
    await programs.editProgramModal.save();

    await expect(programs.editProgramModal.dialog).not.toBeVisible({ timeout: 15_000 });
    await expect(programs.programInList(programName)).toBeVisible();

    await openEditModal(programs, programName);
    await expect(programs.editProgramModal.programNameInput).toHaveValue(programName);
    await expect(programs.editProgramModal.descriptionInput).toHaveValue('');
  });

  test('TC-020: Edit modal exposes AI Generation Config section', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Web Development 2026');

    trackProgram(await createProgram(programs, programName, 'Full-stack web development program'));
    await openEditModal(programs, programName);

    await expect(programs.editProgramModal.programNameRequiredLabel).toBeVisible();
    await expect(programs.editProgramModal.showAiConfigButton).toBeVisible();
  });

  test('TC-021: Description exceeding maximum length is rejected on edit', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Cloud Computing 2026');
    const overMaxDescription = 'D'.repeat(DESCRIPTION_MAX_LENGTH + 1);

    trackProgram(await createProgram(programs, programName, 'Intro to cloud platforms'));
    await openEditModal(programs, programName);
    await programs.editProgramModal.fill(undefined, overMaxDescription);
    await programs.editProgramModal.save();
    await programs.page.waitForTimeout(DUPLICATE_CHECK_SETTLE_MS);

    const modalStillOpen = await programs.editProgramModal.dialog.isVisible();
    const validationErrorVisible = modalStillOpen
      ? await programs.editProgramModal.lengthError.isVisible().catch(() => false)
      : false;

    expect(modalStillOpen || validationErrorVisible).toBeTruthy();
    await expect(programs.programInList(programName)).toBeVisible();
  });
});
