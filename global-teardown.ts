import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const API_BASE = (process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio').replace(
  /\/$/,
  '',
);
const stampPath = path.join(__dirname, 'playwright/.auth/test-run-start.txt');
/** Allow clock skew / setup work before the first uniqueName() call. */
const RUN_SKEW_MS = 5 * 60 * 1000;

/** Matches tests/helpers/uniqueName.ts: `${base}-${Date.now()}-${random}`. */
const UNIQUE_NAME_RE = /^(.*)-(\d{10,16})-([a-z0-9]{5,12})$/i;

function extractPrograms(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return body as Record<string, unknown>[];
  const record = body as Record<string, unknown> | null;
  if (!record) return [];
  if (Array.isArray(record.data)) return record.data as Record<string, unknown>[];
  const data = record.data as Record<string, unknown> | undefined;
  if (data && Array.isArray(data.programs)) {
    return data.programs as Record<string, unknown>[];
  }
  if (Array.isArray(record.programs)) return record.programs as Record<string, unknown>[];
  return [];
}

async function resolveAuthToken(): Promise<string> {
  const envToken = process.env.DIDAXIS_API_TOKEN?.trim();
  if (envToken) {
    const probe = await fetch(`${API_BASE}/api/programs`, {
      headers: { Authorization: `Bearer ${envToken}` },
    });
    if (probe.ok) return envToken;
  }

  const email = process.env.DIDAXIS_EMAIL ?? '';
  const password = process.env.DIDAXIS_PASSWORD ?? '';
  if (!email || !password) {
    throw new Error(
      'Set DIDAXIS_API_TOKEN or DIDAXIS_EMAIL / DIDAXIS_PASSWORD for run cleanup',
    );
  }

  const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!loginResponse.ok) {
    throw new Error(
      `Run cleanup login failed: ${loginResponse.status} ${await loginResponse.text()}`,
    );
  }
  const body = (await loginResponse.json()) as { data?: { access_token?: string } };
  const token = body?.data?.access_token;
  if (!token) {
    throw new Error('Run cleanup login response missing data.access_token');
  }
  return token;
}

/**
 * Safety net after the full suite: delete uniqueName-pattern programs whose
 * embedded timestamp falls within this run window. Per-test fixture cleanup
 * is primary; this catches IDs that escaped tracking (retries, races).
 */
async function globalTeardown(): Promise<void> {
  if (!fs.existsSync(stampPath)) {
    return;
  }

  const runStart = Number(fs.readFileSync(stampPath, 'utf8'));
  if (!Number.isFinite(runStart) || runStart <= 0) {
    return;
  }

  const minTs = runStart - RUN_SKEW_MS;
  const maxTs = Date.now() + RUN_SKEW_MS;

  let token: string;
  try {
    token = await resolveAuthToken();
  } catch (error) {
    console.warn(`[global-teardown] skip program sweep: ${(error as Error).message}`);
    return;
  }

  const listResponse = await fetch(`${API_BASE}/api/programs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listResponse.ok) {
    console.warn(
      `[global-teardown] list failed: ${listResponse.status} ${await listResponse.text()}`,
    );
    return;
  }

  const programs = extractPrograms(await listResponse.json());
  const toDelete: { id: string; name: string }[] = [];

  for (const program of programs) {
    const id = program.id ?? program.uuid;
    const name = program.name ?? program.title;
    if (typeof id !== 'string' || typeof name !== 'string') continue;

    const match = name.match(UNIQUE_NAME_RE);
    if (!match) continue;
    const embeddedTs = Number(match[2]);
    if (!Number.isFinite(embeddedTs) || embeddedTs < minTs || embeddedTs > maxTs) {
      continue;
    }
    toDelete.push({ id, name });
  }

  if (toDelete.length === 0) {
    return;
  }

  console.log(
    `[global-teardown] sweeping ${toDelete.length} uniqueName program(s) from this run`,
  );

  let failed = 0;
  for (const { id, name } of toDelete) {
    const response = await fetch(`${API_BASE}/api/programs/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok && response.status !== 404) {
      failed += 1;
      console.warn(
        `[global-teardown] failed ${id} (${name}): ${response.status} ${await response.text()}`,
      );
    }
  }

  if (failed > 0) {
    throw new Error(`global-teardown left ${failed} program(s) undeleted`);
  }
}

export default globalTeardown;
