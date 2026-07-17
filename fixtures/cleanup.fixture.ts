import { test as base, expect, type APIRequestContext } from '@playwright/test';

const API_BASE = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';

type TrackProgram = (uuid: string) => void;

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

export const test = base.extend<{ trackProgram: TrackProgram }>({
  trackProgram: async ({ request }, use) => {
    const tracked: string[] = [];

    await use((uuid: string) => {
      if (uuid && !tracked.includes(uuid)) {
        tracked.push(uuid);
      }
    });

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
  },
});

export { expect };
