import type { Locator, Page, Response } from '@playwright/test';
import { BASE_URL } from './baseUrl';
import { EditProgramModal } from './EditProgramModal';
import { NewProgramModal } from './NewProgramModal';
import { NewSemesterModal } from './NewSemesterModal';

export class ProgramsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly newProgramButton: Locator;
  readonly createProgramButton: Locator;
  readonly emptyStateExact: Locator;
  readonly emptyStateMessage: Locator;
  readonly listLoadError: Locator;
  readonly unauthorizedMessage: Locator;
  readonly successToast: Locator;
  readonly deleteError: Locator;
  readonly table: Locator;
  readonly programColumnHeader: Locator;
  readonly semesterPanelPlaceholder: Locator;
  readonly semesterPanelTitle: Locator;
  readonly noSemestersYet: Locator;
  readonly addSemesterButton: Locator;
  readonly manageCoursesButton: Locator;
  readonly generateCurriculumButton: Locator;
  readonly anyDeleteButton: Locator;
  readonly anyEditButton: Locator;
  readonly programRows: Locator;
  readonly tableOrEmptyState: Locator;
  readonly newProgramModal: NewProgramModal;
  readonly editProgramModal: EditProgramModal;
  readonly newSemesterModal: NewSemesterModal;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Programs', level: 2 });
    this.subtitle = page.getByText('Manage academic programs and semesters');
    this.newProgramButton = page.getByRole('button', { name: '+ New Program' });
    this.createProgramButton = page.getByRole('button', { name: 'Create Program' });
    this.emptyStateExact = page.getByText(
      'No programs yet. Create your first program to get started.',
    );
    this.emptyStateMessage = page.getByText(
      /no programs yet|no programs have been|haven't created any programs|create your first program|get started by creating/i,
    );
    this.listLoadError = page
      .getByRole('alert')
      .or(
        page.getByText(
          /could not be loaded|failed to load|error loading|unable to load|something went wrong/i,
        ),
      );
    this.unauthorizedMessage = page.getByText(
      /unauthorized|access denied|forbidden|permission denied|not authorized/i,
    );
    this.successToast = page.getByText(
      /deleted successfully|program deleted|successfully removed/i,
    );
    this.deleteError = page
      .getByRole('alert')
      .or(
        page.getByText(
          /could not be deleted|failed to delete|unable to delete|something went wrong/i,
        ),
      );
    this.table = page.getByRole('table');
    this.programColumnHeader = page.getByRole('columnheader', { name: 'Program' });
    this.semesterPanelPlaceholder = page.getByText('Select a program to manage semesters');
    this.semesterPanelTitle = page.getByText('Semesters & scheduling config');
    this.noSemestersYet = page.getByText('No semesters yet');
    this.addSemesterButton = page.getByRole('button', { name: '+ Semester' });
    this.manageCoursesButton = page.getByRole('button', { name: 'Manage Courses' });
    this.generateCurriculumButton = page.getByRole('button', {
      name: /Generate Curriculum/i,
    });
    this.anyDeleteButton = page.getByRole('button', { name: /^Delete / });
    this.anyEditButton = page.getByRole('button', { name: /^Edit / });
    this.programRows = this.table.getByRole('row').filter({
      has: page.getByRole('button', { name: /^(Edit|Delete) / }),
    });
    this.tableOrEmptyState = this.table.or(this.emptyStateExact);
    this.newProgramModal = new NewProgramModal(page);
    this.editProgramModal = new EditProgramModal(page);
    this.newSemesterModal = new NewSemesterModal(page);
  }

  async goto(): Promise<void> {
    await this.page.goto(`${BASE_URL}/programs`);
  }

  async openNewProgramForm(): Promise<void> {
    await this.newProgramButton.click();
  }

  async createProgram(name: string, description?: string): Promise<void> {
    await this.openNewProgramForm();
    await this.newProgramModal.fill(name, description);
    await this.newProgramModal.submit();
  }

  programRow(name: string): Locator {
    return this.table.getByRole('row').filter({
      has: this.page.getByRole('button', { name: `Edit ${name}` }),
    });
  }

  programInList(name: string): Locator {
    return this.programRow(name).getByText(name, { exact: true });
  }

  programTextInRow(programName: string, text: string, exact = true): Locator {
    return this.programRow(programName).getByText(text, { exact });
  }

  firstCellInRow(programName: string): Locator {
    return this.programRow(programName).getByRole('cell').first();
  }

  /** Name paragraph inside a program row (avoids CSS selectors in tests). */
  programNameCell(name: string): Locator {
    return this.programRowsWithName(name).getByRole('paragraph').first();
  }

  /** Rows whose visible text includes the name (may be used when Edit aria-label differs). */
  programRowsWithName(name: string): Locator {
    return this.table.getByRole('row').filter({
      has: this.page.getByText(name, { exact: true }),
      hasNot: this.page.getByRole('columnheader'),
    });
  }

  editButton(name: string): Locator {
    return this.programRow(name).getByRole('button', { name: `Edit ${name}` });
  }

  deleteButton(name: string): Locator {
    return this.programRow(name).getByRole('button', { name: `Delete ${name}` });
  }

  async programRowCount(): Promise<number> {
    return this.programRows.count();
  }

  async openEditForm(programName: string): Promise<void> {
    await this.editButton(programName).click();
  }

  /** Select a program row to open the semester management panel. */
  async selectProgram(programName: string): Promise<void> {
    await this.firstCellInRow(programName).click();
  }

  async openNewSemesterForm(): Promise<void> {
    await this.addSemesterButton.click();
  }

  async createSemester(
    name: string,
    startDate: string,
    endDate: string,
  ): Promise<void> {
    await this.openNewSemesterForm();
    await this.newSemesterModal.fill(name, startDate, endDate);
    await this.newSemesterModal.submit();
  }

  semesterInPanel(name: string): Locator {
    return this.page.getByText(name, { exact: true });
  }

  waitForProgramCreate(): Promise<Response> {
    return this.page.waitForResponse(
      (res) =>
        res.url().includes('/api/programs') &&
        res.request().method() === 'POST' &&
        res.ok(),
    );
  }

  waitForSemesterCreate(): Promise<Response> {
    return this.page.waitForResponse(
      (res) =>
        /\/api\/programs\/[^/]+\/semesters/.test(res.url()) &&
        res.request().method() === 'POST' &&
        res.ok(),
    );
  }

  static expectedDeleteConfirmMessage(programName: string): string {
    return `Delete program "${programName}"? All its semesters and courses will be removed. This cannot be undone.`;
  }

  async clickDelete(programName: string): Promise<void> {
    await this.deleteButton(programName).click();
  }

  async doubleClickDelete(programName: string): Promise<void> {
    await this.deleteButton(programName).dblclick();
  }

  async reload(): Promise<void> {
    await this.page.reload();
  }
}
