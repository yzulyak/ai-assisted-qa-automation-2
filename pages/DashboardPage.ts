import type { Locator, Page } from '@playwright/test';
import { BASE_URL } from './baseUrl';

/** Unique subtitle text that identifies each Dashboard block card. */
const CARD_COPY = {
  Programs: 'Manage academic programs',
  Calendar: 'Schedule & drag-drop',
  Validation: 'Check for conflicts',
  'AI Assist': 'AI-powered editing',
} as const;

export class DashboardPage {
  readonly page: Page;
  readonly main: Locator;
  readonly heading: Locator;
  readonly welcomeText: Locator;
  readonly programsCard: Locator;
  readonly calendarCard: Locator;
  readonly validationCard: Locator;
  readonly aiAssistCard: Locator;
  readonly settingsCard: Locator;
  readonly exportCard: Locator;
  readonly schedulerCard: Locator;
  readonly dashboardNavLink: Locator;
  readonly programsNavLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { name: 'Dashboard', level: 2 });
    this.welcomeText = this.main.getByText('Welcome to Didaxis Studio');
    this.programsCard = this.blockCard('Programs', CARD_COPY.Programs);
    this.calendarCard = this.blockCard('Calendar', CARD_COPY.Calendar);
    this.validationCard = this.blockCard('Validation', CARD_COPY.Validation);
    this.aiAssistCard = this.blockCard('AI Assist', CARD_COPY['AI Assist']);
    // Unrelated destinations must not appear as Dashboard block cards in main
    this.settingsCard = this.namedBlockCard('Settings');
    this.exportCard = this.namedBlockCard('Export');
    this.schedulerCard = this.namedBlockCard('Scheduler');
    this.dashboardNavLink = page.getByRole('navigation').getByRole('button', {
      name: /Dashboard/i,
    });
    this.programsNavLink = page.getByRole('navigation').getByRole('button', {
      name: /Programs/i,
    });
  }

  private blockCard(title: string, description: string): Locator {
    return this.main
      .locator('.mantine-Card-root')
      .filter({ has: this.page.getByText(title, { exact: true }) })
      .filter({ has: this.page.getByText(description, { exact: true }) });
  }

  /** Exact title text inside main — used for negative "no such card" checks. */
  private namedBlockCard(title: string): Locator {
    return this.main.getByText(title, { exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto(`${BASE_URL}/`);
  }

  async clickProgramsCard(): Promise<void> {
    await this.programsCard.click();
  }

  async clickCalendarCard(): Promise<void> {
    await this.calendarCard.click();
  }

  async clickValidationCard(): Promise<void> {
    await this.validationCard.click();
  }

  async clickAiAssistCard(): Promise<void> {
    await this.aiAssistCard.click();
  }

  async openDashboardFromSidebar(): Promise<void> {
    await this.dashboardNavLink.click();
  }
}
