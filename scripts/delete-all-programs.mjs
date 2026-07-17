#!/usr/bin/env node
/**
 * Bulk-delete Didaxis programs via REST API.
 * Default: dry run (list only). Pass --confirm to delete.
 *
 * Env (.env): DIDAXIS_URL, DIDAXIS_API_TOKEN, or DIDAXIS_EMAIL / DIDAXIS_PASSWORD
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_BASE = (process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio').replace(
  /\/$/,
  '',
);
const CONFIRM = process.argv.includes('--confirm');

function programId(program) {
  return program?.id ?? program?.uuid ?? null;
}

function programName(program) {
  return program?.name ?? program?.title ?? '(unnamed)';
}

function extractPrograms(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.data?.programs)) return body.data.programs;
  if (Array.isArray(body?.programs)) return body.programs;
  return [];
}

async function loginForToken() {
  const email = process.env.DIDAXIS_EMAIL ?? '';
  const password = process.env.DIDAXIS_PASSWORD ?? '';
  if (!email || !password) {
    throw new Error(
      'Set DIDAXIS_API_TOKEN or DIDAXIS_EMAIL / DIDAXIS_PASSWORD in .env',
    );
  }

  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(
      `Login failed: ${response.status} ${await response.text()}`,
    );
  }

  const body = await response.json();
  const token = body?.data?.access_token;
  if (!token) {
    throw new Error('Login response missing data.access_token');
  }
  return token;
}

async function isTokenValid(token) {
  const response = await fetch(`${API_BASE}/api/programs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.ok;
}

async function resolveAuthToken() {
  const envToken = process.env.DIDAXIS_API_TOKEN?.trim();
  if (envToken && (await isTokenValid(envToken))) {
    return envToken;
  }
  return loginForToken();
}

async function listPrograms(token) {
  const response = await fetch(`${API_BASE}/api/programs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(
      `GET /api/programs failed: ${response.status} ${await response.text()}`,
    );
  }
  return extractPrograms(await response.json());
}

async function deleteProgram(token, uuid) {
  const response = await fetch(`${API_BASE}/api/programs/${uuid}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok && response.status !== 404) {
    return { ok: false, status: response.status, body: await response.text() };
  }
  return { ok: true, status: response.status };
}

async function main() {
  console.log(`Didaxis: ${API_BASE}`);
  console.log(`Mode: ${CONFIRM ? 'DELETE (--confirm)' : 'DRY RUN (no deletions)'}`);

  let token;
  try {
    token = await resolveAuthToken();
  } catch (err) {
    console.error(`Auth failed: ${err.message}`);
    console.error('Fix credentials in .env and retry.');
    process.exit(1);
  }

  const programs = await listPrograms(token);
  const entries = programs
    .map((p) => ({ id: programId(p), name: programName(p) }))
    .filter((p) => p.id);

  console.log(`\nFound ${entries.length} program(s):`);
  if (entries.length === 0) {
    console.log('(none)');
    return;
  }

  for (const { id, name } of entries) {
    console.log(`  - ${id}  ${name}`);
  }

  if (!CONFIRM) {
    console.log(
      '\nDry run complete. Re-run with --confirm to delete all listed programs.',
    );
    return;
  }

  let deleted = 0;
  let failed = 0;
  console.log('\nDeleting...');
  for (const { id, name } of entries) {
    const result = await deleteProgram(token, id);
    if (result.ok) {
      deleted += 1;
      console.log(`  deleted ${id} (${name})`);
    } else {
      failed += 1;
      console.error(`  FAILED ${id} (${name}): ${result.status} ${result.body}`);
    }
  }

  console.log(`\nDone. deleted=${deleted} failed=${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
