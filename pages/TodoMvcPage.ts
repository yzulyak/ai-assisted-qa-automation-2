import type { Locator, Page } from '@playwright/test';

const TODO_URL = 'https://demo.playwright.dev/todomvc/#/';

export class TodoMvcPage {
  readonly page: Page;
  readonly newTodoInput: Locator;
  readonly todoItems: Locator;
  readonly footer: Locator;
  readonly todoCount: Locator;
  readonly filterAllLink: Locator;
  readonly filterActiveLink: Locator;
  readonly filterCompletedLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newTodoInput = page.getByPlaceholder('What needs to be done?');
    this.todoItems = page.getByTestId('todo-item');
    this.footer = page.getByTestId('footer').or(page.getByText(/\d+ items? left/));
    this.todoCount = page.getByTestId('todo-count');
    this.filterAllLink = page.getByRole('link', { name: 'All', exact: true });
    this.filterActiveLink = page.getByRole('link', { name: 'Active' });
    this.filterCompletedLink = page.getByRole('link', { name: 'Completed' });
  }

  async goto(): Promise<void> {
    await this.page.goto(TODO_URL);
  }

  todoItem(label: string): Locator {
    return this.todoItems.filter({ hasText: label });
  }

  todoLabel(label: string): Locator {
    return this.todoItem(label).getByTestId('todo-title').or(this.todoItem(label).getByText(label));
  }

  todoCheckbox(label: string): Locator {
    return this.todoItem(label).getByRole('checkbox');
  }

  todoDestroyButton(label: string): Locator {
    return this.todoItem(label).getByRole('button', { name: /delete|destroy/i }).or(
      this.todoItem(label).locator('.destroy'),
    );
  }

  async addTodo(text: string): Promise<void> {
    await this.newTodoInput.fill(text);
    await this.newTodoInput.press('Enter');
  }

  async toggleTodo(label: string): Promise<void> {
    await this.todoCheckbox(label).click();
  }

  async deleteTodo(label: string): Promise<void> {
    const item = this.todoItem(label);
    await item.hover();
    await this.todoDestroyButton(label).click();
  }
}
