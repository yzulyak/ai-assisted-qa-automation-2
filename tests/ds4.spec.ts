import dotenv from 'dotenv';
import path from 'path';
import type { Dialog, Page, Response } from '@playwright/test';
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

async function expectConfirmDialogReferencesProgram(
  dialog: Dialog,
  programName: string,
): Promise<void> {
  expect(dialog.type()).toBe('confirm');
  expect(dialog.message()).toBe(ProgramsPage.expectedDeleteConfirmMessage(programName));
}

async function handleDeleteConfirmation(
  programs: ProgramsPage,
  programName: string,
  action: 'accept' | 'dismiss',
): Promise<void> {
  programs.page.once('dialog', async (dialog) => {
    await expectConfirmDialogReferencesProgram(dialog, programName);
    if (action === 'accept') {
      await dialog.accept();
      return;
    }
    await dialog.dismiss();
  });
  await programs.clickDelete(programName);
}

async function confirmDeletion(programs: ProgramsPage, programName: string): Promise<void> {
  await handleDeleteConfirmation(programs, programName, 'accept');
  await expect(programs.programInList(programName)).not.toBeVisible({ timeout: 15_000 });
}

async function cancelDeletion(programs: ProgramsPage, programName: string): Promise<void> {
  await handleDeleteConfirmation(programs, programName, 'dismiss');
  await expect(programs.programInList(programName)).toBeVisible();
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
    const programs = new ProgramsPage(page);
    await goToPrograms(programs);
  });

  test('TC-001: Confirmed deletion removes program from the list', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Test Program');
    const description = 'Sample program for deletion testing';

    trackProgram(await createProgram(programs, programName, description));
    await expect(programs.programInList(programName)).toBeVisible();
    await expect(programs.editButton(programName)).toBeVisible();

    await confirmDeletion(programs, programName);
  });

  test('TC-002: Cancel on confirmation dialog preserves the program in the list', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Web Development 2026');
    const description = 'Full-stack web development program';

    trackProgram(await createProgram(programs, programName, description));
    await cancelDeletion(programs, programName);
  });
});

test.describe('Negative flows', () => {
  test('TC-003: Delete icon does not remove the program before confirmation', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    await goToPrograms(programs);

    const programName = uniqueName('Data Science Fundamentals');
    const description = 'Introductory data science curriculum';

    trackProgram(await createProgram(programs, programName, description));
    await expect(programs.programInList(programName)).toBeVisible();

    await handleDeleteConfirmation(programs, programName, 'dismiss');
    await expect(programs.programInList(programName)).toBeVisible();
    await expect(programs.successToast).not.toBeVisible();
  });

  test('TC-004: Non-admin user cannot delete a program', async ({ page, trackProgram }) => {
    test.skip(
      !NON_ADMIN_EMAIL || !NON_ADMIN_PASSWORD,
      'Set DIDAXIS_NON_ADMIN_EMAIL and DIDAXIS_NON_ADMIN_PASSWORD in .env',
    );

    const programs = new ProgramsPage(page);
    const programName = uniqueName('Cloud Computing Basics');

    await goToPrograms(programs);
    trackProgram(await createProgram(programs, programName, 'Intro to cloud computing'));

    await login(page, NON_ADMIN_EMAIL, NON_ADMIN_PASSWORD);
    await programs.goto();

    await expect(programs.programInList(programName)).toBeVisible();
    await expect(programs.deleteButton(programName)).not.toBeVisible();
    await expect(programs.anyDeleteButton).not.toBeVisible();
  });

  test('TC-005: Failed server-side deletion keeps the program in the list', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    await goToPrograms(programs);

    const programName = uniqueName('Mobile App Development');

    trackProgram(await createProgram(programs, programName, 'iOS and Android development'));

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

    await handleDeleteConfirmation(programs, programName, 'accept');

    const deleteResponse = await deleteResponsePromise;
    expect(deleteResponse.status()).toBeGreaterThanOrEqual(400);
    await expect(programs.programInList(programName)).toBeVisible({ timeout: 15_000 });
    await expect(programs.deleteError).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    const programs = new ProgramsPage(page);
    await goToPrograms(programs);
  });

  test('TC-006: Program with special characters in name is deleted after confirmation', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Informatique & IA - Niveau 2');
    const description = 'Advanced informatics and AI track';

    trackProgram(await createProgram(programs, programName, description));
    await confirmDeletion(programs, programName);
  });

  test('TC-007: Only the targeted program is removed when multiple programs exist', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const targetName = uniqueName('Test Program');
    const advancedName = uniqueName('Test Program Advanced');
    const basicsName = uniqueName('Test Program Basics');

    trackProgram(await createProgram(programs, targetName, 'Target for deletion'));
    trackProgram(await createProgram(programs, advancedName, 'Advanced track'));
    trackProgram(await createProgram(programs, basicsName, 'Basics track'));

    await confirmDeletion(programs, targetName);

    await expect(programs.programInList(advancedName)).toBeVisible();
    await expect(programs.programInList(basicsName)).toBeVisible();
  });

  test('TC-008: Deleting the sole program shows an empty program list state', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Standalone Program');
    const rowsBefore = await programs.programRowCount();

    trackProgram(await createProgram(programs, programName, 'Only program for empty-state test'));

    const rowsAfterCreate = await programs.programRowCount();
    const isOnlyProgram = rowsBefore === 0 && rowsAfterCreate === 1;
    test.skip(!isOnlyProgram, 'Requires this program to be the only one in the list');

    await confirmDeletion(programs, programName);

    await expect(programs.programRows).toHaveCount(0);
    await expect(programs.emptyStateExact).toBeVisible();
    await expect(programs.createProgramButton).toBeEnabled();
  });

  test('TC-009: Cancel via native confirm dismiss preserves the program', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Cybersecurity Essentials');

    trackProgram(await createProgram(programs, programName, 'Intro to cybersecurity'));
    await cancelDeletion(programs, programName);
    await cancelDeletion(programs, programName);
  });

  test('TC-010: Program with maximum-length name is deleted after confirmation', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const suffix = Date.now().toString();
    const programName = `${'A'.repeat(Math.max(0, PROGRAM_NAME_MAX_LENGTH - suffix.length))}${suffix}`;
    expect(programName.length).toBe(PROGRAM_NAME_MAX_LENGTH);

    trackProgram(await createProgram(programs, programName, 'Max length deletion test'));
    await confirmDeletion(programs, programName);
  });

  test('TC-011: Delete confirmation dialog displays Confluence warning text', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Confirm Message Check');

    trackProgram(await createProgram(programs, programName, 'Verify native confirm message'));

    page.once('dialog', async (dialog) => {
      await expectConfirmDialogReferencesProgram(dialog, programName);
      await dialog.dismiss();
    });
    await programs.clickDelete(programName);
    await expect(programs.programInList(programName)).toBeVisible();

    await confirmDeletion(programs, programName);
  });

  test('TC-012: Double-clicking delete icon opens a single confirmation dialog', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Double Delete Test');

    trackProgram(await createProgram(programs, programName, 'Double-click delete guard'));

    let dialogCount = 0;
    const onDialog = async (dialog: Dialog) => {
      dialogCount += 1;
      await dialog.dismiss();
    };
    page.on('dialog', onDialog);

    await programs.doubleClickDelete(programName);
    await page.waitForTimeout(1_000);

    expect(dialogCount).toBe(1);
    await expect(programs.programInList(programName)).toBeVisible();

    page.off('dialog', onDialog);
    await confirmDeletion(programs, programName);
  });
});
