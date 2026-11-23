// Key-value storage for accounts, tokens and training data.
// Production: Upstash Redis, connected to the Vercel project through the Marketplace
// (it sets KV_REST_API_URL / KV_REST_API_TOKEN). Tests: an in-memory store.
import { Redis } from '@upstash/redis';

export interface Store {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  // Sets only when the key is new; false when it already existed
  setNew(key: string, value: unknown): Promise<boolean>;
  getDel<T>(key: string): Promise<T | null>;
  del(key: string): Promise<void>;
  incr(key: string, ttlSeconds: number): Promise<number>;
  hGetAll<T>(key: string): Promise<Record<string, T>>;
  hSet(key: string, values: Record<string, unknown>): Promise<void>;
  hDel(key: string, fields: string[]): Promise<void>;
}

export class StoreNotConfigured extends Error {}

class RedisStore implements Store {
  constructor(private r: Redis) {}
  get<T>(key: string) {
    return this.r.get<T>(key);
  }
  async set(key: string, value: unknown, ttlSeconds?: number) {
    if (ttlSeconds) await this.r.set(key, value, { ex: ttlSeconds });
    else await this.r.set(key, value);
  }
  async setNew(key: string, value: unknown) {
    return (await this.r.set(key, value, { nx: true })) === 'OK';
  }
  getDel<T>(key: string) {
    return this.r.getdel<T>(key);
  }
  async del(key: string) {
    await this.r.del(key);
  }
  async incr(key: string, ttlSeconds: number) {
    const n = await this.r.incr(key);
    if (n === 1) await this.r.expire(key, ttlSeconds);
    return n;
  }
  async hGetAll<T>(key: string) {
    return ((await this.r.hgetall<Record<string, T>>(key)) ?? {}) as Record<string, T>;
  }
  async hSet(key: string, values: Record<string, unknown>) {
    if (Object.keys(values).length) await this.r.hset(key, values);
  }
  async hDel(key: string, fields: string[]) {
    if (fields.length) await this.r.hdel(key, ...fields);
  }
}

// Same behaviour, kept in memory; values are copied through JSON like Redis does
export class MemoryStore implements Store {
  private kv = new Map<string, { v: string; exp?: number }>();
  private hashes = new Map<string, Map<string, string>>();

  private live(key: string) {
    const e = this.kv.get(key);
    if (e?.exp && e.exp < Date.now()) {
      this.kv.delete(key);
      return undefined;
    }
    return e;
  }
  async get<T>(key: string) {
    const e = this.live(key);
    return e ? (JSON.parse(e.v) as T) : null;
  }
  async set(key: string, value: unknown, ttlSeconds?: number) {
    this.kv.set(key, { v: JSON.stringify(value), exp: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined });
  }
  async setNew(key: string, value: unknown) {
    if (this.live(key)) return false;
    await this.set(key, value);
    return true;
  }
  async getDel<T>(key: string) {
    const v = await this.get<T>(key);
    this.kv.delete(key);
    return v;
  }
  async del(key: string) {
    this.kv.delete(key);
    this.hashes.delete(key);
  }
  async incr(key: string, ttlSeconds: number) {
    const n = ((await this.get<number>(key)) ?? 0) + 1;
    const e = this.live(key);
    this.kv.set(key, { v: JSON.stringify(n), exp: e?.exp ?? Date.now() + ttlSeconds * 1000 });
    return n;
  }
  async hGetAll<T>(key: string) {
    const h = this.hashes.get(key) ?? new Map();
    return Object.fromEntries([...h].map(([f, v]) => [f, JSON.parse(v) as T]));
  }
  async hSet(key: string, values: Record<string, unknown>) {
    const h = this.hashes.get(key) ?? new Map<string, string>();
    for (const [f, v] of Object.entries(values)) h.set(f, JSON.stringify(v));
    this.hashes.set(key, h);
  }
  async hDel(key: string, fields: string[]) {
    const h = this.hashes.get(key);
    for (const f of fields) h?.delete(f);
  }
}

let store: Store | null = null;

export function getStore(): Store {
  if (store) return store;
  if (process.env.HIITAPP_MEMORY_STORE === '1') return (store = new MemoryStore());
  // Default names first; then any custom prefix chosen when connecting the database
  // in Vercel (e.g. HIIT_KV_REST_API_URL)
  const urlKey =
    ['KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL'].find((k) => process.env[k]) ??
    Object.keys(process.env).find((k) => k.endsWith('_KV_REST_API_URL') || k.endsWith('_REDIS_REST_URL'));
  const url = urlKey ? process.env[urlKey] : undefined;
  const token = urlKey ? process.env[urlKey.replace(/URL$/, 'TOKEN')] : undefined;
  if (!url || !token) throw new StoreNotConfigured('Banco de dados não configurado');
  return (store = new RedisStore(new Redis({ url, token })));
}
