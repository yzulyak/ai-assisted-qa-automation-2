import dotenv from 'dotenv';
import path from 'path';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/ProgramsPage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ADMIN_EMAIL = process.env.DIDAXIS_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.DIDAXIS_PASSWORD ?? '';

test.beforeEach(async () => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'Set DIDAXIS_EMAIL and DIDAXIS_PASSWORD in .env',
  );
});

test.describe('DS-5: Program list filtering and display', () => {
  test.fixme(
    'TC-018 — Programs page has no WCAG 2 A/AA axe violations',
    {
      tag: '@a11y',
      annotation: {
        type: 'bug',
        description: 'DS-113: Programs page WCAG 2 AA color-contrast failures',
      },
    },
    async ({ page }) => {
      const programs = new ProgramsPage(page);

      await programs.goto();
      await expect(programs.heading).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      await expect(results.violations).toEqual([]);
    },
  );

  test(
    'TC-019 — Keyboard path opens the New Program dialog from the primary CTA',
    { tag: '@a11y' },
    async ({ page }) => {
      const programs = new ProgramsPage(page);

      await programs.goto();
      await expect(programs.heading).toBeVisible();
      await expect(programs.newProgramButton).toBeVisible();

      const maxTabs = 20;
      for (let i = 0; i < maxTabs; i++) {
        const focused = await programs.newProgramButton.evaluate(
          (el) => el === document.activeElement,
        );
        if (focused) {
          break;
        }
        await page.keyboard.press('Tab');
      }

      await expect(programs.newProgramButton).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(programs.newProgramModal.dialog).toBeVisible();
    },
  );
});
