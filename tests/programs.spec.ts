import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import { uniqueName } from './helpers/uniqueName';

test.describe('Programs', () => {
  test('creates a new program via the New Program modal', async ({ page }) => {
    const programsPage = new ProgramsPage(page);
    const programName = uniqueName('Web Development');
    const description = 'Full-stack web development program';

    await programsPage.goto();
    await expect(programsPage.heading).toBeVisible();
    await expect(programsPage.newProgramButton).toBeVisible();

    await programsPage.createProgram(programName, description);

    await expect(programsPage.newProgramModal.dialog).not.toBeVisible({
      timeout: 15_000,
    });
    await expect(programsPage.programInList(programName)).toBeVisible({
      timeout: 15_000,
    });
  });

  test('opens the New Program form with name and description fields', async ({
    page,
  }) => {
    const programsPage = new ProgramsPage(page);

    await programsPage.goto();
    await programsPage.openNewProgramForm();

    await expect(programsPage.newProgramModal.dialog).toBeVisible();
    await expect(programsPage.newProgramModal.programNameInput).toBeVisible();
    await expect(programsPage.newProgramModal.descriptionInput).toBeVisible();
    await expect(programsPage.newProgramModal.createButton).toBeVisible();
    await expect(programsPage.newProgramModal.cancelButton).toBeVisible();
  });
});
