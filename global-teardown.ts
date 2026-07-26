import { sweepRunPrograms } from './scripts/sweep-run-programs.mjs';

/**
 * Safety net after the full suite: delete timestamped programs whose
 * embedded timestamp falls within this run window. Per-test fixture cleanup
 * is primary; this catches IDs that escaped tracking (retries, races).
 */
async function globalTeardown(): Promise<void> {
  await sweepRunPrograms();
}

export default globalTeardown;
