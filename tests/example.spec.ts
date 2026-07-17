import { test, expect } from '@playwright/test';
import { PlaywrightDocsPage } from '../pages/PlaywrightDocsPage';

test('has title', async ({ page }) => {
  const docs = new PlaywrightDocsPage(page);
  await docs.goto();
  await expect(page).toHaveTitle(/Playwright/);
});

test('get started link', async ({ page }) => {
  const docs = new PlaywrightDocsPage(page);
  await docs.goto();
  await docs.openGetStarted();
  await expect(docs.installationHeading).toBeVisible();
});
