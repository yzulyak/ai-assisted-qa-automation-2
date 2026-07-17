import { test as setup, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { LoginPage } from '../pages/LoginPage';
import { ProgramsPage } from '../pages/ProgramsPage';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

async function loginAndSave(page: Page): Promise<void> {
  const email = process.env.DIDAXIS_EMAIL ?? '';
  const password = process.env.DIDAXIS_PASSWORD ?? '';
  expect(email && password, 'Set DIDAXIS_EMAIL and DIDAXIS_PASSWORD in .env').toBeTruthy();

  const loginPage = new LoginPage(page);
  await loginPage.login(email, password);
  await expect(loginPage.signOutButton).toBeVisible({
    timeout: 15_000,
  });
  await page.context().storageState({ path: authFile });
}

setup('authenticate', async ({ browser }) => {
  if (fs.existsSync(authFile)) {
    const context = await browser.newContext({ storageState: authFile });
    const page = await context.newPage();
    const programsPage = new ProgramsPage(page);
    const loginPage = new LoginPage(page);

    await programsPage.goto();

    const stillLoggedIn = await loginPage.signOutButton
      .isVisible()
      .catch(() => false);

    if (stillLoggedIn) {
      await context.close();
      return;
    }

    await context.close();
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  await loginAndSave(page);
  await context.close();
});
