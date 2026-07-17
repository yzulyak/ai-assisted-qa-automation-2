import dotenv from 'dotenv';
import path from 'path';
import type { Page, Response } from '@playwright/test';
import { test, expect } from '../fixtures/cleanup.fixture';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';
const ADMIN_EMAIL = process.env.DIDAXIS_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.DIDAXIS_PASSWORD ?? '';
const NON_ADMIN_EMAIL = process.env.DIDAXIS_NON_ADMIN_EMAIL ?? '';
const NON_ADMIN_PASSWORD = process.env.DIDAXIS_NON_ADMIN_PASSWORD ?? '';

/** Confluence: Program Setup — Field Definitions */
const PROGRAM_NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;

function uniqueName(base: string): string {
  return `${base}-${Date.now()}`;
}

function newProgramButton(page: Page) {
  return page.getByRole('button', { name: '+ New Program' });
}

function newProgramDialog(page: Page) {
  return page.getByRole('dialog', { name: 'New Program' });
}

function editProgramDialog(page: Page) {
  return page.getByRole('dialog', { name: 'Edit Program' });
}

function programNameField(page: Page) {
  return editProgramDialog(page).getByLabel('Program Name');
}

function descriptionField(page: Page) {
  return editProgramDialog(page).getByLabel('Description');
}

function saveButton(page: Page) {
  return editProgramDialog(page).getByRole('button', { name: 'Save' });
}

function cancelButton(page: Page) {
  return editProgramDialog(page).getByRole('button', { name: 'Cancel' });
}

function dialogCloseButton(page: Page) {
  return editProgramDialog(page).getByRole('banner').getByRole('button');
}

function programInList(page: Page, name: string) {
  return page.locator('table tbody').getByText(name, { exact: true });
}

function programRow(page: Page, name: string) {
  return page.locator('table tbody tr').filter({
    has: page.getByText(name, { exact: true }),
  });
}

function programRowsWithName(page: Page, name: string) {
  return programRow(page, name);
}

function waitForProgramCreate(page: Page) {
  return page.waitForResponse(
    (res) =>
      res.url().includes('/api/programs') &&
      res.request().method() === 'POST' &&
      res.ok(),
  );
}

async function programIdFromResponse(response: Response): Promise<string> {
  const body = await response.json();
  return body.data.id;
}

function duplicateErrorLocator(page: Page) {
  return editProgramDialog(page).getByText(/already exists|name.*taken|already been used|duplicate/i);
}

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible({ timeout: 15_000 });
}

async function loginAsAdmin(page: Page): Promise<void> {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
}

async function goToPrograms(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/programs`);
  await expect(newProgramButton(page)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Programs', level: 2 })).toBeVisible();
  await expect(page.locator('table tbody')).toBeVisible({ timeout: 15_000 });
}

async function createProgram(
  page: Page,
  name: string,
  description?: string,
): Promise<string> {
  const createResponsePromise = waitForProgramCreate(page);
  await newProgramButton(page).click();
  const dialog = newProgramDialog(page);
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Program Name').fill(name);
  if (description !== undefined) {
    await dialog.getByLabel('Description').fill(description);
  }
  await dialog.getByRole('button', { name: 'Create' }).click();
  await expect(dialog).not.toBeVisible({ timeout: 15_000 });
  await expect(programRow(page, name)).toHaveCount(1, { timeout: 15_000 });
  return programIdFromResponse(await createResponsePromise);
}

async function openEditModal(page: Page, programName: string): Promise<void> {
  await programRow(page, programName)
    .getByRole('button', { name: `Edit ${programName}` })
    .click();
  await expect(editProgramDialog(page)).toBeVisible();
  await expect(programNameField(page)).toBeVisible();
}

async function closeEditModalWithoutSaving(page: Page): Promise<void> {
  const dialog = editProgramDialog(page);

  if (await cancelButton(page).isVisible()) {
    await cancelButton(page).click();
  } else if (await dialogCloseButton(page).isVisible()) {
    await dialogCloseButton(page).click();
  } else {
    await page.keyboard.press('Escape');
  }

  await expect(dialog).not.toBeVisible();
}

async function expectDuplicateNameError(page: Page): Promise<void> {
  await expect(duplicateErrorLocator(page)).toBeVisible();
}

const DUPLICATE_CHECK_SETTLE_MS = 1_000;

async function expectDuplicateEditRejected(
  page: Page,
  options: { listName: string; expectedRowCount: number },
): Promise<void> {
  const rows = programRowsWithName(page, options.listName);
  const countBefore = await rows.count();
  expect(countBefore).toBe(options.expectedRowCount);

  const saveResponse = page.waitForResponse(
    (response) => ['PUT', 'PATCH', 'POST'].includes(response.request().method()),
    { timeout: 15_000 },
  );

  await saveButton(page).click();
  await saveResponse.catch(() => null);
  await page.waitForTimeout(DUPLICATE_CHECK_SETTLE_MS);

  await expect(rows).toHaveCount(options.expectedRowCount);
  await expect(editProgramDialog(page)).toBeVisible();
  await expectDuplicateNameError(page);
}

test.beforeEach(async () => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'Set DIDAXIS_EMAIL and DIDAXIS_PASSWORD in .env',
  );
});

test.describe('Positive flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);
  });

  test('TC-001: Edit form displays current program data on open', async ({ page, trackProgram }) => {
    const programName = uniqueName('Web Development 2026');
    const description = 'Full-stack web development program';

    trackProgram(await createProgram(page, programName, description));
    await openEditModal(page, programName);

    await expect(programNameField(page)).toHaveValue(programName);
    await expect(descriptionField(page)).toHaveValue(description);
    await expect(saveButton(page)).toBeVisible();
    await expect(cancelButton(page)).toBeVisible();
  });

  test('TC-002: Program name update is saved and reflected in the list', async ({ page, trackProgram }) => {
    const programName = uniqueName('Web Development 2026');
    const updatedName = `${programName} - Updated`;
    const description = 'Full-stack web development program';

    trackProgram(await createProgram(page, programName, description));
    await openEditModal(page, programName);
    await programNameField(page).fill(updatedName);
    await saveButton(page).click();

    await expect(editProgramDialog(page)).not.toBeVisible({ timeout: 15_000 });
    await expect(programInList(page, updatedName)).toBeVisible();
    await expect(programInList(page, programName)).not.toBeVisible();
  });

  test('TC-003: Unchanged fields are preserved when only Description is edited', async ({ page, trackProgram }) => {
    const programName = uniqueName('Web Development 2026');
    const originalDescription = 'Full-stack web development program';
    const updatedDescription = 'Updated full-stack curriculum for 2026';

    trackProgram(await createProgram(page, programName, originalDescription));
    await openEditModal(page, programName);
    await descriptionField(page).fill(updatedDescription);
    await saveButton(page).click();

    await expect(editProgramDialog(page)).not.toBeVisible({ timeout: 15_000 });
    await expect(programInList(page, programName)).toBeVisible();

    await openEditModal(page, programName);
    await expect(programNameField(page)).toHaveValue(programName);
    await expect(descriptionField(page)).toHaveValue(updatedDescription);
  });

  test('TC-004: Save succeeds when no field values are changed', async ({ page, trackProgram }) => {
    const programName = uniqueName('Cloud Computing 2026');
    const description = 'Intro to cloud platforms and services';

    trackProgram(await createProgram(page, programName, description));
    await openEditModal(page, programName);
    await saveButton(page).click();

    await expect(editProgramDialog(page)).not.toBeVisible({ timeout: 15_000 });
    await expect(programInList(page, programName)).toBeVisible();

    await openEditModal(page, programName);
    await expect(programNameField(page)).toHaveValue(programName);
    await expect(descriptionField(page)).toHaveValue(description);
  });
});

test.describe('Negative flows', () => {
  test('TC-005: Program is not updated when Program Name is cleared', async ({ page, trackProgram }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);

    const programName = uniqueName('Web Development 2026');
    const description = 'Full-stack web development program';

    trackProgram(await createProgram(page, programName, description));
    await openEditModal(page, programName);
    await programNameField(page).clear();

    await expect(saveButton(page)).toBeDisabled();
    await saveButton(page).click({ force: true });
    await expect(editProgramDialog(page)).toBeVisible();

    await closeEditModalWithoutSaving(page);
    await openEditModal(page, programName);
    await expect(programNameField(page)).toHaveValue(programName);
    await expect(descriptionField(page)).toHaveValue(description);
  });

  test('TC-006: Dismissing the edit modal does not persist changes', async ({ page, trackProgram }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);

    const programName = uniqueName('Cybersecurity Basics');
    const description = 'Intro to security concepts';

    trackProgram(await createProgram(page, programName, description));
    await openEditModal(page, programName);
    await programNameField(page).fill('Cybersecurity Advanced');
    await descriptionField(page).fill('Should not be saved');
    await closeEditModalWithoutSaving(page);

    await expect(programInList(page, programName)).toBeVisible();
    await expect(programInList(page, 'Cybersecurity Advanced')).not.toBeVisible();

    await openEditModal(page, programName);
    await expect(programNameField(page)).toHaveValue(programName);
    await expect(descriptionField(page)).toHaveValue(description);
  });

  test('TC-007: Non-admin user cannot edit a program', async ({ page }) => {
    test.skip(
      !NON_ADMIN_EMAIL || !NON_ADMIN_PASSWORD,
      'Set DIDAXIS_NON_ADMIN_EMAIL and DIDAXIS_NON_ADMIN_PASSWORD in .env',
    );

    await login(page, NON_ADMIN_EMAIL, NON_ADMIN_PASSWORD);
    await page.goto(`${BASE_URL}/programs`);
    await expect(page.locator('table tbody')).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole('button', { name: /^Edit / })).not.toBeVisible();
    await expect(editProgramDialog(page)).not.toBeVisible();
  });

  test('TC-008: Unauthenticated user cannot edit a program', async ({ page }) => {
    await page.goto(`${BASE_URL}/programs`);

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(editProgramDialog(page)).not.toBeVisible();
  });

  test('TC-009: Renaming a program to an existing name is rejected', async ({ page, trackProgram }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);

    const firstName = uniqueName('Web Development 2026');
    const secondName = uniqueName('Data Science Fundamentals');

    trackProgram(await createProgram(page, firstName, 'Full-stack web development program'));
    trackProgram(await createProgram(page, secondName, 'Foundations of data science'));

    await openEditModal(page, firstName);
    await programNameField(page).fill(secondName);
    await expectDuplicateEditRejected(page, {
      listName: secondName,
      expectedRowCount: 1,
    });

    await expect(programInList(page, firstName)).toBeVisible();
    await expect(programInList(page, secondName)).toBeVisible();
  });

  test('TC-010: Failed edit attempt does not create a duplicate program entry', async ({ page, trackProgram }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);

    const programName = uniqueName('Mobile App Development');

    trackProgram(await createProgram(page, programName, 'iOS and Android development'));
    await openEditModal(page, programName);
    await programNameField(page).clear();

    await expect(saveButton(page)).toBeDisabled();
    await saveButton(page).click({ force: true });

    await expect(editProgramDialog(page)).toBeVisible();
    await expect(programRowsWithName(page, programName)).toHaveCount(1);
  });
});

test.describe('Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);
  });

  test('TC-011: Whitespace-only Program Name is treated as invalid on edit', async ({ page, trackProgram }) => {
    const programName = uniqueName('Web Development 2026');

    trackProgram(await createProgram(page, programName, 'Full-stack web development program'));
    await openEditModal(page, programName);
    await programNameField(page).fill('   ');

    await expect(saveButton(page)).toBeDisabled();
    await expect(programInList(page, programName)).toBeVisible();
  });

  test('TC-012: Edited Program Name with special characters is saved and displayed correctly', async ({ page, trackProgram }) => {
    const programName = uniqueName('Web Development 2026');
    const specialName = uniqueName('AI & ML (2026) — Cohort #1');

    trackProgram(await createProgram(page, programName, 'Full-stack web development program'));
    await openEditModal(page, programName);
    await programNameField(page).fill(specialName);
    await saveButton(page).click();

    await expect(editProgramDialog(page)).not.toBeVisible({ timeout: 15_000 });
    await expect(programInList(page, specialName)).toBeVisible();
  });

  test('TC-013: Program Name can be edited to a single non-whitespace character', async ({ page, trackProgram }) => {
    const programName = uniqueName('Temporary Program');
    const singleCharName = String.fromCharCode(65 + (Date.now() % 26));

    trackProgram(await createProgram(page, programName, 'Boundary test program'));
    await openEditModal(page, programName);
    await programNameField(page).fill(singleCharName);
    await saveButton(page).click();

    await expect(editProgramDialog(page)).not.toBeVisible({ timeout: 15_000 });
    await expect(programInList(page, singleCharName)).toBeVisible();
  });

  test('TC-014: Program Name at maximum allowed length is accepted on edit', async ({ page, trackProgram }) => {
    const programName = uniqueName('Web Development 2026');
    const suffix = Date.now().toString();
    const maxName = `${'B'.repeat(Math.max(0, PROGRAM_NAME_MAX_LENGTH - suffix.length))}${suffix}`;
    expect(maxName.length).toBe(PROGRAM_NAME_MAX_LENGTH);

    trackProgram(await createProgram(page, programName, 'Full-stack web development program'));
    await openEditModal(page, programName);
    await programNameField(page).fill(maxName);
    await saveButton(page).click();

    await expect(editProgramDialog(page)).not.toBeVisible({ timeout: 15_000 });
    await expect(programInList(page, maxName)).toBeVisible();
  });

  test('TC-015: Program Name exceeding maximum length is rejected or blocked on edit', async ({ page, trackProgram }) => {
    const programName = uniqueName('Web Development 2026');
    const suffix = Date.now().toString();
    const overMaxName = `${'B'.repeat(Math.max(0, PROGRAM_NAME_MAX_LENGTH + 1 - suffix.length))}${suffix}`;
    expect(overMaxName.length).toBe(PROGRAM_NAME_MAX_LENGTH + 1);

    trackProgram(await createProgram(page, programName, 'Full-stack web development program'));
    await openEditModal(page, programName);
    await programNameField(page).fill(overMaxName);

    const savedValue = await programNameField(page).inputValue();
    const blockedBeforeSubmit =
      savedValue.length <= PROGRAM_NAME_MAX_LENGTH || (await saveButton(page).isDisabled());

    if (!blockedBeforeSubmit) {
      await saveButton(page).click();
      await page.waitForTimeout(DUPLICATE_CHECK_SETTLE_MS);
    }

    const modalStillOpen = await editProgramDialog(page).isVisible().catch(() => false);
    const validationErrorVisible = modalStillOpen
      ? await editProgramDialog(page)
          .getByText(/too long|maximum|100/i)
          .isVisible()
          .catch(() => false)
      : false;
    const truncatedInField =
      modalStillOpen && (await programNameField(page).inputValue()).length <= PROGRAM_NAME_MAX_LENGTH;
    const overMaxListed = await programRowsWithName(page, overMaxName).count();

    expect(
      blockedBeforeSubmit ||
        truncatedInField ||
        validationErrorVisible ||
        modalStillOpen ||
        overMaxListed === 0,
    ).toBeTruthy();
    await expect(programInList(page, programName)).toBeVisible();
  });

  test('TC-016: Description at maximum allowed length is saved on edit', async ({ page, trackProgram }) => {
    const programName = uniqueName('Cloud Computing 2026');
    const description = 'D'.repeat(DESCRIPTION_MAX_LENGTH);

    trackProgram(await createProgram(page, programName, 'Intro to cloud platforms'));
    await openEditModal(page, programName);
    await descriptionField(page).fill(description);
    await saveButton(page).click();

    await expect(editProgramDialog(page)).not.toBeVisible({ timeout: 15_000 });
    await openEditModal(page, programName);
    await expect(descriptionField(page)).toHaveValue(description);
  });

  test('TC-017: Duplicate Program Name check is case-insensitive on edit (if applicable)', async ({ page, trackProgram }) => {
    const firstName = uniqueName('Web Development 2026');
    const secondName = uniqueName('Data Science Fundamentals');
    const duplicateAttempt = secondName.toLowerCase();

    trackProgram(await createProgram(page, firstName, 'Full-stack web development program'));
    trackProgram(await createProgram(page, secondName, 'Foundations of data science'));

    await openEditModal(page, firstName);
    await programNameField(page).fill(duplicateAttempt);
    await expectDuplicateEditRejected(page, {
      listName: duplicateAttempt,
      expectedRowCount: 0,
    });
    await expect(programInList(page, firstName)).toBeVisible();
    await expect(programRowsWithName(page, secondName)).toHaveCount(1);
  });

  test('TC-018: Save button state updates dynamically when Program Name is edited', async ({ page, trackProgram }) => {
    const programName = uniqueName('Web Development 2026');

    trackProgram(await createProgram(page, programName, 'Full-stack web development program'));
    await openEditModal(page, programName);

    await expect(saveButton(page)).toBeEnabled();

    await programNameField(page).clear();
    await expect(saveButton(page)).toBeDisabled();

    await programNameField(page).fill(`${programName} - Revised`);
    await expect(saveButton(page)).toBeEnabled();

    await programNameField(page).fill('   ');
    await expect(saveButton(page)).toBeDisabled();
  });

  test('TC-019: Description can be cleared to empty on edit', async ({ page, trackProgram }) => {
    const programName = uniqueName('Data Science Fundamentals');
    const description = 'Foundations of data science';

    trackProgram(await createProgram(page, programName, description));
    await openEditModal(page, programName);
    await descriptionField(page).clear();
    await saveButton(page).click();

    await expect(editProgramDialog(page)).not.toBeVisible({ timeout: 15_000 });
    await expect(programInList(page, programName)).toBeVisible();

    await openEditModal(page, programName);
    await expect(programNameField(page)).toHaveValue(programName);
    await expect(descriptionField(page)).toHaveValue('');
  });

  test('TC-020: Edit modal exposes AI Generation Config section', async ({ page, trackProgram }) => {
    const programName = uniqueName('Web Development 2026');

    trackProgram(await createProgram(page, programName, 'Full-stack web development program'));
    await openEditModal(page, programName);

    await expect(editProgramDialog(page).getByText('Program Name *')).toBeVisible();
    await expect(
      editProgramDialog(page).getByRole('button', { name: /Show AI Generation Config/i }),
    ).toBeVisible();
  });

  test('TC-021: Description exceeding maximum length is rejected on edit', async ({ page, trackProgram }) => {
    const programName = uniqueName('Cloud Computing 2026');
    const overMaxDescription = 'D'.repeat(DESCRIPTION_MAX_LENGTH + 1);

    trackProgram(await createProgram(page, programName, 'Intro to cloud platforms'));
    await openEditModal(page, programName);
    await descriptionField(page).fill(overMaxDescription);
    await saveButton(page).click();
    await page.waitForTimeout(DUPLICATE_CHECK_SETTLE_MS);

    const modalStillOpen = await editProgramDialog(page).isVisible();
    const validationErrorVisible = modalStillOpen
      ? await editProgramDialog(page)
          .getByText(/too long|maximum|500/i)
          .isVisible()
          .catch(() => false)
      : false;

    expect(modalStillOpen || validationErrorVisible).toBeTruthy();
    await expect(programInList(page, programName)).toBeVisible();
  });
});
