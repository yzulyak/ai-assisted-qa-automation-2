import dotenv from 'dotenv';
import path from 'path';
import { test, expect, type Page } from '@playwright/test';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';
const ADMIN_EMAIL = process.env.DIDAXIS_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.DIDAXIS_PASSWORD ?? '';

/** Confluence: Program Setup — Field Definitions */
const PROGRAM_NAME_MAX_LENGTH = 100;

function uniqueName(base: string): string {
  return `${base}-${Date.now()}`;
}

function newProgramButton(page: Page) {
  return page.getByRole('button', { name: '+ New Program' });
}

function newProgramDialog(page: Page) {
  return page.getByRole('dialog', { name: 'New Program' });
}

function programNameField(page: Page) {
  return newProgramDialog(page).getByLabel('Program Name');
}

function descriptionField(page: Page) {
  return newProgramDialog(page).getByLabel('Description');
}

function createButton(page: Page) {
  return newProgramDialog(page).getByRole('button', { name: 'Create' });
}

function cancelButton(page: Page) {
  return newProgramDialog(page).getByRole('button', { name: 'Cancel' });
}

function programInList(page: Page, name: string) {
  return page.locator('table tbody').getByText(name, { exact: true });
}

function programRowsWithName(page: Page, name: string) {
  return page.locator('table tbody tr').filter({
    has: page.getByText(name, { exact: true }),
  });
}

async function programRowCount(page: Page): Promise<number> {
  return page.locator('table tbody tr').count();
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

async function openNewProgramModal(page: Page): Promise<void> {
  await newProgramButton(page).click();
  await expect(newProgramDialog(page)).toBeVisible();
  await expect(programNameField(page)).toBeVisible();
}

async function createProgram(
  page: Page,
  name: string,
  description?: string,
): Promise<void> {
  await openNewProgramModal(page);
  await programNameField(page).fill(name);
  if (description !== undefined) {
    await descriptionField(page).fill(description);
  }
  await createButton(page).click();
  await expect(newProgramDialog(page)).not.toBeVisible({ timeout: 15_000 });
  await expect(programInList(page, name)).toBeVisible({ timeout: 15_000 });
}

function duplicateErrorLocator(page: Page) {
  return newProgramDialog(page).getByText(/already exists|name.*taken|already been used|duplicate/i);
}

async function expectDuplicateNameError(page: Page): Promise<void> {
  await expect(duplicateErrorLocator(page)).toBeVisible();
}

const DUPLICATE_CHECK_SETTLE_MS = 1_000;

async function expectDuplicateSubmissionRejected(
  page: Page,
  options: { listName: string; expectedRowCount: number },
): Promise<void> {
  const rows = programRowsWithName(page, options.listName);
  const countBefore = await rows.count();
  expect(countBefore).toBe(options.expectedRowCount);

  const createResponse = page.waitForResponse(
    (response) => response.request().method() === 'POST',
    { timeout: 15_000 },
  );

  await createButton(page).click();
  await createResponse.catch(() => null);
  await page.waitForTimeout(DUPLICATE_CHECK_SETTLE_MS);

  await expect(rows).toHaveCount(options.expectedRowCount);
  await expect(newProgramDialog(page)).toBeVisible();
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

  test('TC-001: Program name containing ampersands, hyphens, and accented characters is accepted and persisted', async ({
    page,
  }) => {
    const programName = uniqueName('Informatique & IA - Niveau 2');
    const description = 'Advanced informatics and artificial intelligence track';

    await openNewProgramModal(page);
    await programNameField(page).fill(programName);
    await descriptionField(page).fill(description);
    await createButton(page).click();

    await expect(newProgramDialog(page)).not.toBeVisible({ timeout: 15_000 });
    await expect(programInList(page, programName)).toBeVisible();
  });

  test('TC-002: Non-empty name surrounded by whitespace is accepted and stored without outer whitespace', async ({
    page,
  }) => {
    const trimmedName = uniqueName('Data Science Fundamentals');
    const paddedName = `  ${trimmedName}  `;
    const description = 'Introductory data science curriculum';

    await openNewProgramModal(page);
    await programNameField(page).fill(paddedName);
    await descriptionField(page).fill(description);
    await createButton(page).click();

    await expect(newProgramDialog(page)).not.toBeVisible({ timeout: 15_000 });
    await expect(programInList(page, trimmedName)).toBeVisible();
    await expect(programRowsWithName(page, trimmedName)).toHaveCount(1);
    const nameCell = programRowsWithName(page, trimmedName).locator('p').first();
    await expect(nameCell).toHaveText(trimmedName);
  });
});

test.describe('Negative flows', () => {
  test('TC-003: Program Name containing only spaces is trimmed, treated as empty, and blocks submission', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);

    const rowsBefore = await programRowCount(page);

    await openNewProgramModal(page);
    await programNameField(page).fill('   ');
    await descriptionField(page).fill('Whitespace-only name test');

    await expect(createButton(page)).toBeDisabled();
    await expect(newProgramDialog(page)).toBeVisible();
    await expect(page.locator('table tbody tr')).toHaveCount(rowsBefore);
  });

  test('TC-004: Create action is blocked when Program Name field is left empty', async ({ page }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);

    const rowsBefore = await programRowCount(page);

    await openNewProgramModal(page);
    await descriptionField(page).fill('Description without a program name');

    await expect(createButton(page)).toBeDisabled();
    await createButton(page).click({ force: true });
    await expect(newProgramDialog(page)).toBeVisible();
    await expect(page.locator('table tbody tr')).toHaveCount(rowsBefore);
  });

  test('TC-005: System prevents creating a program whose name already exists', async ({ page }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);

    const programName = uniqueName('Web Development 2026');

    await createProgram(page, programName, 'Original program description');
    await expect(programRowsWithName(page, programName)).toHaveCount(1);

    await openNewProgramModal(page);
    await programNameField(page).fill(programName);
    await descriptionField(page).fill('Duplicate attempt description');
    await expectDuplicateSubmissionRejected(page, {
      listName: programName,
      expectedRowCount: 1,
    });
  });

  test('TC-006: New program with a unique name is not falsely rejected as a duplicate', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);

    const existingName = uniqueName('Web Development 2026');
    const newProgramName = uniqueName('Mobile App Development 2026');
    const description = 'iOS and Android development track';

    await createProgram(page, existingName, 'Existing web development program');
    await expect(programInList(page, existingName)).toBeVisible();

    await openNewProgramModal(page);
    await programNameField(page).fill(newProgramName);
    await descriptionField(page).fill(description);
    await createButton(page).click();

    await expect(newProgramDialog(page)).not.toBeVisible({ timeout: 15_000 });
    await expect(duplicateErrorLocator(page)).not.toBeVisible();
    await expect(programInList(page, newProgramName)).toBeVisible();
  });
});

test.describe('Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);
  });

  test('TC-007: Program Name with only tab or newline characters is rejected like space-only input', async ({
    page,
  }) => {
    const rowsBefore = await programRowCount(page);

    await openNewProgramModal(page);
    await programNameField(page).fill('\t\t');
    await descriptionField(page).fill('Tab-only name test');
    await expect(createButton(page)).toBeDisabled();

    await programNameField(page).clear();
    await programNameField(page).fill('\n\n');
    await descriptionField(page).fill('Newline-only name test');
    await expect(createButton(page)).toBeDisabled();
    await expect(newProgramDialog(page)).toBeVisible();
    await expect(page.locator('table tbody tr')).toHaveCount(rowsBefore);
  });

  test('TC-008: Minimum valid non-whitespace Program Name (one character) is allowed', async ({
    page,
  }) => {
    const programName = `Z${Date.now() % 10000}`;

    await openNewProgramModal(page);
    await programNameField(page).fill(programName);
    await descriptionField(page).fill('Single character boundary test');
    await createButton(page).click();

    await expect(newProgramDialog(page)).not.toBeVisible({ timeout: 15_000 });
    await expect(programInList(page, programName)).toBeVisible();
  });

  test('TC-009: Program Name at the documented maximum length (100 characters) is saved and displayed in full', async ({
    page,
  }) => {
    const suffix = Date.now().toString();
    const programName = `${'A'.repeat(Math.max(0, PROGRAM_NAME_MAX_LENGTH - suffix.length))}${suffix}`;
    expect(programName.length).toBe(PROGRAM_NAME_MAX_LENGTH);

    await openNewProgramModal(page);
    await programNameField(page).fill(programName);
    await descriptionField(page).fill('Max length boundary test');
    await createButton(page).click();

    await expect(newProgramDialog(page)).not.toBeVisible({ timeout: 15_000 });
    await expect(programInList(page, programName)).toBeVisible();
  });

  test('TC-010: Program Name longer than the allowed limit cannot be saved', async ({ page }) => {
    const suffix = Date.now().toString();
    const overMaxName = `${'A'.repeat(Math.max(0, PROGRAM_NAME_MAX_LENGTH + 1 - suffix.length))}${suffix}`;
    expect(overMaxName.length).toBe(PROGRAM_NAME_MAX_LENGTH + 1);

    await openNewProgramModal(page);
    await programNameField(page).fill(overMaxName);
    await descriptionField(page).fill('Over max length test');

    const savedValue = await programNameField(page).inputValue();
    const blockedBeforeSubmit =
      savedValue.length <= PROGRAM_NAME_MAX_LENGTH || (await createButton(page).isDisabled());

    if (!blockedBeforeSubmit) {
      await createButton(page).click();
      await page.waitForTimeout(1_000);
    }

    const modalStillOpen = await newProgramDialog(page).isVisible().catch(() => false);
    const validationErrorVisible = modalStillOpen
      ? await newProgramDialog(page)
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
  });

  test('TC-011: Program names that match an existing name ignoring case are treated as duplicates', async ({
    page,
  }) => {
    const originalName = uniqueName('Web Development 2026');
    const duplicateAttempt = originalName.toLowerCase();

    await createProgram(page, originalName, 'Original program');
    await expect(programInList(page, originalName)).toBeVisible();

    await openNewProgramModal(page);
    await programNameField(page).fill(duplicateAttempt);
    await descriptionField(page).fill('Case variation duplicate test');
    await expectDuplicateSubmissionRejected(page, {
      listName: duplicateAttempt,
      expectedRowCount: 0,
    });
    await expect(programRowsWithName(page, originalName)).toHaveCount(1);
  });

  test('TC-012: Surrounding whitespace on a duplicate name does not bypass uniqueness validation', async ({
    page,
  }) => {
    const programName = uniqueName('Web Development 2026');
    const paddedDuplicate = `  ${programName}  `;

    await createProgram(page, programName, 'Original program');
    await expect(programRowsWithName(page, programName)).toHaveCount(1);

    await openNewProgramModal(page);
    await programNameField(page).fill(paddedDuplicate);
    await descriptionField(page).fill('Whitespace-padded duplicate test');
    await expectDuplicateSubmissionRejected(page, {
      listName: programName,
      expectedRowCount: 1,
    });
  });

  test('TC-013: Create button disables immediately when Program Name becomes whitespace-only after trim', async ({
    page,
  }) => {
    const validName = uniqueName('Cybersecurity Basics');

    await openNewProgramModal(page);
    await programNameField(page).fill(validName);
    await expect(createButton(page)).toBeEnabled();

    await programNameField(page).clear();
    await programNameField(page).fill('   ');
    await expect(createButton(page)).toBeDisabled();
    await expect(newProgramDialog(page)).toBeVisible();
  });

  test('TC-014: New Program modal shows required Program Name label and Cancel control', async ({
    page,
  }) => {
    await openNewProgramModal(page);

    await expect(newProgramDialog(page).getByText('Program Name *')).toBeVisible();
    await expect(programNameField(page)).toBeVisible();
    await expect(descriptionField(page)).toBeVisible();
    await expect(createButton(page)).toBeVisible();
    await expect(cancelButton(page)).toBeVisible();
  });

  test('TC-015: Description field must be scoped to modal to avoid table action button collisions', async ({
    page,
  }) => {
    await openNewProgramModal(page);

    await expect(descriptionField(page)).toHaveCount(1);
    await descriptionField(page).fill('Scoped description field test');
    await expect(descriptionField(page)).toHaveValue('Scoped description field test');
  });
});
