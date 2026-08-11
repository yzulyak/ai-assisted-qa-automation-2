import type { Locator, Page } from '@playwright/test';

export class NewSemesterModal {
  readonly page: Page;
  readonly dialog: Locator;
  readonly semesterNameInput: Locator;
  readonly startDateInput: Locator;
  readonly endDateInput: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;
  readonly closeButton: Locator;
  readonly allowedWeekdaysGroup: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole('dialog', { name: 'New Semester' });
    this.semesterNameInput = this.dialog.getByLabel('Semester Name');
    this.startDateInput = this.dialog.getByLabel('Start Date');
    this.endDateInput = this.dialog.getByLabel('End Date');
    this.createButton = this.dialog.getByRole('button', { name: 'Create Semester' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel' });
    this.closeButton = this.dialog.getByRole('banner').getByRole('button');
    this.allowedWeekdaysGroup = this.dialog.getByRole('group', {
      name: 'Allowed Weekdays',
    });
  }

  async fill(name: string, startDate: string, endDate: string): Promise<void> {
    await this.semesterNameInput.fill(name);
    await this.startDateInput.fill(startDate);
    await this.endDateInput.fill(endDate);
  }

  async submit(): Promise<void> {
    await this.createButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }
}
