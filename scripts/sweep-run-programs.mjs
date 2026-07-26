#!/usr/bin/env node
/**
 * Safety-net sweep for timestamped test programs created during the current
 * Playwright run (reads playwright/.auth/test-run-start.txt).
 * Used by global teardown and as a CI `if: always()` step.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_BASE = (process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio').replace(
  /\/$/,
  '',
);
const stampPath = path.join(__dirname, '../playwright/.auth/test-run-start.txt');
const RUN_SKEW_MS = 5 * 60 * 1000;
/**
 * Prefer hyphenated suffixes from uniqueName / Date.now() helpers.
 * Also accept a bare 10–16 digit timestamp anywhere (max-length names).
 */
const EMBEDDED_TS_RE = /^(.*)-(\d{10,16})(?:-([a-z0-9]{5,12}))?$/i;
const BARE_TS_RE = /(\d{10,16})/;

function embeddedTimestamp(name) {
  const hyphenated = name.match(EMBEDDED_TS_RE);
  if (hyphenated) return Number(hyphenated[2]);
  const bare = name.match(BARE_TS_RE);
  return bare ? Number(bare[1]) : NaN;
}

function extractPrograms(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.data?.programs)) return body.data.programs;
  if (Array.isArray(body?.programs)) return body.programs;
  return [];
}

async function resolveAuthToken() {
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
  const body = await loginResponse.json();
  const token = body?.data?.access_token;
  if (!token) {
    throw new Error('Run cleanup login response missing data.access_token');
  }
  return token;
}

export async function sweepRunPrograms() {
  if (!fs.existsSync(stampPath)) {
    console.log('[sweep-run-programs] no run stamp; skip');
    return { deleted: 0, failed: 0, skipped: true };
  }

  const runStart = Number(fs.readFileSync(stampPath, 'utf8'));
  if (!Number.isFinite(runStart) || runStart <= 0) {
    console.log('[sweep-run-programs] invalid run stamp; skip');
    return { deleted: 0, failed: 0, skipped: true };
  }

  const minTs = runStart - RUN_SKEW_MS;
  const maxTs = Date.now() + RUN_SKEW_MS;

  let token;
  try {
    token = await resolveAuthToken();
  } catch (error) {
    console.warn(`[sweep-run-programs] skip: ${error.message}`);
    return { deleted: 0, failed: 0, skipped: true };
  }

  const listResponse = await fetch(`${API_BASE}/api/programs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listResponse.ok) {
    console.warn(
      `[sweep-run-programs] list failed: ${listResponse.status} ${await listResponse.text()}`,
    );
    return { deleted: 0, failed: 0, skipped: true };
  }

  const programs = extractPrograms(await listResponse.json());
  const toDelete = [];

  for (const program of programs) {
    const id = program.id ?? program.uuid;
    const name = program.name ?? program.title;
    if (typeof id !== 'string' || typeof name !== 'string') continue;

    const embeddedTs = embeddedTimestamp(name);
    if (!Number.isFinite(embeddedTs) || embeddedTs < minTs || embeddedTs > maxTs) {
      continue;
    }
    toDelete.push({ id, name });
  }

  console.log(
    `[sweep-run-programs] window ${new Date(minTs).toISOString()}..${new Date(maxTs).toISOString()}; ` +
      `candidates=${toDelete.length} of ${programs.length} listed`,
  );

  let deleted = 0;
  let failed = 0;
  for (const { id, name } of toDelete) {
    const response = await fetch(`${API_BASE}/api/programs/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok && response.status !== 404) {
      failed += 1;
      console.warn(
        `[sweep-run-programs] failed ${id} (${name}): ${response.status} ${await response.text()}`,
      );
    } else {
      deleted += 1;
      console.log(`[sweep-run-programs] deleted ${id} (${name})`);
    }
  }

  console.log(`[sweep-run-programs] done. deleted=${deleted} failed=${failed}`);
  if (failed > 0) {
    throw new Error(`sweep-run-programs left ${failed} program(s) undeleted`);
  }
  return { deleted, failed, skipped: false };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  sweepRunPrograms().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
