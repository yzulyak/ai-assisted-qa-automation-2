import type { ProgramsPage } from '../../pages/ProgramsPage';

const SINGLE_CHAR_CANDIDATES =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Single-character program names collide easily on a shared Didaxis env
 * (only 26 letters). Pick one that is not already in the list.
 */
export async function unusedSingleCharName(programs: ProgramsPage): Promise<string> {
  for (const name of SINGLE_CHAR_CANDIDATES) {
    if ((await programs.programRowsWithName(name).count()) === 0) {
      return name;
    }
  }

  throw new Error(
    'No unused single-character program name available in the Programs list',
  );
}
