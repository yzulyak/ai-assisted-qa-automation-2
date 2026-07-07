import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';
const ADMIN_EMAIL = process.env.DIDAXIS_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.DIDAXIS_PASSWORD ?? '';
const evidenceDir = path.resolve(__dirname, '../test-evidence/DS-5');

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Set DIDAXIS_EMAIL and DIDAXIS_PASSWORD in .env');
  }

  fs.mkdirSync(evidenceDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('button', { name: 'Sign out' }).waitFor({ state: 'visible', timeout: 15000 });

  await page.goto(`${BASE_URL}/programs`);
  await page.getByRole('button', { name: '+ New Program' }).waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('table tbody').waitFor({ state: 'visible', timeout: 15000 });

  await page.screenshot({ path: path.join(evidenceDir, 'programs-page.png'), fullPage: true });

  const rowCount = await page.locator('table tbody tr').count();
  const headings = await page.getByRole('heading').allTextContents();
  const tableHeaders = await page.locator('table thead th').allTextContents();
  const subtitle = await page.getByText('Manage academic programs and semesters').isVisible().catch(() => false);
  const columnHeaderProgram = await page.getByRole('columnheader', { name: 'Program' }).isVisible().catch(() => false);
  const helperText = await page.getByText('Select a program to manage semesters').isVisible().catch(() => false);
  const emptyStateVisible = await page
    .getByText(/no programs yet|no programs have been|haven't created any programs|create your first program|get started by creating/i)
    .isVisible()
    .catch(() => false);

  let firstRow = null;
  let firstRowCells = [];
  if (rowCount > 0) {
    firstRow = await page.locator('table tbody tr').first().innerText();
    firstRowCells = await page.locator('table tbody tr').first().locator('td').allTextContents();
  }

  const uniqueName = `DS5-Explore-${Date.now()}`;
  await page.getByRole('button', { name: '+ New Program' }).click();
  await page.getByRole('dialog', { name: 'New Program' }).waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(evidenceDir, 'new-program-modal.png'), fullPage: true });

  const dialog = page.getByRole('dialog', { name: 'New Program' });
  await dialog.getByLabel('Program Name').fill(uniqueName);
  await dialog.getByLabel('Description').fill('Exploration program for DS-5 list display');
  await dialog.getByRole('button', { name: 'Create' }).click();
  await dialog.waitFor({ state: 'hidden', timeout: 15000 });

  const createdRow = page.locator('table tbody tr').filter({
    has: page.getByText(uniqueName, { exact: true }),
  });
  await createdRow.waitFor({ state: 'visible', timeout: 15000 });
  await page.screenshot({ path: path.join(evidenceDir, 'program-created-in-list.png'), fullPage: true });

  const createdRowText = await createdRow.innerText();
  const editButtonVisible = await createdRow.getByRole('button', { name: new RegExp(`^Edit ${uniqueName}`) }).isVisible().catch(() => false);
  const deleteButtonVisible = await createdRow.getByRole('button', { name: new RegExp(`^Delete ${uniqueName}`) }).isVisible().catch(() => false);

  const emptyDescriptionName = `DS5-EmptyDesc-${Date.now()}`;
  await page.getByRole('button', { name: '+ New Program' }).click();
  await dialog.waitFor({ state: 'visible' });
  await dialog.getByLabel('Program Name').fill(emptyDescriptionName);
  await dialog.getByLabel('Description').fill('');
  await dialog.getByRole('button', { name: 'Create' }).click();
  await dialog.waitFor({ state: 'hidden', timeout: 15000 });

  const emptyDescRow = page.locator('table tbody tr').filter({
    has: page.getByText(emptyDescriptionName, { exact: true }),
  });
  await emptyDescRow.waitFor({ state: 'visible', timeout: 15000 });
  const emptyDescRowText = await emptyDescRow.innerText();
  await page.screenshot({ path: path.join(evidenceDir, 'empty-description-row.png'), fullPage: true });

  const findings = {
    locators: {
      newProgramButton: "+ New Program (role=button)",
      programsHeading: "Programs (role=heading, level=2)",
      programsSubtitle: "Manage academic programs and semesters",
      programTable: "table tbody",
      columnHeaderProgram: "Program (role=columnheader)",
      helperText: "Select a program to manage semesters",
      dialog: "role=dialog, name='New Program'",
      programNameField: "dialog.getByLabel('Program Name')",
      descriptionField: "dialog.getByLabel('Description')",
      createButton: "dialog.getByRole('button', { name: 'Create' })",
      programRow: "table tbody tr filtered by program name",
    },
    pageStructure: {
      headings,
      tableHeaders,
      subtitle,
      columnHeaderProgram,
      helperText,
      rowCountAfterLoad: rowCount,
      firstRow,
      firstRowCells,
      emptyStateVisible,
    },
    behaviors: {
      programCreationWorks: true,
      createdRowShowsNameAndDescription: createdRowText.includes(uniqueName) && createdRowText.includes('Exploration program for DS-5 list display'),
      editDeleteActionsVisible: editButtonVisible && deleteButtonVisible,
      emptyDescriptionRowText: emptyDescRowText,
      emptyDescriptionShowsPlaceholder: /^$|^—$|^-+$|No description/i.test(
        emptyDescRowText.replace(emptyDescriptionName, '').trim(),
      ),
    },
    screenshots: [
      path.join(evidenceDir, 'programs-page.png'),
      path.join(evidenceDir, 'new-program-modal.png'),
      path.join(evidenceDir, 'program-created-in-list.png'),
      path.join(evidenceDir, 'empty-description-row.png'),
    ],
  };

  fs.writeFileSync(path.join(evidenceDir, 'exploration-findings.json'), JSON.stringify(findings, null, 2));
  console.log(JSON.stringify(findings, null, 2));

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
