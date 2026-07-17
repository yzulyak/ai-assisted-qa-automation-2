import { test as base, expect, type APIRequestContext } from '@playwright/test';

const API_BASE = (process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio').replace(
  /\/$/,
  '',
);

type TrackProgram = (uuid: string) => void;

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

function isProgramCreateResponse(url: string, method: string): boolean {
  if (method !== 'POST') return false;
  try {
    const pathname = new URL(url).pathname.replace(/\/$/, '');
    return pathname.endsWith('/api/programs');
  } catch {
    return url.includes('/api/programs') && !url.includes('/api/programs/');
  }
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

async function deleteTrackedPrograms(
  request: APIRequestContext,
  tracked: string[],
): Promise<void> {
  if (tracked.length === 0) {
    return;
  }

  const token = await resolveAuthToken(request);
  const failures: string[] = [];
  for (const uuid of tracked) {
    const response = await request.delete(`${API_BASE}/api/programs/${uuid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok() && response.status() !== 404) {
      failures.push(`${uuid}: ${response.status()} ${await response.text()}`);
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
      const tracked: string[] = [];
      const pendingCaptures: Promise<void>[] = [];

      const track = (uuid: string) => {
        if (!uuid) {
          throw new Error('trackProgram called with an empty program id');
        }
        if (!tracked.includes(uuid)) {
          tracked.push(uuid);
        }
      };

      const onResponse = (response: import('@playwright/test').Response) => {
        if (!isProgramCreateResponse(response.url(), response.request().method())) {
          return;
        }
        if (!response.ok()) {
          return;
        }

        const capture = (async () => {
          try {
            const body = await response.json();
            track(extractProgramId(body));
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
      await deleteTrackedPrograms(request, tracked);
    },
    { auto: true },
  ],
});

export { expect };
