import type { Locator, Page } from '@playwright/test';

const DOCS_URL = 'https://playwright.dev/';

export class PlaywrightDocsPage {
  readonly page: Page;
  readonly getStartedLink: Locator;
  readonly installationHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.getStartedLink = page.getByRole('link', { name: 'Get started' });
    this.installationHeading = page.getByRole('heading', { name: 'Installation' });
  }

  async goto(): Promise<void> {
    await this.page.goto(DOCS_URL);
  }

  async openGetStarted(): Promise<void> {
    await this.getStartedLink.click();
  }
}
