import { config } from '../config';
import { cached } from './cache';

let token: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (token && token.expiresAt - 60_000 > Date.now()) return token.value;

  if (!config.clientId || !config.clientSecret) {
    throw new Error('BNET_CLIENT_ID and BNET_CLIENT_SECRET must be set (see server/.env.example).');
  }

  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const res = await fetch('https://oauth.battle.net/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`Battle.net token request failed: HTTP ${res.status}`);

  const json = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return token.value;
}

// Blizzard allows 100 requests/second: keep a comfortable margin.
const MAX_CONCURRENT = 10;
const MIN_INTERVAL_MS = 25;
const MAX_ATTEMPTS = 5;
let active = 0;
let nextStartAt = 0;
const queue: Array<() => void> = [];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((resolve) => queue.push(resolve));
  active++;
  try {
    const startAt = Math.max(Date.now(), nextStartAt);
    nextStartAt = startAt + MIN_INTERVAL_MS;
    await sleep(startAt - Date.now());
    return await task();
  } finally {
    active--;
    queue.shift()?.();
  }
}

export class BlizzardApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, locale: string): Promise<T> {
  const url = new URL(`https://${config.region}.api.blizzard.com${path}`);
  url.searchParams.set('namespace', `static-${config.region}`);
  url.searchParams.set('locale', locale);

  for (let attempt = 1; ; attempt++) {
    const res = await withSlot(async () =>
      fetch(url, {
        headers: { Authorization: `Bearer ${await getAccessToken()}`, Accept: 'application/json' },
      }),
    );
    if (res.ok) return (await res.json()) as T;

    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= MAX_ATTEMPTS) {
      throw new BlizzardApiError(`Blizzard API ${path}: HTTP ${res.status}`, res.status);
    }
    const retryAfter = Number(res.headers.get('retry-after')) * 1000;
    await sleep(retryAfter || 250 * 2 ** attempt);
  }
}

/** Fetches a Blizzard Game Data API document (static namespace), with caching. */
export function getGameData<T>(path: string, locale = config.defaultLocale): Promise<T> {
  return cached(`${config.region}:${locale}:${path}`, () => request<T>(path, locale));
}
