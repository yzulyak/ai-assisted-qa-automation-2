import type { Locator, Page } from '@playwright/test';

export class EditProgramModal {
  readonly page: Page;
  readonly dialog: Locator;
  readonly programNameInput: Locator;
  readonly descriptionInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly closeButton: Locator;
  readonly programNameRequiredLabel: Locator;
  readonly duplicateError: Locator;
  readonly showAiConfigButton: Locator;
  readonly lengthError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole('dialog', { name: 'Edit Program' });
    this.programNameInput = this.dialog.getByLabel('Program Name');
    this.descriptionInput = this.dialog.getByLabel('Description');
    this.saveButton = this.dialog.getByRole('button', { name: 'Save' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel' });
    this.closeButton = this.dialog.getByRole('banner').getByRole('button');
    this.programNameRequiredLabel = this.dialog.getByText('Program Name *');
    this.duplicateError = this.dialog.getByText(
      /already exists|name.*taken|already been used|duplicate/i,
    );
    this.showAiConfigButton = this.dialog.getByRole('button', {
      name: /Show AI Generation Config/i,
    });
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

  async clearDescription(): Promise<void> {
    await this.descriptionInput.clear();
  }

  async save(options?: { force?: boolean }): Promise<void> {
    await this.saveButton.click(options);
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
}
