import fs from 'fs';
import path from 'path';

const stampPath = path.join(__dirname, 'playwright/.auth/test-run-start.txt');

/**
 * Record when this Playwright run started so global teardown can sweep only
 * uniqueName-pattern programs created during (or slightly before) this run.
 */
async function globalSetup(): Promise<void> {
  fs.mkdirSync(path.dirname(stampPath), { recursive: true });
  fs.writeFileSync(stampPath, String(Date.now()), 'utf8');
}

export default globalSetup;
