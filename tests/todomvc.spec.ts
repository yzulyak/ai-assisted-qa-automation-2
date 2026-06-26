import { test, expect, type Page, type Locator } from '@playwright/test';

const TODO_URL = 'https://demo.playwright.dev/todomvc/#/';

function newTodoInput(page: Page): Locator {
  return page.getByPlaceholder('What needs to be done?');
}

function todoListItems(page: Page): Locator {
  return page.locator('.todo-list li');
}

function todoItemByLabel(page: Page, label: string): Locator {
  return todoListItems(page).filter({
    has: page.locator('label', { hasText: label }),
  });
}

function footer(page: Page): Locator {
  return page.locator('.footer');
}

async function addTodo(page: Page, text: string): Promise<void> {
  const input = newTodoInput(page);
  await input.fill(text);
  await input.press('Enter');
}

async function toggleTodo(page: Page, label: string): Promise<void> {
  await todoItemByLabel(page, label).locator('.toggle').click();
}

async function deleteTodo(page: Page, label: string): Promise<void> {
  const item = todoItemByLabel(page, label);
  await item.hover();
  await item.locator('.destroy').click();
}

async function expectItemsLeft(page: Page, count: number): Promise<void> {
  const text = count === 1 ? '1 item left' : `${count} items left`;
  await expect(page.locator('.todo-count')).toHaveText(text);
}

test.beforeEach(async ({ page }) => {
  await page.goto(TODO_URL);
});

test.describe('Positive flows', () => {
  test('TC-001: New todo appears in the list after creation', async ({ page }) => {
    await addTodo(page, 'Buy groceries');

    const item = todoItemByLabel(page, 'Buy groceries');
    await expect(item).toBeVisible();
    await expect(item).not.toHaveClass(/completed/);
    await expect(item.locator('.toggle')).not.toBeChecked();
    await expectItemsLeft(page, 1);
  });

  test('TC-002: Todo is marked as completed when its checkbox is toggled', async ({ page }) => {
    await addTodo(page, 'Walk the dog');
    await toggleTodo(page, 'Walk the dog');

    const item = todoItemByLabel(page, 'Walk the dog');
    await expect(item).toHaveClass(/completed/);
    await expect(item.locator('.toggle')).toBeChecked();
    await expect(item.locator('label')).toHaveCSS('text-decoration-line', 'line-through');
    await expectItemsLeft(page, 0);
  });

  test('TC-003: Todo is removed from the list when deleted', async ({ page }) => {
    await addTodo(page, 'Call dentist');
    await deleteTodo(page, 'Call dentist');

    await expect(todoItemByLabel(page, 'Call dentist')).toHaveCount(0);
    await expect(todoListItems(page)).toHaveCount(0);
    await expect(footer(page)).not.toBeVisible();
  });

  test('TC-004: Multiple todos can be created independently in one session', async ({ page }) => {
    await addTodo(page, 'Read email');
    await addTodo(page, 'Prepare slides');

    await expect(todoItemByLabel(page, 'Read email')).toBeVisible();
    await expect(todoItemByLabel(page, 'Prepare slides')).toBeVisible();
    await expectItemsLeft(page, 2);
  });

  test('TC-005: Completed todo can be toggled back to active', async ({ page }) => {
    await addTodo(page, 'Water plants');
    await toggleTodo(page, 'Water plants');
    await expect(todoItemByLabel(page, 'Water plants')).toHaveClass(/completed/);

    await toggleTodo(page, 'Water plants');

    const item = todoItemByLabel(page, 'Water plants');
    await expect(item).not.toHaveClass(/completed/);
    await expect(item.locator('.toggle')).not.toBeChecked();
    await expectItemsLeft(page, 1);
  });
});

test.describe('Negative flows', () => {
  test('TC-006: Empty todo is not added to the list', async ({ page }) => {
    await newTodoInput(page).focus();
    await newTodoInput(page).press('Enter');

    await expect(todoListItems(page)).toHaveCount(0);
    await expect(footer(page)).not.toBeVisible();
  });

  test('TC-007: Whitespace-only todo is not added to the list', async ({ page }) => {
    await addTodo(page, '   ');

    await expect(todoListItems(page)).toHaveCount(0);
    await expect(footer(page)).not.toBeVisible();
  });

  test('TC-008: Deleting one todo does not remove other todos', async ({ page }) => {
    await addTodo(page, 'Todo A');
    await addTodo(page, 'Todo B');
    await deleteTodo(page, 'Todo A');

    await expect(todoItemByLabel(page, 'Todo A')).toHaveCount(0);
    await expect(todoItemByLabel(page, 'Todo B')).toBeVisible();
    await expectItemsLeft(page, 1);
  });

  test('TC-009: Completing one todo does not mark other todos as completed', async ({ page }) => {
    await addTodo(page, 'Pay rent');
    await addTodo(page, 'Buy milk');
    await toggleTodo(page, 'Pay rent');

    await expect(todoItemByLabel(page, 'Pay rent')).toHaveClass(/completed/);
    await expect(todoItemByLabel(page, 'Buy milk')).not.toHaveClass(/completed/);
    await expectItemsLeft(page, 1);
  });

  test('TC-010: Deleted todo cannot be interacted with', async ({ page }) => {
    await addTodo(page, 'Temporary task');
    await deleteTodo(page, 'Temporary task');

    await expect(todoItemByLabel(page, 'Temporary task')).toHaveCount(0);
    await expect(page.locator('.toggle').filter({ hasText: 'Temporary task' })).toHaveCount(0);
    await expect(page.locator('.destroy').filter({ hasText: 'Temporary task' })).toHaveCount(0);
  });
});

test.describe('Edge cases', () => {
  test('TC-011: Todo text with special characters is stored and displayed literally', async ({ page }) => {
    const text = 'Review PR #42 @team & fix "bug" <test>';
    await addTodo(page, text);

    const label = todoListItems(page).first().locator('label');
    await expect(label).toHaveText(text);
    await expect(label.locator('script')).toHaveCount(0);
  });

  test('TC-012: Duplicate todo titles are both retained in the list', async ({ page }) => {
    await addTodo(page, 'Buy milk');
    await addTodo(page, 'Buy milk');

    await expect(todoItemByLabel(page, 'Buy milk')).toHaveCount(2);
    await expectItemsLeft(page, 2);
  });

  test('TC-013: Very long todo text is accepted and displayed', async ({ page }) => {
    const longText = `Long todo:${'x'.repeat(500 - 'Long todo:'.length)}`;
    await addTodo(page, longText);

    const label = todoItemByLabel(page, longText).locator('label');
    await expect(label).toBeVisible();
    await expect(label).toHaveText(longText);
    expect((await label.textContent())?.length).toBeGreaterThanOrEqual(500);
  });

  test('TC-014: Todo with leading and trailing spaces is normalized on save', async ({ page }) => {
    await addTodo(page, '  Schedule meeting  ');

    await expect(todoListItems(page)).toHaveCount(1);
    await expect(todoListItems(page).first().locator('label')).toHaveText('Schedule meeting');
  });

  test('TC-015: Unicode and emoji characters are preserved in todo text', async ({ page }) => {
    const text = 'Café résumé 🚀 日本語';
    await addTodo(page, text);

    await expect(todoItemByLabel(page, text)).toBeVisible();
  });

  test('TC-016: Deleting the last todo hides the footer and filters', async ({ page }) => {
    await addTodo(page, 'Only item');
    await expect(footer(page)).toBeVisible();

    await deleteTodo(page, 'Only item');

    await expect(todoListItems(page)).toHaveCount(0);
    await expect(footer(page)).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'All' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Active' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Completed' })).not.toBeVisible();
  });

  test('TC-017: New todo input is cleared after successful creation', async ({ page }) => {
    await addTodo(page, 'First task');
    await expect(newTodoInput(page)).toHaveValue('');

    await addTodo(page, 'Second task');
    await expect(todoItemByLabel(page, 'First task')).toBeVisible();
    await expect(todoItemByLabel(page, 'Second task')).toBeVisible();
  });
});
