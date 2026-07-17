import { test, expect } from '@playwright/test';
import { TodoMvcPage } from '../pages/TodoMvcPage';

test.beforeEach(async ({ page }) => {
  const todoPage = new TodoMvcPage(page);
  await todoPage.goto();
});

test.describe('Positive flows', () => {
  test('TC-001: New todo appears in the list after creation', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('Buy groceries');

    const item = todoPage.todoItem('Buy groceries');
    await expect(item).toBeVisible();
    await expect(item).not.toHaveClass(/completed/);
    await expect(todoPage.todoCheckbox('Buy groceries')).not.toBeChecked();
    await expect(todoPage.todoCount).toHaveText('1 item left');
  });

  test('TC-002: Todo is marked as completed when its checkbox is toggled', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('Walk the dog');
    await todoPage.toggleTodo('Walk the dog');

    const item = todoPage.todoItem('Walk the dog');
    await expect(item).toHaveClass(/completed/);
    await expect(todoPage.todoCheckbox('Walk the dog')).toBeChecked();
    await expect(todoPage.todoLabel('Walk the dog')).toHaveCSS(
      'text-decoration-line',
      'line-through',
    );
    await expect(todoPage.todoCount).toHaveText('0 items left');
  });

  test('TC-003: Todo is removed from the list when deleted', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('Call dentist');
    await todoPage.deleteTodo('Call dentist');

    await expect(todoPage.todoItem('Call dentist')).toHaveCount(0);
    await expect(todoPage.todoItems).toHaveCount(0);
    await expect(todoPage.footer).not.toBeVisible();
  });

  test('TC-004: Multiple todos can be created independently in one session', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('Read email');
    await todoPage.addTodo('Prepare slides');

    await expect(todoPage.todoItem('Read email')).toBeVisible();
    await expect(todoPage.todoItem('Prepare slides')).toBeVisible();
    await expect(todoPage.todoCount).toHaveText('2 items left');
  });

  test('TC-005: Completed todo can be toggled back to active', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('Water plants');
    await todoPage.toggleTodo('Water plants');
    await expect(todoPage.todoItem('Water plants')).toHaveClass(/completed/);

    await todoPage.toggleTodo('Water plants');

    const item = todoPage.todoItem('Water plants');
    await expect(item).not.toHaveClass(/completed/);
    await expect(todoPage.todoCheckbox('Water plants')).not.toBeChecked();
    await expect(todoPage.todoCount).toHaveText('1 item left');
  });
});

test.describe('Negative flows', () => {
  test('TC-006: Empty todo is not added to the list', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.newTodoInput.focus();
    await todoPage.newTodoInput.press('Enter');

    await expect(todoPage.todoItems).toHaveCount(0);
    await expect(todoPage.footer).not.toBeVisible();
  });

  test('TC-007: Whitespace-only todo is not added to the list', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('   ');

    await expect(todoPage.todoItems).toHaveCount(0);
    await expect(todoPage.footer).not.toBeVisible();
  });

  test('TC-008: Deleting one todo does not remove other todos', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('Todo A');
    await todoPage.addTodo('Todo B');
    await todoPage.deleteTodo('Todo A');

    await expect(todoPage.todoItem('Todo A')).toHaveCount(0);
    await expect(todoPage.todoItem('Todo B')).toBeVisible();
    await expect(todoPage.todoCount).toHaveText('1 item left');
  });

  test('TC-009: Completing one todo does not mark other todos as completed', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('Pay rent');
    await todoPage.addTodo('Buy milk');
    await todoPage.toggleTodo('Pay rent');

    await expect(todoPage.todoItem('Pay rent')).toHaveClass(/completed/);
    await expect(todoPage.todoItem('Buy milk')).not.toHaveClass(/completed/);
    await expect(todoPage.todoCount).toHaveText('1 item left');
  });

  test('TC-010: Deleted todo cannot be interacted with', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('Temporary task');
    await todoPage.deleteTodo('Temporary task');

    await expect(todoPage.todoItem('Temporary task')).toHaveCount(0);
    await expect(todoPage.todoCheckbox('Temporary task')).toHaveCount(0);
    await expect(todoPage.todoDestroyButton('Temporary task')).toHaveCount(0);
  });
});

test.describe('Edge cases', () => {
  test('TC-011: Todo text with special characters is stored and displayed literally', async ({
    page,
  }) => {
    const todoPage = new TodoMvcPage(page);
    const text = 'Review PR #42 @team & fix "bug" <test>';
    await todoPage.addTodo(text);

    const label = todoPage.todoLabel(text);
    await expect(label).toHaveText(text);
  });

  test('TC-012: Duplicate todo titles are both retained in the list', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('Buy milk');
    await todoPage.addTodo('Buy milk');

    await expect(todoPage.todoItem('Buy milk')).toHaveCount(2);
    await expect(todoPage.todoCount).toHaveText('2 items left');
  });

  test('TC-013: Very long todo text is accepted and displayed', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    const longText = `Long todo:${'x'.repeat(500 - 'Long todo:'.length)}`;
    await todoPage.addTodo(longText);

    const label = todoPage.todoLabel(longText);
    await expect(label).toBeVisible();
    await expect(label).toHaveText(longText);
    expect((await label.textContent())?.length).toBeGreaterThanOrEqual(500);
  });

  test('TC-014: Todo with leading and trailing spaces is normalized on save', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('  Schedule meeting  ');

    await expect(todoPage.todoItems).toHaveCount(1);
    await expect(todoPage.todoLabel('Schedule meeting')).toHaveText('Schedule meeting');
  });

  test('TC-015: Unicode and emoji characters are preserved in todo text', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    const text = 'Café résumé 🚀 日本語';
    await todoPage.addTodo(text);

    await expect(todoPage.todoItem(text)).toBeVisible();
  });

  test('TC-016: Deleting the last todo hides the footer and filters', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('Only item');
    await expect(todoPage.footer).toBeVisible();

    await todoPage.deleteTodo('Only item');

    await expect(todoPage.todoItems).toHaveCount(0);
    await expect(todoPage.footer).not.toBeVisible();
    await expect(todoPage.filterAllLink).not.toBeVisible();
    await expect(todoPage.filterActiveLink).not.toBeVisible();
    await expect(todoPage.filterCompletedLink).not.toBeVisible();
  });

  test('TC-017: New todo input is cleared after successful creation', async ({ page }) => {
    const todoPage = new TodoMvcPage(page);
    await todoPage.addTodo('First task');
    await expect(todoPage.newTodoInput).toHaveValue('');

    await todoPage.addTodo('Second task');
    await expect(todoPage.todoItem('First task')).toBeVisible();
    await expect(todoPage.todoItem('Second task')).toBeVisible();
  });
});
