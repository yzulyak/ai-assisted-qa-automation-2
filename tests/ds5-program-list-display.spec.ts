import dotenv from 'dotenv';
import path from 'path';
import type { Page, Response } from '@playwright/test';
import { test, expect, extractProgramId } from '../fixtures/cleanup.fixture';
import { LoginPage } from '../pages/LoginPage';
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

async function expectNoHorizontalLayoutBreak(page: Page): Promise<void> {
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);
}

async function mockProgramsGet(
  page: Page,
  options: { status: number; body: string; contentType?: string },
): Promise<void> {
  await page.route('**/api/programs**', async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: options.status,
        contentType: options.contentType ?? 'application/json',
        body: options.body,
      });
    }
    return route.continue();
  });
}

test.beforeEach(async () => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'Set DIDAXIS_EMAIL and DIDAXIS_PASSWORD in .env',
  );
});

test.setTimeout(90_000);

test.describe('DS-5: Program list filtering and display', () => {
  test.describe('Positive', () => {
    test('TC-001 — Display program list with key details', async ({ page, trackProgram }) => {
      const programs = new ProgramsPage(page);
      await goToPrograms(programs);

      const seedPrograms = [
        {
          name: uniqueName('Web Development 2026'),
          description: 'Full-stack web development program',
        },
        {
          name: uniqueName('Data Science Fundamentals'),
          description: 'Introductory data science curriculum',
        },
        {
          name: uniqueName('Cloud Computing 2026'),
          description: 'Intro to cloud platforms and services',
        },
      ];

      for (const program of seedPrograms) {
        trackProgram(await createProgram(programs, program.name, program.description), program.name);
      }

      await expect(programs.table).toBeVisible();

      for (const program of seedPrograms) {
        await expect.soft(programs.programTextInRow(program.name, program.name)).toBeVisible();
        await expect.soft(programs.programTextInRow(program.name, program.description)).toBeVisible();
      }
    });

    test('TC-002 — Empty state when no programs exist', async ({ page }) => {
      await mockProgramsGet(page, {
        status: 200,
        body: JSON.stringify({ data: [] }),
      });

      const programs = new ProgramsPage(page);
      await programs.goto();
      await expect(programs.heading).toBeVisible({ timeout: 15_000 });

      await expect(programs.emptyStateExact).toBeVisible();
      await expect(programs.newProgramButton).toBeVisible();
      await expect(programs.newProgramButton).toBeEnabled();
    });
  });

  test.describe('Negative', () => {
    test('TC-003 — Empty state is not shown when programs exist', async ({ page, trackProgram }) => {
      const programs = new ProgramsPage(page);
      await goToPrograms(programs);

      const programName = uniqueName('Cybersecurity Essentials');
      const description = 'Foundational cybersecurity training';

      trackProgram(await createProgram(programs, programName, description), programName);

      await expect(programs.table).toBeVisible();
      await expect(programs.programTextInRow(programName, programName)).toBeVisible();
      await expect(programs.programTextInRow(programName, description)).toBeVisible();
      await expect(programs.emptyStateMessage).not.toBeVisible();
    });

    test.describe('without authenticated session', () => {
      test.use({ storageState: { cookies: [], origins: [] } });

      test('TC-004 — Unauthenticated user cannot view the program list', async ({ page }) => {
        const programs = new ProgramsPage(page);
        const loginPage = new LoginPage(page);

        await programs.goto();

        await expect(page).toHaveURL(/\/login/);
        await expect(loginPage.emailInput).toBeVisible();
        await expect(loginPage.passwordInput).toBeVisible();
        await expect(programs.table).not.toBeVisible();
      });
    });

    test.fixme(
      'TC-005 — Server error on load does not display the empty state',
      {
        annotation: {
          type: 'bug',
          description:
            'DS-35/DS-72/DS-112: GET /api/programs HTTP 500 shows empty state instead of an error',
        },
      },
      async ({ page }) => {
        await mockProgramsGet(page, {
          status: 500,
          body: JSON.stringify({ message: 'Failed to load programs' }),
        });

        const programs = new ProgramsPage(page);
        await programs.goto();

        await expect(programs.listLoadError).toBeVisible({ timeout: 15_000 });
        await expect(programs.emptyStateMessage).not.toBeVisible();
      },
    );

    test('TC-006 — Program list does not display unrelated or internal fields', async ({
      page,
      trackProgram,
    }) => {
      const programs = new ProgramsPage(page);
      await goToPrograms(programs);

      const programName = uniqueName('Test Program');
      const description = 'Sample program for list display testing';

      trackProgram(await createProgram(programs, programName, description), programName);

      await expect(programs.programTextInRow(programName, programName)).toBeVisible();
      await expect(programs.programTextInRow(programName, description)).toBeVisible();

      const rowText = await programs.programRow(programName).innerText();
      expect(rowText).not.toMatch(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
      );
      expect(rowText).not.toMatch(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/);
    });
  });

  test.describe('Edge', () => {
    test.beforeEach(async ({ page }) => {
      const programs = new ProgramsPage(page);
      await goToPrograms(programs);
    });

    test('TC-007 — Special characters in name and description render correctly in the list', async ({
      page,
      trackProgram,
    }) => {
      const programs = new ProgramsPage(page);
      const programName = uniqueName('Informatique & IA — Niveau 2');
      const description = 'Parcours avancé — IA & data (2026)';

      trackProgram(await createProgram(programs, programName, description), programName);

      await expect(programs.programTextInRow(programName, programName)).toBeVisible();
      await expect(programs.programTextInRow(programName, description)).toBeVisible();

      const rowText = await programs.programRow(programName).innerText();
      expect(rowText).toContain('&');
      expect(rowText).toContain('—');
      expect(rowText).toContain('é');
      expect(rowText).not.toMatch(/&amp;|&lt;|&gt;/);
    });

    test('TC-008 — Maximum-length program name displays correctly in the list', async ({
      page,
      trackProgram,
    }) => {
      const programs = new ProgramsPage(page);
      const suffix = Date.now().toString();
      const programName = `${'A'.repeat(Math.max(0, PROGRAM_NAME_MAX_LENGTH - suffix.length))}${suffix}`;
      const description = 'Max-length name display test';

      expect(programName.length).toBe(PROGRAM_NAME_MAX_LENGTH);

      trackProgram(await createProgram(programs, programName, description), programName);

      await expect(programs.programTextInRow(programName, programName)).toBeVisible();
      await expect(programs.programTextInRow(programName, description)).toBeVisible();
      await expectNoHorizontalLayoutBreak(page);
    });

    test('TC-009 — Program with empty description still appears in the list with its name', async ({
      page,
      trackProgram,
    }) => {
      const programs = new ProgramsPage(page);
      const programName = uniqueName('Standalone Certificate');

      trackProgram(await createProgram(programs, programName, ''), programName);

      await expect(programs.programTextInRow(programName, programName)).toBeVisible();
    });

    test('TC-010 — Long description displays without breaking list layout', async ({
      page,
      trackProgram,
    }) => {
      const programs = new ProgramsPage(page);
      const programName = uniqueName('Technical Writing Workshop');
      const description = 'D'.repeat(500);

      expect(description.length).toBeGreaterThanOrEqual(500);

      trackProgram(await createProgram(programs, programName, description), programName);

      await expect(programs.programTextInRow(programName, programName)).toBeVisible();
      await expect
        .poll(async () => {
          const fullVisible =
            (await programs.programTextInRow(programName, description).count()) > 0;
          const truncatedVisible =
            (await programs
              .programTextInRow(programName, description.slice(0, 40), false)
              .count()) > 0;
          return fullVisible || truncatedVisible;
        })
        .toBeTruthy();
      await expectNoHorizontalLayoutBreak(page);
    });

    test('TC-011 — Multiple programs with similar names are displayed as distinct list entries', async ({
      page,
      trackProgram,
    }) => {
      const programs = new ProgramsPage(page);
      const seedPrograms = [
        { name: uniqueName('Test Program'), description: 'Baseline test program' },
        { name: uniqueName('Test Program Advanced'), description: 'Advanced test program track' },
        { name: uniqueName('Test Program Basics'), description: 'Introductory test program track' },
      ];

      for (const program of seedPrograms) {
        trackProgram(await createProgram(programs, program.name, program.description), program.name);
      }

      for (const program of seedPrograms) {
        await expect(programs.programTextInRow(program.name, program.name)).toBeVisible();
        await expect(programs.programTextInRow(program.name, program.description)).toBeVisible();
      }

      let seededProgramCount = 0;
      for (const program of seedPrograms) {
        seededProgramCount += await programs.programRow(program.name).count();
      }
      expect(seededProgramCount).toBe(3);
    });

    test('TC-012 — Page refresh preserves the program list content', async ({ page, trackProgram }) => {
      const programs = new ProgramsPage(page);
      const seedPrograms = [
        {
          name: uniqueName('Web Development 2026'),
          description: 'Full-stack web development program',
        },
        {
          name: uniqueName('Data Science Fundamentals'),
          description: 'Introductory data science curriculum',
        },
      ];

      for (const program of seedPrograms) {
        trackProgram(await createProgram(programs, program.name, program.description), program.name);
      }

      await programs.reload();
      await expect(programs.newProgramButton).toBeVisible();
      await expect(programs.table).toBeVisible({ timeout: 15_000 });

      for (const program of seedPrograms) {
        await expect(programs.programTextInRow(program.name, program.name)).toBeVisible();
        await expect(programs.programTextInRow(program.name, program.description)).toBeVisible();
      }
    });

    test('TC-013 — Programs page displays heading, subtitle, and program table', async ({ page }) => {
      const programs = new ProgramsPage(page);

      await expect.soft(programs.heading).toBeVisible();
      await expect.soft(programs.subtitle).toBeVisible();
      await expect.soft(programs.tableOrEmptyState).toBeVisible();

      const emptyStateCount = await programs.emptyStateExact.count();
      if (emptyStateCount > 0) {
        await expect.soft(programs.emptyStateExact).toBeVisible();
        await expect.soft(programs.newProgramButton).toBeVisible();
        return;
      }

      await expect.soft(programs.table).toBeVisible();
      await expect.soft(programs.programColumnHeader).toBeVisible();
      await expect.soft(programs.semesterPanelPlaceholder).toBeVisible();
    });

    test('TC-014 — Program row exposes Edit and Delete action buttons', async ({
      page,
      trackProgram,
    }) => {
      const programs = new ProgramsPage(page);
      const programName = uniqueName('Action Buttons Program');
      const description = 'Verify row-level management actions are visible';

      trackProgram(await createProgram(programs, programName, description), programName);

      await expect(programs.editButton(programName)).toBeVisible();
      await expect(programs.deleteButton(programName)).toBeVisible();
    });
  });

  test.describe('Network', () => {
    test(
      'TC-015 — Programs empty state when API returns no programs',
      { tag: '@network' },
      async ({ page }) => {
        await mockProgramsGet(page, {
          status: 200,
          body: JSON.stringify({ data: [] }),
        });

        const programs = new ProgramsPage(page);
        await programs.goto();
        await expect(programs.heading).toBeVisible({ timeout: 15_000 });

        await expect(programs.emptyStateExact).toBeVisible();
        await expect(programs.newProgramButton).toBeVisible();
      },
    );

    test.fixme(
      'TC-016 — Malformed programs API response shows error instead of blank list',
      {
        tag: '@network',
        annotation: {
          type: 'bug',
          description:
            'DS-114: malformed GET /api/programs blanks the Programs view with no error UI',
        },
      },
      async ({ page }) => {
        await mockProgramsGet(page, {
          status: 200,
          contentType: 'application/json',
          body: 'not-json',
        });

        const programs = new ProgramsPage(page);
        await programs.goto();

        await expect(programs.listLoadError).toBeVisible({ timeout: 15_000 });
        await expect(programs.emptyStateMessage).not.toBeVisible();
      },
    );

    test.fixme(
      'TC-017 — Programs API 503 does not display the empty state',
      {
        tag: '@network',
        annotation: {
          type: 'bug',
          description:
            'DS-35/DS-72/DS-112: GET /api/programs HTTP 503 shows empty state instead of an error',
        },
      },
      async ({ page }) => {
        await mockProgramsGet(page, {
          status: 503,
          body: JSON.stringify({ message: 'Service unavailable' }),
        });

        const programs = new ProgramsPage(page);
        await programs.goto();

        await expect(programs.listLoadError).toBeVisible({ timeout: 15_000 });
        await expect(programs.emptyStateMessage).not.toBeVisible();
      },
    );
  });
});
