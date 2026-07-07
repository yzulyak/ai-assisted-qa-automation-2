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

const MAX_LENGTH_NAME_BASE =
  'Advanced Web Development and Cloud Architecture Certification Program Track Level Nine Extended Curriculum Design Specialization Module for Professional Engineers and Software Architects in Modern Enterprise Environments Including DevOps Security Scalability Microservices Containerization and Continuous Integration Delivery Pipelines Edition 2026 Final Version Release Candidate Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda Mu Nu Xi Omicron Pi Rho Sigma Tau Upsilon Phi Chi Psi Omega End';

const LONG_DESCRIPTION =
  'This comprehensive technical writing workshop covers curriculum scope spanning documentation standards, audience analysis, and information architecture. Prerequisites include basic writing proficiency and familiarity with collaborative editing tools. Delivery format combines instructor-led sessions with hands-on exercises and peer review cycles. Assessment methods include portfolio submissions, structured rubrics, and capstone documentation projects. Certification outcomes prepare participants for professional technical communication roles in software, engineering, and product organizations worldwide with industry-recognized credentials and practical skills.';

const EVIDENCE_DIR = path.resolve(__dirname, '../test-evidence/DS-5');

function uniqueName(base: string): string {
  return `${base}-${Date.now()}`;
}

function maxLengthProgramName(): string {
  const suffix = Date.now().toString();
  return `${MAX_LENGTH_NAME_BASE.slice(0, Math.max(0, PROGRAM_NAME_MAX_LENGTH - suffix.length))}${suffix}`;
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

function programRow(page: Page, name: string) {
  return page.locator('table tbody tr').filter({
    has: page.getByText(name, { exact: true }),
  });
}

function programInList(page: Page, name: string) {
  return programRow(page, name);
}

function emptyStateMessage(page: Page) {
  return page.getByText(
    /no programs yet|no programs have been|haven't created any programs|create your first program|get started by creating/i,
  );
}

function listLoadErrorMessage(page: Page) {
  return page
    .getByRole('alert')
    .or(page.getByText(/could not be loaded|failed to load|error loading|unable to load|something went wrong/i));
}

function unauthorizedMessage(page: Page) {
  return page.getByText(/unauthorized|access denied|forbidden|permission denied|not authorized/i);
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

async function expectProgramRowShowsNameAndDescription(
  page: Page,
  name: string,
  description: string,
): Promise<void> {
  const row = programRow(page, name);
  await expect(row).toHaveCount(1);
  await expect(row.getByText(name, { exact: true })).toBeVisible();
  await expect(row.getByText(description, { exact: true })).toBeVisible();
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
  test('TC-001: Each program in the list displays its name and description', async ({ page }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);

    const programs = [
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

    for (const program of programs) {
      await createProgram(page, program.name, program.description);
    }

    await expect(page.locator('table tbody')).toBeVisible();

    for (const program of programs) {
      await expectProgramRowShowsNameAndDescription(page, program.name, program.description);
    }

    let seededProgramCount = 0;
    for (const program of programs) {
      seededProgramCount += await programRow(page, program.name).count();
    }
    expect(seededProgramCount).toBe(3);
  });

  test('TC-002: Empty state message and create prompt are shown when no programs exist', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);

    const rowCount = await programRowCount(page);
    test.skip(rowCount > 0, 'Requires zero programs in the system to verify empty state');

    await expect(page.locator('table tbody tr')).toHaveCount(0);
    await expect(emptyStateMessage(page)).toBeVisible();
    await expect(newProgramButton(page)).toBeVisible();
    await expect(newProgramButton(page)).toBeEnabled();
  });
});

test.describe('Negative flows', () => {
  test('TC-003: Empty state is not shown when programs exist', async ({ page }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);

    const programName = uniqueName('Cybersecurity Essentials');
    const description = 'Foundational cybersecurity training';

    await createProgram(page, programName, description);

    await expect(page.locator('table tbody')).toBeVisible();
    await expectProgramRowShowsNameAndDescription(page, programName, description);
    await expect(emptyStateMessage(page)).not.toBeVisible();
  });

  test('TC-004: Non-admin user cannot view the admin program list', async ({ page }) => {
    test.skip(
      !NON_ADMIN_EMAIL || !NON_ADMIN_PASSWORD,
      'Set DIDAXIS_NON_ADMIN_EMAIL and DIDAXIS_NON_ADMIN_PASSWORD in .env',
    );

    const programName = uniqueName('Mobile App Development');

    await loginAsAdmin(page);
    await goToPrograms(page);
    await createProgram(page, programName, 'iOS and Android development');

    await login(page, NON_ADMIN_EMAIL, NON_ADMIN_PASSWORD);
    await page.goto(`${BASE_URL}/programs`);

    await expect(newProgramButton(page)).not.toBeVisible();

    const programVisible = await programInList(page, programName)
      .isVisible()
      .catch(() => false);
    const accessDenied = await unauthorizedMessage(page).isVisible().catch(() => false);

    if (programVisible && !accessDenied) {
      await expect(page.getByRole('button', { name: /^Edit / })).not.toBeVisible();
      await expect(page.getByRole('button', { name: /^Delete / })).not.toBeVisible();
    } else {
      expect(!programVisible || accessDenied).toBeTruthy();
    }
  });

  test('TC-005: Server error on load does not display the empty state', async ({ page }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);

    const programName = uniqueName('Server Error Seed Program');
    await createProgram(page, programName, 'Program used to seed list before simulated API failure');

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

    await page.goto(`${BASE_URL}/programs`);

    await expect(listLoadErrorMessage(page)).toBeVisible({ timeout: 15_000 });
    await expect(emptyStateMessage(page)).not.toBeVisible();
    await expect(programInList(page, programName)).not.toBeVisible();
  });

  test('TC-006: Program list does not display unrelated or internal fields', async ({ page }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);

    const programName = uniqueName('Test Program');
    const description = 'Sample program for list display testing';

    await createProgram(page, programName, description);

    const row = programRow(page, programName);
    await expect(row.getByText(programName, { exact: true })).toBeVisible();
    await expect(row.getByText(description, { exact: true })).toBeVisible();

    const rowText = await row.innerText();
    expect(rowText).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
    expect(rowText).not.toMatch(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/);
  });
});

test.describe('Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await goToPrograms(page);
  });

  test('TC-007: Special characters in name and description render correctly in the list', async ({
    page,
  }) => {
    const programName = uniqueName('Informatique & IA - Niveau 2');
    const description = 'Parcours avancé — IA & data (2026)';

    await createProgram(page, programName, description);
    await expectProgramRowShowsNameAndDescription(page, programName, description);

    const rowText = await programRow(page, programName).innerText();
    expect(rowText).toContain('&');
    expect(rowText).toContain('—');
    expect(rowText).toContain('é');
    expect(rowText).not.toMatch(/&amp;|&lt;|&gt;/);
  });

  test('TC-008: Maximum-length program name displays correctly in the list', async ({ page }) => {
    const programName = maxLengthProgramName();
    const description = 'Max-length name display test';

    expect(programName.length).toBe(PROGRAM_NAME_MAX_LENGTH);

    await createProgram(page, programName, description);

    const row = programRow(page, programName);
    await expect(row).toHaveCount(1);
    await expect(row.getByText(description, { exact: true })).toBeVisible();
    await expect(row).toContainText(programName.slice(0, 40));

    const nameCell = row.locator('td').first();
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

  test('TC-009: Program with empty description still appears in the list with its name', async ({
    page,
  }) => {
    const programName = uniqueName('Standalone Certificate');

    await createProgram(page, programName, '');

    const row = programRow(page, programName);
    await expect(row).toHaveCount(1);
    await expect(row.getByText(programName, { exact: true })).toBeVisible();

    const rowText = (await row.innerText()).replace(programName, '').trim();
    expect(rowText).toMatch(/^$|^—$|^-+$|No description/i);
  });

  test('TC-010: Long description displays without breaking list layout', async ({ page }) => {
    const programName = uniqueName('Technical Writing Workshop');
    expect(LONG_DESCRIPTION.length).toBeGreaterThanOrEqual(500);

    await createProgram(page, programName, LONG_DESCRIPTION);

    const row = programRow(page, programName);
    await expect(row.getByText(programName, { exact: true })).toBeVisible();

    const descriptionVisible =
      (await row.getByText(LONG_DESCRIPTION, { exact: true }).isVisible().catch(() => false)) ||
      (await row.getByText(LONG_DESCRIPTION.slice(0, 40)).isVisible().catch(() => false));

    expect(descriptionVisible).toBeTruthy();
    await expectNoHorizontalLayoutBreak(page);
  });

  test('TC-011: Multiple programs with similar names are displayed as distinct list entries', async ({
    page,
  }) => {
    const programs = [
      { name: uniqueName('Test Program'), description: 'Baseline test program' },
      { name: uniqueName('Test Program Advanced'), description: 'Advanced test program track' },
      { name: uniqueName('Test Program Basics'), description: 'Introductory test program track' },
    ];

    for (const program of programs) {
      await createProgram(page, program.name, program.description);
    }

    for (const program of programs) {
      await expectProgramRowShowsNameAndDescription(page, program.name, program.description);
    }

    let seededProgramCount = 0;
    for (const program of programs) {
      seededProgramCount += await programRow(page, program.name).count();
    }
    expect(seededProgramCount).toBe(3);
  });

  test('TC-012: Page refresh preserves the program list content', async ({ page }) => {
    const programs = [
      { name: uniqueName('Web Development 2026'), description: 'Full-stack web development program' },
      {
        name: uniqueName('Data Science Fundamentals'),
        description: 'Introductory data science curriculum',
      },
    ];

    for (const program of programs) {
      await createProgram(page, program.name, program.description);
    }

    await page.reload();
    await expect(newProgramButton(page)).toBeVisible();
    await expect(page.locator('table tbody')).toBeVisible({ timeout: 15_000 });

    for (const program of programs) {
      await expectProgramRowShowsNameAndDescription(page, program.name, program.description);
    }

    let seededProgramCount = 0;
    for (const program of programs) {
      seededProgramCount += await programRow(page, program.name).count();
    }
    expect(seededProgramCount).toBe(2);
  });

  test('TC-013: Programs page displays heading, subtitle, and program table', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Programs', level: 2 })).toBeVisible();
    await expect(page.getByText('Manage academic programs and semesters')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Program' })).toBeVisible();
    await expect(page.getByText('Select a program to manage semesters')).toBeVisible();
  });

  test('TC-014: Program row exposes Edit and Delete action buttons', async ({ page }) => {
    const programName = uniqueName('Action Buttons Program');
    const description = 'Verify row-level management actions are visible';

    await createProgram(page, programName, description);

    const row = programRow(page, programName);
    await expect(row.getByRole('button', { name: `Edit ${programName}` })).toBeVisible();
    await expect(row.getByRole('button', { name: `Delete ${programName}` })).toBeVisible();
  });

  test('TC-015: Description field locator must be scoped to modal', async ({ page }) => {
    const rowCount = await programRowCount(page);
    test.skip(rowCount === 0, 'Requires at least one program row to validate locator scoping');

    await openNewProgramModal(page);
    await expect(descriptionField(page)).toHaveCount(1);
    await descriptionField(page).fill('Scoped description locator test');
    await expect(descriptionField(page)).toHaveValue('Scoped description locator test');
  });

  test('TC-016: Malformed programs API response shows error instead of blank list', async ({
    page,
  }) => {
    await loginAsAdmin(page);

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

    await page.goto(`${BASE_URL}/programs`);

    await expect(listLoadErrorMessage(page)).toBeVisible({ timeout: 15_000 });
    await expect(emptyStateMessage(page)).not.toBeVisible();
  });
});
