import type { Locator, Page } from '@playwright/test';

export class NewProgramModal {
  readonly page: Page;
  readonly dialog: Locator;
  readonly programNameInput: Locator;
  readonly descriptionInput: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;
  readonly closeButton: Locator;
  readonly programNameRequiredLabel: Locator;
  readonly duplicateError: Locator;
  readonly showAiConfigButton: Locator;
  readonly hideAiConfigButton: Locator;
  readonly totalProgramHoursLabel: Locator;
  readonly targetAudienceLabel: Locator;
  readonly focusAreasLabel: Locator;
  readonly syncAsyncRatioLabel: Locator;
  readonly defaultSessionHoursInput: Locator;
  readonly defaultExamHoursInput: Locator;
  readonly lengthError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole('dialog', { name: 'New Program' });
    this.programNameInput = this.dialog.getByLabel('Program Name');
    this.descriptionInput = this.dialog.getByLabel('Description');
    this.createButton = this.dialog.getByRole('button', { name: 'Create' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel' });
    this.closeButton = this.dialog.getByRole('banner').getByRole('button');
    this.programNameRequiredLabel = this.dialog.getByText('Program Name *');
    this.duplicateError = this.dialog.getByText(
      /already exists|name.*taken|already been used|duplicate/i,
    );
    this.showAiConfigButton = this.dialog.getByRole('button', {
      name: /Show AI Generation Config/i,
    });
    this.hideAiConfigButton = this.dialog.getByRole('button', {
      name: /Hide AI Generation Config/i,
    });
    this.totalProgramHoursLabel = this.dialog.getByText('Total Program Hours');
    this.targetAudienceLabel = this.dialog.getByText('Target Audience');
    this.focusAreasLabel = this.dialog.getByText('Focus Areas');
    this.syncAsyncRatioLabel = this.dialog.getByText(/Sync\/Async Ratio/);
    this.defaultSessionHoursInput = this.dialog.getByLabel('Default Session Hours');
    this.defaultExamHoursInput = this.dialog.getByLabel('Default Exam Hours');
    this.lengthError = this.dialog
      .getByRole('alert')
      .or(this.dialog.getByText(/too long|maximum|100|500/i));
  }

  async fill(name?: string, description?: string): Promise<void> {
    if (name !== undefined) {
      await this.programNameInput.fill(name);
    }
    if (description !== undefined) {
      await this.descriptionInput.fill(description);
    }
  }

  async clearProgramName(): Promise<void> {
    await this.programNameInput.clear();
  }

  async submit(options?: { force?: boolean }): Promise<void> {
    await this.createButton.click(options);
  }

  async submitByDoubleClick(): Promise<void> {
    await this.createButton.dblclick();
  }

  async showAiConfig(): Promise<void> {
    await this.showAiConfigButton.click();
  }

  async hideAiConfig(): Promise<void> {
    await this.hideAiConfigButton.click();
  }

  async closeWithoutSaving(): Promise<void> {
    if (await this.cancelButton.isVisible()) {
      await this.cancelButton.click();
    } else if (await this.closeButton.isVisible()) {
      await this.closeButton.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
  }

  /**
   * CSS selector for AxeBuilder.include(), derived from the role-based dialog locator.
   */
  async axeIncludeSelector(): Promise<string> {
    return this.dialog.evaluate((el) => {
      if (el.id) {
        return `#${CSS.escape(el.id)}`;
      }
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) {
        return `[role="dialog"][aria-labelledby="${CSS.escape(labelledBy)}"]`;
      }
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) {
        return `[role="dialog"][aria-label="${CSS.escape(ariaLabel)}"]`;
      }
      return '[role="dialog"]';
    });
  }
}
