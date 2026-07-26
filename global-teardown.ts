import { spawnSync } from 'child_process';
import path from 'path';

/**
 * Safety net after the full suite. Spawn the Node ESM sweep script directly so
 * Playwright's TS loader does not choke on `import.meta` / ESM interop.
 */
async function globalTeardown(): Promise<void> {
  const script = path.join(__dirname, 'scripts', 'sweep-run-programs.mjs');
  const result = spawnSync(process.execPath, [script], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(
      `global-teardown sweep failed with exit code ${result.status ?? 'null'}`,
    );
  }
}

export default globalTeardown;
