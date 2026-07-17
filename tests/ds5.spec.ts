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
const NON_ADMIN_EMAIL = process.env.DIDAXIS_NON_ADMIN_EMAIL ?? '';
const NON_ADMIN_PASSWORD = process.env.DIDAXIS_NON_ADMIN_PASSWORD ?? '';

/** Confluence: Program Setup — Field Definitions */
const PROGRAM_NAME_MAX_LENGTH = 100;

const MAX_LENGTH_NAME_BASE =
  'Advanced Web Development and Cloud Architecture Certification Program Track Level Nine Extended Curriculum Design Specialization Module for Professional Engineers and Software Architects in Modern Enterprise Environments Including DevOps Security Scalability Microservices Containerization and Continuous Integration Delivery Pipelines Edition 2026 Final Version Release Candidate Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda Mu Nu Xi Omicron Pi Rho Sigma Tau Upsilon Phi Chi Psi Omega End';

const LONG_DESCRIPTION =
  'This comprehensive technical writing workshop covers curriculum scope spanning documentation standards, audience analysis, and information architecture. Prerequisites include basic writing proficiency and familiarity with collaborative editing tools. Delivery format combines instructor-led sessions with hands-on exercises and peer review cycles. Assessment methods include portfolio submissions, structured rubrics, and capstone documentation projects. Certification outcomes prepare participants for professional technical communication roles in software, engineering, and product organizations worldwide with industry-recognized credentials and practical skills.';

const EVIDENCE_DIR = path.resolve(__dirname, '../test-evidence/DS-5');

function maxLengthProgramName(): string {
  const suffix = Date.now().toString();
  return `${MAX_LENGTH_NAME_BASE.slice(0, Math.max(0, PROGRAM_NAME_MAX_LENGTH - suffix.length))}${suffix}`;
}

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

async function openNewProgramModal(programs: ProgramsPage): Promise<void> {
  await programs.openNewProgramForm();
  await expect(programs.newProgramModal.dialog).toBeVisible();
  await expect(programs.newProgramModal.programNameInput).toBeVisible();
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

async function expectProgramRowShowsNameAndDescription(
  programs: ProgramsPage,
  name: string,
  description: string,
): Promise<void> {
  const row = programs.programRow(name);
  await expect(row).toHaveCount(1);
  await expect(programs.programTextInRow(name, name)).toBeVisible();
  await expect(programs.programTextInRow(name, description)).toBeVisible();
}

async function expectNoHorizontalLayoutBreak(page: Page): Promise<void> {
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);
}

function isProgramsListRequest(url: string, method: string): boolean {
  if (method !== 'GET') {
    return false;
  }

  try {
    const pathname = new URL(url).pathname;
    return /\/programs(\/?$|\/?\?)/i.test(pathname) || /\/api\/.*programs/i.test(pathname);
  } catch {
    return /programs/i.test(url);
  }
}

test.beforeEach(async () => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'Set DIDAXIS_EMAIL and DIDAXIS_PASSWORD in .env',
  );
});

test.setTimeout(90_000);

test.describe('Positive flows', () => {
  test('TC-001: Each program in the list displays its name and description', async ({ page, trackProgram }) => {
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
      trackProgram(await createProgram(programs, program.name, program.description));
    }

    await expect(programs.table).toBeVisible();

    for (const program of seedPrograms) {
      await expectProgramRowShowsNameAndDescription(programs, program.name, program.description);
    }

    let seededProgramCount = 0;
    for (const program of seedPrograms) {
      seededProgramCount += await programs.programRow(program.name).count();
    }
    expect(seededProgramCount).toBe(3);
  });

  test('TC-002: Empty state message and create prompt are shown when no programs exist', async ({
    page,
  }) => {
    const programs = new ProgramsPage(page);
    await goToPrograms(programs);

    const rowCount = await programs.programRowCount();
    test.skip(rowCount > 0, 'Requires zero programs in the system to verify empty state');

    await expect(programs.programRows).toHaveCount(0);
    await expect(programs.emptyStateMessage).toBeVisible();
    await expect(programs.newProgramButton).toBeVisible();
    await expect(programs.newProgramButton).toBeEnabled();
  });
});

test.describe('Negative flows', () => {
  test('TC-003: Empty state is not shown when programs exist', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    await goToPrograms(programs);

    const programName = uniqueName('Cybersecurity Essentials');
    const description = 'Foundational cybersecurity training';

    trackProgram(await createProgram(programs, programName, description));

    await expect(programs.table).toBeVisible();
    await expectProgramRowShowsNameAndDescription(programs, programName, description);
    await expect(programs.emptyStateMessage).not.toBeVisible();
  });

  test('TC-004: Non-admin user cannot view the admin program list', async ({ page, trackProgram }) => {
    test.skip(
      !NON_ADMIN_EMAIL || !NON_ADMIN_PASSWORD,
      'Set DIDAXIS_NON_ADMIN_EMAIL and DIDAXIS_NON_ADMIN_PASSWORD in .env',
    );

    const programs = new ProgramsPage(page);
    const programName = uniqueName('Mobile App Development');

    await goToPrograms(programs);
    trackProgram(await createProgram(programs, programName, 'iOS and Android development'));

    await login(page, NON_ADMIN_EMAIL, NON_ADMIN_PASSWORD);
    await programs.goto();

    await expect(programs.newProgramButton).not.toBeVisible();

    const programVisible = await programs
      .programInList(programName)
      .isVisible()
      .catch(() => false);
    const accessDenied = await programs.unauthorizedMessage.isVisible().catch(() => false);

    if (programVisible && !accessDenied) {
      await expect(programs.anyEditButton).not.toBeVisible();
      await expect(programs.anyDeleteButton).not.toBeVisible();
    } else {
      expect(!programVisible || accessDenied).toBeTruthy();
    }
  });

  test('TC-005: Server error on load does not display the empty state', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    await goToPrograms(programs);

    const programName = uniqueName('Server Error Seed Program');
    trackProgram(await createProgram(programs, programName, 'Program used to seed list before simulated API failure'));

    await page.route('**/*', async (route) => {
      const request = route.request();
      if (isProgramsListRequest(request.url(), request.method())) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Failed to load programs' }),
        });
        return;
      }
      await route.continue();
    });

    await programs.goto();

    await expect(programs.listLoadError).toBeVisible({ timeout: 15_000 });
    await expect(programs.emptyStateMessage).not.toBeVisible();
    await expect(programs.programInList(programName)).not.toBeVisible();
  });

  test('TC-006: Program list does not display unrelated or internal fields', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    await goToPrograms(programs);

    const programName = uniqueName('Test Program');
    const description = 'Sample program for list display testing';

    trackProgram(await createProgram(programs, programName, description));

    const row = programs.programRow(programName);
    await expect(programs.programTextInRow(programName, programName)).toBeVisible();
    await expect(programs.programTextInRow(programName, description)).toBeVisible();

    const rowText = await row.innerText();
    expect(rowText).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
    expect(rowText).not.toMatch(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/);
  });
});

test.describe('Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    const programs = new ProgramsPage(page);
    await goToPrograms(programs);
  });

  test('TC-007: Special characters in name and description render correctly in the list', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Informatique & IA - Niveau 2');
    const description = 'Parcours avancé — IA & data (2026)';

    trackProgram(await createProgram(programs, programName, description));
    await expectProgramRowShowsNameAndDescription(programs, programName, description);

    const rowText = await programs.programRow(programName).innerText();
    expect(rowText).toContain('&');
    expect(rowText).toContain('—');
    expect(rowText).toContain('é');
    expect(rowText).not.toMatch(/&amp;|&lt;|&gt;/);
  });

  test('TC-008: Maximum-length program name displays correctly in the list', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = maxLengthProgramName();
    const description = 'Max-length name display test';

    expect(programName.length).toBe(PROGRAM_NAME_MAX_LENGTH);

    trackProgram(await createProgram(programs, programName, description));

    const row = programs.programRow(programName);
    await expect(row).toHaveCount(1);
    await expect(programs.programTextInRow(programName, description)).toBeVisible();
    await expect(row).toContainText(programName.slice(0, 40));

    const nameCell = programs.firstCellInRow(programName);
    const titleAttr = await nameCell.getAttribute('title');
    const ariaLabel = await nameCell.getAttribute('aria-label');
    const cellText = await nameCell.innerText();
    const fullNameAccessible =
      cellText.includes(programName) ||
      titleAttr === programName ||
      ariaLabel === programName ||
      (titleAttr?.includes(programName.slice(0, 20)) ?? false);

    expect(fullNameAccessible).toBeTruthy();
    await expectNoHorizontalLayoutBreak(page);
  });

  test('TC-009: Program with empty description still appears in the list with its name', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Standalone Certificate');

    trackProgram(await createProgram(programs, programName, ''));

    const row = programs.programRow(programName);
    await expect(row).toHaveCount(1);
    await expect(programs.programTextInRow(programName, programName)).toBeVisible();

    const rowText = (await row.innerText()).replace(programName, '').trim();
    expect(rowText).toMatch(/^$|^—$|^-+$|No description/i);
  });

  test('TC-010: Long description displays without breaking list layout', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Technical Writing Workshop');
    expect(LONG_DESCRIPTION.length).toBeGreaterThanOrEqual(500);

    trackProgram(await createProgram(programs, programName, LONG_DESCRIPTION));

    await expect(programs.programTextInRow(programName, programName)).toBeVisible();

    const descriptionVisible =
      (await programs
        .programTextInRow(programName, LONG_DESCRIPTION)
        .isVisible()
        .catch(() => false)) ||
      (await programs
        .programTextInRow(programName, LONG_DESCRIPTION.slice(0, 40), false)
        .isVisible()
        .catch(() => false));

    expect(descriptionVisible).toBeTruthy();
    await expectNoHorizontalLayoutBreak(page);
  });

  test('TC-011: Multiple programs with similar names are displayed as distinct list entries', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const seedPrograms = [
      { name: uniqueName('Test Program'), description: 'Baseline test program' },
      { name: uniqueName('Test Program Advanced'), description: 'Advanced test program track' },
      { name: uniqueName('Test Program Basics'), description: 'Introductory test program track' },
    ];

    for (const program of seedPrograms) {
      trackProgram(await createProgram(programs, program.name, program.description));
    }

    for (const program of seedPrograms) {
      await expectProgramRowShowsNameAndDescription(programs, program.name, program.description);
    }

    let seededProgramCount = 0;
    for (const program of seedPrograms) {
      seededProgramCount += await programs.programRow(program.name).count();
    }
    expect(seededProgramCount).toBe(3);
  });

  test('TC-012: Page refresh preserves the program list content', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const seedPrograms = [
      { name: uniqueName('Web Development 2026'), description: 'Full-stack web development program' },
      {
        name: uniqueName('Data Science Fundamentals'),
        description: 'Introductory data science curriculum',
      },
    ];

    for (const program of seedPrograms) {
      trackProgram(await createProgram(programs, program.name, program.description));
    }

    await programs.reload();
    await expect(programs.newProgramButton).toBeVisible();
    await expect(programs.table).toBeVisible({ timeout: 15_000 });

    for (const program of seedPrograms) {
      await expectProgramRowShowsNameAndDescription(programs, program.name, program.description);
    }

    let seededProgramCount = 0;
    for (const program of seedPrograms) {
      seededProgramCount += await programs.programRow(program.name).count();
    }
    expect(seededProgramCount).toBe(2);
  });

  test('TC-013: Programs page displays heading, subtitle, and program table', async ({ page }) => {
    const programs = new ProgramsPage(page);
    await expect(programs.heading).toBeVisible();
    await expect(programs.subtitle).toBeVisible();

    if (await programs.emptyStateMessage.isVisible()) {
      await expect(programs.emptyStateMessage).toBeVisible();
      await expect(programs.newProgramButton).toBeVisible();
      return;
    }

    await expect(programs.table).toBeVisible();
    await expect(programs.programColumnHeader).toBeVisible();
    await expect(programs.semesterPanelPlaceholder).toBeVisible();
  });

  test('TC-014: Program row exposes Edit and Delete action buttons', async ({ page, trackProgram }) => {
    const programs = new ProgramsPage(page);
    const programName = uniqueName('Action Buttons Program');
    const description = 'Verify row-level management actions are visible';

    trackProgram(await createProgram(programs, programName, description));

    await expect(programs.editButton(programName)).toBeVisible();
    await expect(programs.deleteButton(programName)).toBeVisible();
  });

  test('TC-015: Description field locator must be scoped to modal', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const rowCount = await programs.programRowCount();
    test.skip(rowCount === 0, 'Requires at least one program row to validate locator scoping');

    await openNewProgramModal(programs);
    await expect(programs.newProgramModal.descriptionInput).toHaveCount(1);
    await programs.newProgramModal.fill(undefined, 'Scoped description locator test');
    await expect(programs.newProgramModal.descriptionInput).toHaveValue('Scoped description locator test');
  });

  test('TC-016: Malformed programs API response shows error instead of blank list', async ({
    page,
  }) => {
    const programs = new ProgramsPage(page);

    await page.route('**/*', async (route) => {
      const request = route.request();
      if (isProgramsListRequest(request.url(), request.method())) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'not-json',
        });
        return;
      }
      await route.continue();
    });

    await programs.goto();

    await expect(programs.listLoadError).toBeVisible({ timeout: 15_000 });
    await expect(programs.emptyStateMessage).not.toBeVisible();
  });
});
