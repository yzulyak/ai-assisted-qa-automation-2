import dotenv from 'dotenv';
import path from 'path';
import type { Dialog, Page, Response } from '@playwright/test';
import { test, expect } from '../fixtures/cleanup.fixture';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';
const ADMIN_EMAIL = process.env.DIDAXIS_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.DIDAXIS_PASSWORD ?? '';
const NON_ADMIN_EMAIL = process.env.DIDAXIS_NON_ADMIN_EMAIL ?? '';
const NON_ADMIN_PASSWORD = process.env.DIDAXIS_NON_ADMIN_PASSWORD ?? '';

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

function programRow(page: Page, name: string) {
  return page.locator('table tbody tr').filter({
    has: page.getByText(name, { exact: true }),
  });
}

function programInList(page: Page, name: string) {
  return programRow(page, name);
}

function deleteButton(page: Page, programName: string) {
  return programRow(page, programName).getByRole('button', { name: `Delete ${programName}` });
}

function editButton(page: Page, programName: string) {
  return programRow(page, programName).getByRole('button', { name: `Edit ${programName}` });
}

async function programRowCount(page: Page): Promise<number> {
  return page.locator('table tbody tr').count();
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

function expectedDeleteConfirmMessage(programName: string): string {
  return `Delete program "${programName}"? All its semesters and courses will be removed. This cannot be undone.`;
}

async function expectConfirmDialogReferencesProgram(
  dialog: Dialog,
  programName: string,
): Promise<void> {
  expect(dialog.type()).toBe('confirm');
  expect(dialog.message()).toBe(expectedDeleteConfirmMessage(programName));
}

async function handleDeleteConfirmation(
  page: Page,
  programName: string,
  action: 'accept' | 'dismiss',
): Promise<void> {
  page.once('dialog', async (dialog) => {
    await expectConfirmDialogReferencesProgram(dialog, programName);
    if (action === 'accept') {
      await dialog.accept();
      return;
    }
    await dialog.dismiss();
  });
  await deleteButton(page, programName).click();
}

async function confirmDeletion(page: Page, programName: string): Promise<void> {
  await handleDeleteConfirmation(page, programName, 'accept');
  await expect(programInList(page, programName)).not.toBeVisible({ timeout: 15_000 });
}

async function cancelDeletion(page: Page, programName: string): Promise<void> {
  await handleDeleteConfirmation(page, programName, 'dismiss');
  await expect(programInList(page, programName)).toBeVisible();
}

function successToastLocator(page: Page) {
  return page.getByText(/deleted successfully|program deleted|successfully removed/i);
}

function deleteErrorLocator(page: Page) {
  return page
    .getByRole('alert')
    .or(page.getByText(/could not be deleted|failed to delete|unable to delete|something went wrong/i));
}

test.beforeEach(async () => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'Set DIDAXIS_EMAIL and DIDAXIS_PASSWORD in .env',
  );
});

test.setTimeout(60_000);

test.describe('Positive flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);
  });

  test('TC-001: Confirmed deletion removes program from the list', async ({ page, trackProgram }) => {
    const programName = uniqueName('Test Program');
    const description = 'Sample program for deletion testing';

    trackProgram(await createProgram(page, programName, description));
    await expect(programInList(page, programName)).toBeVisible();
    await expect(editButton(page, programName)).toBeVisible();

    await confirmDeletion(page, programName);
  });

  test('TC-002: Cancel on confirmation dialog preserves the program in the list', async ({ page, trackProgram }) => {
    const programName = uniqueName('Web Development 2026');
    const description = 'Full-stack web development program';

    trackProgram(await createProgram(page, programName, description));
    await cancelDeletion(page, programName);
  });
});

test.describe('Negative flows', () => {
  test('TC-003: Delete icon does not remove the program before confirmation', async ({ page, trackProgram }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);

    const programName = uniqueName('Data Science Fundamentals');
    const description = 'Introductory data science curriculum';

    trackProgram(await createProgram(page, programName, description));
    await expect(programInList(page, programName)).toBeVisible();

    await handleDeleteConfirmation(page, programName, 'dismiss');
    await expect(programInList(page, programName)).toBeVisible();
    await expect(successToastLocator(page)).not.toBeVisible();
  });

  test('TC-004: Non-admin user cannot delete a program', async ({ page, trackProgram }) => {
    test.skip(
      !NON_ADMIN_EMAIL || !NON_ADMIN_PASSWORD,
      'Set DIDAXIS_NON_ADMIN_EMAIL and DIDAXIS_NON_ADMIN_PASSWORD in .env',
    );

    const programName = uniqueName('Cloud Computing Basics');

    await loginAsAdmin(page);
    await goToPrograms(page);
    trackProgram(await createProgram(page, programName, 'Intro to cloud computing'));

    await login(page, NON_ADMIN_EMAIL, NON_ADMIN_PASSWORD);
    await goToPrograms(page);

    await expect(programInList(page, programName)).toBeVisible();
    await expect(deleteButton(page, programName)).not.toBeVisible();
    await expect(page.getByRole('button', { name: /^Delete / })).not.toBeVisible();
  });

  test('TC-005: Failed server-side deletion keeps the program in the list', async ({ page, trackProgram }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);

    const programName = uniqueName('Mobile App Development');

    trackProgram(await createProgram(page, programName, 'iOS and Android development'));

    await page.route('**/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Failed to delete program' }),
        });
        return;
      }
      await route.continue();
    });

    const deleteResponsePromise = page.waitForResponse(
      (response) => response.request().method() === 'DELETE',
      { timeout: 15_000 },
    );

    await handleDeleteConfirmation(page, programName, 'accept');

    const deleteResponse = await deleteResponsePromise;
    expect(deleteResponse.status()).toBeGreaterThanOrEqual(400);
    await expect(programInList(page, programName)).toBeVisible({ timeout: 15_000 });
    await expect(deleteErrorLocator(page)).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);
  });

  test('TC-006: Program with special characters in name is deleted after confirmation', async ({ page, trackProgram }) => {
    const programName = uniqueName('Informatique & IA - Niveau 2');
    const description = 'Advanced informatics and AI track';

    trackProgram(await createProgram(page, programName, description));
    await confirmDeletion(page, programName);
  });

  test('TC-007: Only the targeted program is removed when multiple programs exist', async ({ page, trackProgram }) => {
    const targetName = uniqueName('Test Program');
    const advancedName = uniqueName('Test Program Advanced');
    const basicsName = uniqueName('Test Program Basics');

    trackProgram(await createProgram(page, targetName, 'Target for deletion'));
    trackProgram(await createProgram(page, advancedName, 'Advanced track'));
    trackProgram(await createProgram(page, basicsName, 'Basics track'));

    await confirmDeletion(page, targetName);

    await expect(programInList(page, advancedName)).toBeVisible();
    await expect(programInList(page, basicsName)).toBeVisible();
  });

  test('TC-008: Deleting the sole program shows an empty program list state', async ({ page, trackProgram }) => {
    const programName = uniqueName('Standalone Program');
    const rowsBefore = await programRowCount(page);

    trackProgram(await createProgram(page, programName, 'Only program for empty-state test'));

    const rowsAfterCreate = await programRowCount(page);
    const isOnlyProgram = rowsBefore === 0 && rowsAfterCreate === 1;
    test.skip(!isOnlyProgram, 'Requires this program to be the only one in the list');

    await confirmDeletion(page, programName);

    await expect(page.locator('table tbody tr')).toHaveCount(0);
    await expect(
      page.getByText('No programs yet. Create your first program to get started.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Program' })).toBeEnabled();
  });

  test('TC-009: Cancel via native confirm dismiss preserves the program', async ({ page, trackProgram }) => {
    const programName = uniqueName('Cybersecurity Essentials');

    trackProgram(await createProgram(page, programName, 'Intro to cybersecurity'));
    await cancelDeletion(page, programName);
    await cancelDeletion(page, programName);
  });

  test('TC-010: Program with maximum-length name is deleted after confirmation', async ({ page, trackProgram }) => {
    const suffix = Date.now().toString();
    const programName = `${'A'.repeat(Math.max(0, PROGRAM_NAME_MAX_LENGTH - suffix.length))}${suffix}`;
    expect(programName.length).toBe(PROGRAM_NAME_MAX_LENGTH);

    trackProgram(await createProgram(page, programName, 'Max length deletion test'));
    await confirmDeletion(page, programName);
  });

  test('TC-011: Delete confirmation dialog displays Confluence warning text', async ({ page, trackProgram }) => {
    const programName = uniqueName('Confirm Message Check');

    trackProgram(await createProgram(page, programName, 'Verify native confirm message'));

    page.once('dialog', async (dialog) => {
      await expectConfirmDialogReferencesProgram(dialog, programName);
      await dialog.dismiss();
    });
    await deleteButton(page, programName).click();
    await expect(programInList(page, programName)).toBeVisible();

    await confirmDeletion(page, programName);
  });

  test('TC-012: Double-clicking delete icon opens a single confirmation dialog', async ({ page, trackProgram }) => {
    const programName = uniqueName('Double Delete Test');

    trackProgram(await createProgram(page, programName, 'Double-click delete guard'));

    let dialogCount = 0;
    page.on('dialog', async (dialog) => {
      dialogCount += 1;
      await dialog.dismiss();
    });

    await deleteButton(page, programName).dblclick();
    await page.waitForTimeout(1_000);

    expect(dialogCount).toBe(1);
    await expect(programInList(page, programName)).toBeVisible();

    page.off('dialog');
    await confirmDeletion(page, programName);
  });
});
