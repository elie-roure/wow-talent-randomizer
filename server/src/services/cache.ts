import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config';

type Entry = { expiresAt: number; value: unknown };

const memory = new Map<string, Entry>();
const pending = new Map<string, Promise<unknown>>();

function fileFor(key: string): string {
  const hash = crypto.createHash('sha1').update(key).digest('hex');
  return path.join(config.cacheDir, `${hash}.json`);
}

async function readDisk(key: string): Promise<Entry | null> {
  try {
    const raw = await fs.readFile(fileFor(key), 'utf8');
    const entry = JSON.parse(raw) as Entry;
    return entry.expiresAt > Date.now() ? entry : null;
  } catch {
    return null;
  }
}

async function writeDisk(key: string, entry: Entry): Promise<void> {
  try {
    await fs.mkdir(config.cacheDir, { recursive: true });
    await fs.writeFile(fileFor(key), JSON.stringify(entry));
  } catch (err) {
    console.warn('[cache] unable to write cache entry:', err);
  }
}

/**
 * Returns the cached value for `key`, or computes it with `producer`.
 * Values are kept in memory and on disk; concurrent calls for the same key share one producer.
 */
export async function cached<T>(key: string, producer: () => Promise<T>): Promise<T> {
  const hit = memory.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;

  const inFlight = pending.get(key);
  if (inFlight) return inFlight as Promise<T>;

  const promise = (async () => {
    const disk = await readDisk(key);
    if (disk) {
      memory.set(key, disk);
      return disk.value as T;
    }
    const value = await producer();
    const entry = { expiresAt: Date.now() + config.cacheTtlMs, value };
    memory.set(key, entry);
    await writeDisk(key, entry);
    return value;
  })();

  pending.set(key, promise);
  try {
    return await promise;
  } finally {
    pending.delete(key);
  }
}
