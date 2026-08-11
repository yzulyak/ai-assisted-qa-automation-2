import type { Locator, Response } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { test, expect, extractProgramId } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';
import { uniqueName } from './helpers/uniqueName';

const SEMESTER_START_DATE = '2026-09-01';
const SEMESTER_END_DATE = '2026-12-15';

async function programIdFromResponse(response: Response): Promise<string> {
  return extractProgramId(await response.json());
}

/** CSS selector for AxeBuilder.include(), derived from a role-based dialog locator. */
async function axeIncludeSelectorFromDialog(dialog: Locator): Promise<string> {
  return dialog.evaluate((el) => {
    if (el.id) {
      return `#${CSS.escape(el.id)}`;
    }
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      return `[role="dialog"][aria-labelledby="${CSS.escape(labelledBy)}"]`;
    }
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) {
      return `[role="dialog"][aria-label="${CSS.escape(ariaLabel)}"]`;
    }
    return '[role="dialog"]';
  });
}

async function createProgramAndSelect(
  programs: ProgramsPage,
  trackProgram: (uuid: string, name?: string) => void,
  programName: string,
): Promise<void> {
  const createResponsePromise = programs.waitForProgramCreate();
  await programs.createProgram(programName);
  trackProgram(await programIdFromResponse(await createResponsePromise), programName);

  await expect(programs.programInList(programName)).toBeVisible({ timeout: 15_000 });
  await programs.selectProgram(programName);
  await expect(programs.semesterPanelTitle).toBeVisible();
}

test.describe('Programs: Create semester for a selected program', () => {
  test('TC-001 — Valid semester is created and appears in the panel', async ({
    page,
    trackProgram,
  }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Semester Program');
    const semesterName = uniqueName('Fall 2026');

    await programs.goto();
    await expect(programs.heading).toBeVisible();

    await createProgramAndSelect(programs, trackProgram, programName);

    await expect(programs.noSemestersYet).toBeVisible();

    const createSemesterPromise = programs.waitForSemesterCreate();
    await programs.openNewSemesterForm();
    await expect(programs.newSemesterModal.dialog).toBeVisible();
    await programs.newSemesterModal.fill(
      semesterName,
      SEMESTER_START_DATE,
      SEMESTER_END_DATE,
    );
    await programs.newSemesterModal.submit();
    await createSemesterPromise;

    await expect(programs.newSemesterModal.dialog).not.toBeVisible({ timeout: 15_000 });
    await expect(programs.semesterInPanel(semesterName)).toBeVisible();
    await expect(programs.noSemestersYet).not.toBeVisible();
  });

  test('TC-002 — Create Semester stays disabled when required fields are empty', async ({
    page,
    trackProgram,
  }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Empty Semester Fields Program');

    await programs.goto();
    await expect(programs.heading).toBeVisible();

    await createProgramAndSelect(programs, trackProgram, programName);
    await expect(programs.noSemestersYet).toBeVisible();

    await programs.openNewSemesterForm();
    await expect(programs.newSemesterModal.dialog).toBeVisible();
    await expect(programs.newSemesterModal.createButton).toBeDisabled();

    await programs.newSemesterModal.cancel();

    await expect(programs.newSemesterModal.dialog).not.toBeVisible();
    await expect(programs.noSemestersYet).toBeVisible();
  });

  test(
    'New Semester dialog opens via keyboard and reports known axe debt',
    { tag: '@a11y' },
    async ({ page, trackProgram }) => {
      const programs = new ProgramsPage(page);
      const programName = uniqueName('A11y Semester Program');

      await programs.goto();
      await expect(programs.heading).toBeVisible();

      await createProgramAndSelect(programs, trackProgram, programName);
      await expect(programs.addSemesterButton).toBeVisible();

      // Focus via POM — Tab traversal is impractical with 1000+ program-row action buttons.
      await programs.addSemesterButton.focus();
      await expect(programs.addSemesterButton).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(programs.newSemesterModal.dialog).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .include(await axeIncludeSelectorFromDialog(programs.newSemesterModal.dialog))
        .analyze();

      // Real product a11y debt on New Semester (do not .disableRules()):
      // - button-name: Mantine modal close control has no accessible name
      // - color-contrast: "Sessions start at this time by default" is 3.32:1 on white
      const violationIds = results.violations.map((v) => v.id).sort();
      await expect(violationIds).toEqual(['button-name', 'color-contrast']);
    },
  );
});
