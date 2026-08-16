import type { Locator, Page } from '@playwright/test';
import { BASE_URL } from './baseUrl';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly signOutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.signInButton = page.getByRole('button', { name: 'Sign In' });
    this.signOutButton = page.getByRole('button', { name: 'Sign out' });
  }

  async goto(): Promise<void> {
    await this.page.goto(`${BASE_URL}/login`);
  }

  async fillCredentials(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async submit(): Promise<void> {
    await this.signInButton.click();
  }

  async login(email: string, password: string): Promise<void> {
    await this.goto();
    await this.fillCredentials(email, password);
    await this.submit();
  }
}
