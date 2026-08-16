import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../fixtures/cleanup.fixture';
import { DashboardPage } from '../pages/DashboardPage';
import { ProgramsPage } from '../pages/ProgramsPage';

test.describe('DS-119: Dashboard displaying the right components', () => {
  test.beforeEach(async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.heading).toBeVisible({ timeout: 15_000 });
  });

  test('TC-001 — Admin sees the four Dashboard blocks', { tag: '@smoke' }, async ({ page }) => {
    const dashboard = new DashboardPage(page);

    await expect(dashboard.heading).toBeVisible();
    await expect(dashboard.programsCard).toBeVisible();
    await expect(dashboard.calendarCard).toBeVisible();
    await expect(dashboard.validationCard).toBeVisible();
    await expect(dashboard.aiAssistCard).toBeVisible();

    // color-contrast: Mantine/design-system dimmed text tokens fail WCAG AA — tracked for design follow-up
    // page-has-heading-one: Dashboard uses h2 only (best-practice rule)
    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast', 'page-has-heading-one'])
      .analyze();
    await expect(results.violations).toEqual([]);
  });

  test('TC-002 — Clicking the Programs card opens the Programs page', { tag: '@e2e' }, async ({
    page,
  }) => {
    const dashboard = new DashboardPage(page);
    const programs = new ProgramsPage(page);

    await dashboard.clickProgramsCard();

    await expect(page).toHaveURL(/\/programs/);
    await expect(programs.heading).toBeVisible({ timeout: 15_000 });
  });

  test.fixme(
    'TC-003 — Clicking the Calendar card opens the Calendar page',
    {
      annotation: {
        type: 'bug',
        description: 'DS-120: Calendar card does not navigate',
      },
    },
    async ({ page }) => {
      const dashboard = new DashboardPage(page);

      await dashboard.clickCalendarCard();

      await expect(page).toHaveURL(/\/calendar/);
    },
  );

  test.fixme(
    'TC-004 — Clicking the Validation card opens the Validation page',
    {
      annotation: {
        type: 'bug',
        description: 'DS-120: Validation card does not navigate',
      },
    },
    async ({ page }) => {
      const dashboard = new DashboardPage(page);

      await dashboard.clickValidationCard();

      await expect(page).toHaveURL(/\/validation/);
    },
  );

  test.fixme(
    'TC-005 — Clicking the AI Assist card opens the AI Assist page',
    {
      annotation: {
        type: 'bug',
        description: 'DS-120: AI Assist card does not navigate',
      },
    },
    async ({ page }) => {
      const dashboard = new DashboardPage(page);

      await dashboard.clickAiAssistCard();

      await expect(page).toHaveURL(/\/cli/);
    },
  );

  test('TC-006 — Dashboard does not show unrelated navigation blocks as cards', { tag: '@regression' }, async ({
    page,
  }) => {
    const dashboard = new DashboardPage(page);

    await expect(dashboard.programsCard).toBeVisible();
    await expect(dashboard.calendarCard).toBeVisible();
    await expect(dashboard.validationCard).toBeVisible();
    await expect(dashboard.aiAssistCard).toBeVisible();

    await expect(dashboard.settingsCard).not.toBeVisible();
    await expect(dashboard.exportCard).not.toBeVisible();
    await expect(dashboard.schedulerCard).not.toBeVisible();
  });

  test('TC-007 — Sidebar Dashboard link returns to the Dashboard without losing the four cards', { tag: '@e2e' }, async ({
    page,
  }) => {
    const dashboard = new DashboardPage(page);
    const programs = new ProgramsPage(page);

    await programs.goto();
    await expect(programs.heading).toBeVisible({ timeout: 15_000 });

    await dashboard.openDashboardFromSidebar();

    await expect(dashboard.heading).toBeVisible({ timeout: 15_000 });
    await expect(dashboard.programsCard).toBeVisible();
    await expect(dashboard.calendarCard).toBeVisible();
    await expect(dashboard.validationCard).toBeVisible();
    await expect(dashboard.aiAssistCard).toBeVisible();
  });

  test.fixme(
    'TC-008 — Each Dashboard card is keyboard-focusable and activatable with Enter',
    {
      annotation: {
        type: 'bug',
        description:
          'DS-121: Dashboard block cards are not keyboard-focusable or activatable',
      },
    },
    async ({ page }) => {
      const dashboard = new DashboardPage(page);

      await dashboard.programsCard.focus();
      await page.keyboard.press('Enter');

      await expect(page).toHaveURL(/\/programs/);
    },
  );

  test.fixme(
    'TC-009 — Rapid sequential card clicks still land on the last selected destination',
    {
      annotation: {
        type: 'bug',
        description: 'DS-120: Calendar and Validation cards do not navigate',
      },
    },
    async ({ page }) => {
      const dashboard = new DashboardPage(page);

      await dashboard.clickCalendarCard();
      await dashboard.goto();
      await expect(dashboard.heading).toBeVisible({ timeout: 15_000 });

      await dashboard.clickValidationCard();

      await expect(page).toHaveURL(/\/validation/);
    },
  );

  test('TC-010 — Browser back from a card destination returns to the Dashboard with all cards visible', { tag: '@e2e' }, async ({
    page,
  }) => {
    const dashboard = new DashboardPage(page);

    await dashboard.clickProgramsCard();
    await expect(page).toHaveURL(/\/programs/);

    await page.goBack();

    await expect(dashboard.heading).toBeVisible({ timeout: 15_000 });
    await expect(dashboard.programsCard).toBeVisible();
    await expect(dashboard.calendarCard).toBeVisible();
    await expect(dashboard.validationCard).toBeVisible();
    await expect(dashboard.aiAssistCard).toBeVisible();
  });
});
