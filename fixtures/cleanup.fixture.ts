import { test as base, expect, type APIRequestContext, type Request } from '@playwright/test';

const API_BASE = (process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio').replace(
  /\/$/,
  '',
);

/** Delay so late duplicate/double-click POSTs are captured before teardown deletes. */
const CREATE_SETTLE_MS = 750;
const DELETE_ATTEMPTS = 3;

export type TrackProgram = ((uuid: string, name?: string) => void) & {
  /** Register a name so teardown can sweep matching rows if a UUID was missed. */
  trackName: (name: string) => void;
};

/** Extract program UUID from create/list API payloads. */
export function extractProgramId(body: unknown): string {
  const record = body as Record<string, unknown> | null;
  const data = record?.data as Record<string, unknown> | string | undefined;
  const fromData =
    data && typeof data === 'object'
      ? (data.id ?? data.uuid)
      : typeof data === 'string'
        ? data
        : undefined;
  const id = fromData ?? record?.id ?? record?.uuid;
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error(`Program response missing id: ${JSON.stringify(body)}`);
  }
  return id;
}

function extractProgramName(body: unknown): string | undefined {
  const record = body as Record<string, unknown> | null;
  if (!record) return undefined;
  const data = record.data;
  if (data && typeof data === 'object') {
    const nested = data as Record<string, unknown>;
    const nestedName = nested.name ?? nested.title;
    if (typeof nestedName === 'string' && nestedName.trim()) return nestedName;
  }
  const name = record.name ?? record.title;
  return typeof name === 'string' && name.trim() ? name : undefined;
}

function nameFromPostData(request: Request): string | undefined {
  try {
    const payload = request.postDataJSON() as Record<string, unknown> | null;
    const name = payload?.name ?? payload?.title;
    return typeof name === 'string' && name.trim() ? name : undefined;
  } catch {
    return undefined;
  }
}

function isProgramCreateResponse(url: string, method: string): boolean {
  if (method !== 'POST') return false;
  try {
    const pathname = new URL(url).pathname.replace(/\/$/, '');
    return pathname.endsWith('/api/programs');
  } catch {
    return url.includes('/api/programs') && !url.includes('/api/programs/');
  }
}

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

function programIdFromListItem(program: Record<string, unknown>): string | undefined {
  const id = program.id ?? program.uuid;
  return typeof id === 'string' && id.trim() ? id : undefined;
}

function programNameFromListItem(program: Record<string, unknown>): string | undefined {
  const name = program.name ?? program.title;
  return typeof name === 'string' ? name : undefined;
}

function namesMatch(tracked: string, actual: string): boolean {
  if (tracked === actual) return true;
  if (tracked.trim() === actual.trim()) return true;
  if (tracked.trim().toLowerCase() === actual.trim().toLowerCase()) return true;
  return false;
}

async function loginForToken(request: APIRequestContext): Promise<string> {
  const email = process.env.DIDAXIS_EMAIL ?? '';
  const password = process.env.DIDAXIS_PASSWORD ?? '';
  if (!email || !password) {
    throw new Error(
      'Set DIDAXIS_API_TOKEN or DIDAXIS_EMAIL / DIDAXIS_PASSWORD for program cleanup',
    );
  }

  const loginResponse = await request.post(`${API_BASE}/api/auth/login`, {
    data: { email, password },
  });
  if (!loginResponse.ok()) {
    throw new Error(
      `Cleanup login failed: ${loginResponse.status()} ${await loginResponse.text()}`,
    );
  }

  const body = await loginResponse.json();
  const token = body?.data?.access_token;
  if (!token) {
    throw new Error('Cleanup login response missing data.access_token');
  }
  return token;
}

async function isTokenValid(
  request: APIRequestContext,
  token: string,
): Promise<boolean> {
  const response = await request.get(`${API_BASE}/api/programs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.ok();
}

/** Prefer DIDAXIS_API_TOKEN when valid; otherwise login with email/password. */
async function resolveAuthToken(request: APIRequestContext): Promise<string> {
  const envToken = process.env.DIDAXIS_API_TOKEN?.trim();
  if (envToken && (await isTokenValid(request, envToken))) {
    return envToken;
  }
  return loginForToken(request);
}

async function deleteProgramWithRetry(
  request: APIRequestContext,
  token: string,
  uuid: string,
): Promise<string | null> {
  let lastError: string | null = null;
  for (let attempt = 1; attempt <= DELETE_ATTEMPTS; attempt++) {
    const response = await request.delete(`${API_BASE}/api/programs/${uuid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok() || response.status() === 404) {
      return null;
    }
    lastError = `${uuid}: ${response.status()} ${await response.text()}`;
    if (response.status() < 500 || attempt === DELETE_ATTEMPTS) {
      break;
    }
  }
  return lastError;
}

async function listPrograms(
  request: APIRequestContext,
  token: string,
): Promise<Record<string, unknown>[]> {
  const response = await request.get(`${API_BASE}/api/programs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok()) {
    throw new Error(
      `Cleanup list failed: ${response.status()} ${await response.text()}`,
    );
  }
  return extractPrograms(await response.json());
}

/**
 * Delete tracked UUIDs, then sweep the programs list for any rows whose name
 * was registered during the test (covers missed duplicate/double-click IDs).
 */
async function deleteTrackedPrograms(
  request: APIRequestContext,
  trackedIds: string[],
  trackedNames: string[],
): Promise<void> {
  if (trackedIds.length === 0 && trackedNames.length === 0) {
    return;
  }

  const token = await resolveAuthToken(request);
  const failures: string[] = [];
  const deleted = new Set<string>();

  for (const uuid of trackedIds) {
    const error = await deleteProgramWithRetry(request, token, uuid);
    if (error) {
      failures.push(error);
    } else {
      deleted.add(uuid);
    }
  }

  if (trackedNames.length > 0) {
    const programs = await listPrograms(request, token);
    for (const program of programs) {
      const id = programIdFromListItem(program);
      const name = programNameFromListItem(program);
      if (!id || deleted.has(id) || !name) continue;
      if (!trackedNames.some((tracked) => namesMatch(tracked, name))) continue;

      const error = await deleteProgramWithRetry(request, token, id);
      if (error) {
        failures.push(error);
      } else {
        deleted.add(id);
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(`Program cleanup failed:\n${failures.join('\n')}`);
  }
}

export const test = base.extend<{ trackProgram: TrackProgram }>({
  // auto: true so cleanup runs even when the test does not destructure trackProgram
  trackProgram: [
    async ({ page, request }, use) => {
      const trackedIds: string[] = [];
      const trackedNames: string[] = [];
      const pendingCaptures: Promise<void>[] = [];

      const trackName = (name: string) => {
        const value = name?.trim() ? name : '';
        if (!value) return;
        if (!trackedNames.includes(value)) {
          trackedNames.push(value);
        }
        const trimmed = value.trim();
        if (trimmed && !trackedNames.includes(trimmed)) {
          trackedNames.push(trimmed);
        }
      };

      const track = ((uuid: string, name?: string) => {
        if (!uuid) {
          throw new Error('trackProgram called with an empty program id');
        }
        if (!trackedIds.includes(uuid)) {
          trackedIds.push(uuid);
        }
        if (name) {
          trackName(name);
        }
      }) as TrackProgram;

      track.trackName = trackName;

      const onResponse = (response: import('@playwright/test').Response) => {
        if (!isProgramCreateResponse(response.url(), response.request().method())) {
          return;
        }

        const requestName = nameFromPostData(response.request());
        if (requestName) {
          trackName(requestName);
        }

        if (!response.ok()) {
          return;
        }

        const capture = (async () => {
          try {
            const body = await response.json();
            track(extractProgramId(body), extractProgramName(body) ?? requestName);
          } catch {
            // Ignore unreadable/non-create payloads; explicit trackProgram still works.
          }
        })();
        pendingCaptures.push(capture);
      };

      page.on('response', onResponse);

      await use(track);

      page.off('response', onResponse);
      await Promise.all(pendingCaptures);
      // Late duplicate/double-click creates can land just after the last assertion.
      await new Promise((resolve) => setTimeout(resolve, CREATE_SETTLE_MS));
      await Promise.all(pendingCaptures);
      await deleteTrackedPrograms(request, trackedIds, trackedNames);
    },
    { auto: true },
  ],
});

export { expect };
