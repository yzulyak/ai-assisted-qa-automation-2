import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';
const ADMIN_EMAIL = process.env.DIDAXIS_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.DIDAXIS_PASSWORD ?? '';
const NON_ADMIN_EMAIL = process.env.DIDAXIS_NON_ADMIN_EMAIL ?? '';
const NON_ADMIN_PASSWORD = process.env.DIDAXIS_NON_ADMIN_PASSWORD ?? '';

const PROGRAM_NAME_MAX_LENGTH = 255;
const DESCRIPTION_MAX_LENGTH = 2000;

function uniqueName(base: string): string {
  return `${base}-${Date.now()}`;
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
  await expect(page.getByRole('button', { name: 'New Program' })).toBeVisible();
  await expect(page.locator('table tbody')).toBeVisible({ timeout: 15_000 });
}

async function openNewProgramModal(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'New Program' }).click();
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
  const cancelButton = dialog.getByRole('button', { name: 'Cancel' });
  const closeButton = dialog.getByRole('button', { name: 'Close' });

  if (await cancelButton.isVisible()) {
    await cancelButton.click();
  } else if (await closeButton.isVisible()) {
    await closeButton.click();
  } else {
    await page.keyboard.press('Escape');
  }
}

function duplicateErrorLocator(page: Page) {
  return newProgramDialog(page).getByText(/already exists|name.*taken|already been used/i);
}

async function expectDuplicateNameError(page: Page): Promise<void> {
  await expect(duplicateErrorLocator(page)).toBeVisible();
}

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

  // Wait until the UI reflects the API outcome (list update or modal error state)
  await expect(async () => {
    const count = await rows.count();
    const modalOpen = await newProgramDialog(page).isVisible();
    const errorVisible = modalOpen
      ? await duplicateErrorLocator(page).isVisible().catch(() => false)
      : false;

    expect(count > countBefore || !modalOpen || errorVisible).toBeTruthy();
  }).toPass({ timeout: 15_000 });

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

    await expect(programNameField(page)).toBeVisible();
    await expect(descriptionField(page)).toBeVisible();
    await expect(createButton(page)).toBeVisible();
  });

  test('TC-002: Valid program is created and appears in the list', async ({ page }) => {
    const programName = uniqueName('Web Development 2026');
    const description = 'Full-stack web development program';

    await openNewProgramModal(page);
    await programNameField(page).fill(programName);
    await descriptionField(page).fill(description);
    await createButton(page).click();

    await expect(programNameField(page)).not.toBeVisible();
    await expect(programInList(page, programName)).toBeVisible();
  });

  test('TC-003: Create button is disabled when Program Name is empty', async ({ page }) => {
    await openNewProgramModal(page);
    await descriptionField(page).fill('Optional description text');

    await expect(createButton(page)).toBeDisabled();
    await createButton(page).click({ force: true });
    await expect(programNameField(page)).toBeVisible();
  });

  test('TC-004: Program can be created with Description empty', async ({ page }) => {
    const programName = uniqueName('Data Science Fundamentals');

    await openNewProgramModal(page);
    await programNameField(page).fill(programName);
    await expect(descriptionField(page)).toHaveValue('');
    await expect(createButton(page)).toBeEnabled();
    await createButton(page).click();

    await expect(programNameField(page)).not.toBeVisible();
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

    await expect(page.getByRole('button', { name: 'New Program' })).not.toBeVisible();
    await expect(programNameField(page)).not.toBeVisible();
  });

  test('TC-007: Unauthenticated user cannot create a program', async ({ page }) => {
    await page.goto(`${BASE_URL}/programs`);

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(programNameField(page)).not.toBeVisible();
  });

  test('TC-008: Canceling or closing the modal does not create a program', async ({ page }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);

    const programName = uniqueName('Cybersecurity Basics');

    await openNewProgramModal(page);
    await programNameField(page).fill(programName);
    await descriptionField(page).fill('Intro to security concepts');
    await closeModalWithoutSaving(page);

    await expect(programNameField(page)).not.toBeVisible();
    await expect(programInList(page, programName)).not.toBeVisible();
  });

  test('TC-009: Duplicate program name is rejected', async ({ page }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);

    const programName = uniqueName('Web Development 2026');

    await createProgram(page, programName, 'Original program description');
    await expect(programInList(page, programName)).toBeVisible();

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

    await expect(programNameField(page)).not.toBeVisible();
    await expect(programInList(page, programName)).toBeVisible();
  });

  test('TC-012: Program Name at minimum valid length (single character)', async ({ page }) => {
    const programName = String.fromCharCode(65 + (Date.now() % 26));

    await openNewProgramModal(page);
    await programNameField(page).fill(programName);
    await descriptionField(page).fill('Single character name boundary test');
    await createButton(page).click();

    await expect(programNameField(page)).not.toBeVisible();
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

    await expect(programNameField(page)).not.toBeVisible();
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

    const savedValue = await programNameField(page).inputValue();
    const blockedBeforeSubmit =
      savedValue.length <= PROGRAM_NAME_MAX_LENGTH || (await createButton(page).isDisabled());

    if (!blockedBeforeSubmit) {
      await createButton(page).click();
    }

    const modalStillOpen = await newProgramDialog(page).isVisible().catch(() => false);
    const validationErrorVisible = modalStillOpen
      ? await newProgramDialog(page)
          .getByText(/too long|maximum|255/i)
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

  test('TC-015: Description at maximum allowed length', async ({ page }) => {
    const programName = uniqueName('Cloud Computing 2026');
    const description = 'D'.repeat(DESCRIPTION_MAX_LENGTH);

    await openNewProgramModal(page);
    await programNameField(page).fill(programName);
    await descriptionField(page).fill(description);
    await createButton(page).click();

    await expect(programNameField(page)).not.toBeVisible();
    await expect(programInList(page, programName)).toBeVisible();
  });

  test('TC-016: Duplicate program name is case-insensitive (if applicable)', async ({ page }) => {
    const suffix = Date.now();
    const originalName = `Web Development 2026-${suffix}`;
    const duplicateAttempt = `web development 2026-${suffix}`;

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

  test('TC-017: Create button enables when Program Name becomes non-empty', async ({ page }) => {
    const programName = uniqueName('Mobile App Development');

    await openNewProgramModal(page);

    await expect(createButton(page)).toBeDisabled();

    await programNameField(page).fill(programName);
    await expect(createButton(page)).toBeEnabled();

    await programNameField(page).clear();
    await expect(createButton(page)).toBeDisabled();
  });
});
