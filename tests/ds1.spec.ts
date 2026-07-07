import dotenv from 'dotenv';
import path from 'path';
import { test, expect, type Page } from '@playwright/test';

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

function dialogCloseButton(page: Page) {
  return newProgramDialog(page).getByRole('banner').getByRole('button');
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

async function closeModalWithoutSaving(page: Page): Promise<void> {
  const dialog = newProgramDialog(page);
  const cancel = cancelButton(page);

  if (await cancel.isVisible()) {
    await cancel.click();
  } else if (await dialogCloseButton(page).isVisible()) {
    await dialogCloseButton(page).click();
  } else {
    await page.keyboard.press('Escape');
  }
}

function duplicateErrorLocator(page: Page) {
  return newProgramDialog(page).getByText(/already exists|name.*taken|already been used|duplicate/i);
}

async function expectDuplicateNameError(page: Page): Promise<void> {
  await expect(duplicateErrorLocator(page)).toBeVisible();
}

/** Wait for create API + list refresh so duplicate checks don't pass on a brief error flash. */
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

  test('TC-001: Program creation form displays required fields', async ({ page }) => {
    await openNewProgramModal(page);

    await expect(newProgramDialog(page)).toBeVisible();
    await expect(programNameField(page)).toBeVisible();
    await expect(descriptionField(page)).toBeVisible();
    await expect(createButton(page)).toBeVisible();
    await expect(cancelButton(page)).toBeVisible();
    await expect(newProgramDialog(page).getByText('Program Name *')).toBeVisible();
  });

  test('TC-002: Valid program is created and appears in the list', async ({ page }) => {
    const programName = uniqueName('Web Development 2026');
    const description = 'Full-stack web development program';

    await openNewProgramModal(page);
    await programNameField(page).fill(programName);
    await descriptionField(page).fill(description);
    await createButton(page).click();

    await expect(newProgramDialog(page)).not.toBeVisible();
    await expect(programInList(page, programName)).toBeVisible();
    await expect(programRow(page, programName).getByText(description)).toBeVisible();
  });

  test('TC-003: Create button is disabled when Program Name is empty', async ({ page }) => {
    await openNewProgramModal(page);
    await descriptionField(page).fill('Optional description text');

    await expect(createButton(page)).toBeDisabled();
    await createButton(page).click({ force: true });
    await expect(newProgramDialog(page)).toBeVisible();
  });

  test('TC-004: Program can be created with Description empty', async ({ page }) => {
    const programName = uniqueName('Data Science Fundamentals');

    await openNewProgramModal(page);
    await programNameField(page).fill(programName);
    await expect(descriptionField(page)).toHaveValue('');
    await expect(createButton(page)).toBeEnabled();
    await createButton(page).click();

    await expect(newProgramDialog(page)).not.toBeVisible();
    await expect(programInList(page, programName)).toBeVisible();
  });
});

test.describe('Negative flows', () => {
  test('TC-005: Program is not created when submission is attempted with empty Program Name', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);

    const rowsBefore = await programRowCount(page);

    await openNewProgramModal(page);
    await descriptionField(page).fill('Should not be saved without a name');

    await expect(createButton(page)).toBeDisabled();
    await createButton(page).click({ force: true });

    await expect(newProgramDialog(page)).toBeVisible();
    await expect(page.locator('table tbody tr')).toHaveCount(rowsBefore);
  });

  test('TC-006: Non-admin user cannot access program creation', async ({ page }) => {
    test.skip(
      !NON_ADMIN_EMAIL || !NON_ADMIN_PASSWORD,
      'Set DIDAXIS_NON_ADMIN_EMAIL and DIDAXIS_NON_ADMIN_PASSWORD in .env',
    );

    await login(page, NON_ADMIN_EMAIL, NON_ADMIN_PASSWORD);
    await page.goto(`${BASE_URL}/programs`);

    await expect(newProgramButton(page)).not.toBeVisible();
    await expect(newProgramDialog(page)).not.toBeVisible();
  });

  test('TC-007: Unauthenticated user cannot create a program', async ({ page }) => {
    await page.goto(`${BASE_URL}/programs`);

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(newProgramDialog(page)).not.toBeVisible();
  });

  test('TC-008: Canceling or closing the modal does not create a program', async ({ page }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);

    const programName = uniqueName('Cybersecurity Basics');

    await openNewProgramModal(page);
    await programNameField(page).fill(programName);
    await descriptionField(page).fill('Intro to security concepts');
    await closeModalWithoutSaving(page);

    await expect(newProgramDialog(page)).not.toBeVisible();
    await expect(programInList(page, programName)).not.toBeVisible();
  });

  test('TC-009: Duplicate program name is rejected', async ({ page }) => {
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
});

test.describe('Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);
  });

  test('TC-010: Program Name with leading and trailing whitespace is handled consistently', async ({
    page,
  }) => {
    await openNewProgramModal(page);
    await programNameField(page).fill('   ');
    await descriptionField(page).fill('Whitespace name test');

    await expect(createButton(page)).toBeDisabled();
  });

  test('TC-011: Program Name accepts special characters', async ({ page }) => {
    const programName = uniqueName('AI & ML (2026) — Cohort #1');

    await openNewProgramModal(page);
    await programNameField(page).fill(programName);
    await descriptionField(page).fill('Covers AI, ML, and data pipelines');
    await createButton(page).click();

    await expect(newProgramDialog(page)).not.toBeVisible();
    await expect(programInList(page, programName)).toBeVisible();
  });

  test('TC-012: Program Name at minimum valid length (single character)', async ({ page }) => {
    const programName = String.fromCharCode(65 + (Date.now() % 26));

    await openNewProgramModal(page);
    await programNameField(page).fill(programName);
    await descriptionField(page).fill('Single character name boundary test');
    await createButton(page).click();

    await expect(newProgramDialog(page)).not.toBeVisible();
    await expect(programInList(page, programName)).toBeVisible();
  });

  test('TC-013: Program Name at maximum allowed length', async ({ page }) => {
    const suffix = Date.now().toString();
    const programName = `${'A'.repeat(Math.max(0, PROGRAM_NAME_MAX_LENGTH - suffix.length))}${suffix}`;
    expect(programName.length).toBe(PROGRAM_NAME_MAX_LENGTH);

    await openNewProgramModal(page);
    await programNameField(page).fill(programName);
    await descriptionField(page).fill('Max length boundary test');
    await createButton(page).click();

    await expect(newProgramDialog(page)).not.toBeVisible();
    await expect(programInList(page, programName)).toBeVisible();
  });

  test('TC-014: Program Name exceeding maximum length is rejected or truncated', async ({
    page,
  }) => {
    const suffix = Date.now().toString();
    const overMaxName = `${'A'.repeat(Math.max(0, PROGRAM_NAME_MAX_LENGTH + 1 - suffix.length))}${suffix}`;
    expect(overMaxName.length).toBe(PROGRAM_NAME_MAX_LENGTH + 1);

    await openNewProgramModal(page);
    await programNameField(page).fill(overMaxName);
    await descriptionField(page).fill('Over max length test');
    await createButton(page).click();

    await expect(newProgramDialog(page)).toBeVisible({ timeout: 15_000 });
    await expect(programRowsWithName(page, overMaxName)).toHaveCount(0);
  });

  test('TC-015: Description at maximum allowed length', async ({ page }) => {
    const programName = uniqueName('Cloud Computing 2026');
    const description = 'D'.repeat(DESCRIPTION_MAX_LENGTH);

    await openNewProgramModal(page);
    await programNameField(page).fill(programName);
    await descriptionField(page).fill(description);
    await createButton(page).click();

    await expect(newProgramDialog(page)).not.toBeVisible();
    await expect(programInList(page, programName)).toBeVisible();
  });

  test('TC-016: Duplicate program name is case-insensitive (if applicable)', async ({ page }) => {
    const suffix = Date.now();
    const originalName = `Web Development 2026-${suffix}`;
    const duplicateAttempt = `web development 2026-${suffix}`;

    await createProgram(page, originalName, 'Original program');
    await expect(programRowsWithName(page, originalName)).toHaveCount(1);

    await openNewProgramModal(page);
    await programNameField(page).fill(duplicateAttempt);
    await descriptionField(page).fill('Case variation duplicate test');
    await expectDuplicateSubmissionRejected(page, {
      listName: duplicateAttempt,
      expectedRowCount: 0,
    });
    await expect(programRowsWithName(page, originalName)).toHaveCount(1);
  });

  test('TC-017: Create button enables when Program Name becomes non-empty', async ({ page }) => {
    const programName = uniqueName('Mobile App Development');

    await openNewProgramModal(page);

    await expect(createButton(page)).toBeDisabled();

    await programNameField(page).fill(programName);
    await expect(createButton(page)).toBeEnabled();

    await programNameField(page).clear();
    await expect(createButton(page)).toBeDisabled();
  });

  test('TC-018: Programs page displays heading, subtitle, and program table', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Programs', level: 2 })).toBeVisible();
    await expect(page.getByText('Manage academic programs and semesters')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Program' })).toBeVisible();
    await expect(page.getByText('Select a program to manage semesters')).toBeVisible();
  });

  test('TC-019: New Program modal exposes AI generation defaults', async ({ page }) => {
    await openNewProgramModal(page);

    await expect(
      newProgramDialog(page).getByRole('button', { name: /Show AI Generation Config/ }),
    ).toBeVisible();
    await expect(newProgramDialog(page).getByText('Total Program Hours')).toBeVisible();
    await expect(newProgramDialog(page).getByText('Target Audience')).toBeVisible();
    await expect(newProgramDialog(page).getByText('Focus Areas')).toBeVisible();
    await expect(newProgramDialog(page).getByText(/Sync\/Async Ratio/)).toBeVisible();
    await expect(newProgramDialog(page).getByPlaceholder('e.g. 900')).toBeVisible();
    await expect(newProgramDialog(page).getByLabel('Default Session Hours')).toHaveValue('4');
    await expect(newProgramDialog(page).getByLabel('Default Exam Hours')).toHaveValue('3');
  });

  test('TC-020: Description exceeding maximum length is rejected', async ({ page }) => {
    const programName = uniqueName('Over Max Description');
    const description = 'D'.repeat(DESCRIPTION_MAX_LENGTH + 1);

    await openNewProgramModal(page);
    await programNameField(page).fill(programName);
    await descriptionField(page).fill(description);
    await createButton(page).click();

    await expect(newProgramDialog(page)).toBeVisible({ timeout: 15_000 });
    await expect(programInList(page, programName)).not.toBeVisible();
  });

  test('TC-021: Double-clicking Create creates exactly one program', async ({ page }) => {
    const programName = uniqueName('Double Click Guard');
    const description = 'Idempotency test';

    await openNewProgramModal(page);
    await programNameField(page).fill(programName);
    await descriptionField(page).fill(description);
    await createButton(page).dblclick();

    await expect(newProgramDialog(page)).not.toBeVisible({ timeout: 15_000 });
    await expect(programRowsWithName(page, programName)).toHaveCount(1);
  });

  test('TC-022: AI Generation Config section collapses and expands', async ({ page }) => {
    await openNewProgramModal(page);

    const showToggle = newProgramDialog(page).getByRole('button', {
      name: /Show AI Generation Config/,
    });
    const hideToggle = newProgramDialog(page).getByRole('button', {
      name: /Hide AI Generation Config/,
    });

    await expect(showToggle).toBeVisible();
    await expect(newProgramDialog(page).getByText('Total Program Hours')).toBeVisible();

    await showToggle.click();
    await expect(hideToggle).toBeVisible();
    await expect(newProgramDialog(page).getByLabel('Target Audience')).toBeVisible();

    await hideToggle.click();
    await expect(showToggle).toBeVisible();
  });
});
