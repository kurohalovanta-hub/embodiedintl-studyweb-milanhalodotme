// Key-value store on Supabase Postgres, shaped like the slice of the Upstash
// Redis client this app uses. Everything lives in one `kv` table (key, jsonb
// value, optional expiry); sets and lists are jsonb arrays, and the operations
// that must be atomic (NX set, incr, set add/remove, list push/pop) are SQL
// functions. Schema: docs/architecture/supabase-kv.sql.
//
// Reached only with the service-role key from server routes. Row level security
// is on with no policies, so the public keys cannot read or write the table.

type Json = unknown;

interface Row {
  value: Json;
  expires_at: string | null;
}

export class SupabaseKV {
  private readonly base: string;
  private readonly headers: Record<string, string>;

  constructor(url: string, key: string) {
    this.base = `${url.replace(/\/+$/, "")}/rest/v1`;
    this.headers = {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    };
  }

  private async call(path: string, init: RequestInit & { prefer?: string } = {}): Promise<Json> {
    const { prefer, ...rest } = init;
    const res = await fetch(`${this.base}${path}`, {
      ...rest,
      headers: { ...this.headers, ...(prefer ? { prefer } : {}) },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`supabase kv ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const text = await res.text();
    return text ? (JSON.parse(text) as Json) : null;
  }

  private rpc(fn: string, args: Record<string, Json>): Promise<Json> {
    return this.call(`/rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });
  }

  private static q(key: string): string {
    return `key=eq.${encodeURIComponent(key)}`;
  }

  private static live(row: Row | undefined): row is Row {
    return !!row && (!row.expires_at || Date.parse(row.expires_at) > Date.now());
  }

  private static expiry(seconds?: number): string | null {
    return seconds ? new Date(Date.now() + seconds * 1000).toISOString() : null;
  }

  async get<T = Json>(key: string): Promise<T | null> {
    const rows = (await this.call(`/kv?${SupabaseKV.q(key)}&select=value,expires_at`)) as Row[];
    const row = rows[0];
    return SupabaseKV.live(row) ? (row.value as T) : null;
  }

  async mget<T extends unknown[]>(...keys: string[]): Promise<T> {
    return (await Promise.all(keys.map((k) => this.get(k)))) as T;
  }

  async set(key: string, value: Json, opts?: { nx?: boolean; ex?: number }): Promise<"OK" | null> {
    if (opts?.nx) {
      const ok = await this.rpc("kv_set_nx", { k: key, v: value, ttl_seconds: opts.ex ?? null });
      return ok ? "OK" : null;
    }
    await this.call("/kv", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: JSON.stringify({ key, value, expires_at: SupabaseKV.expiry(opts?.ex) }),
    });
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    await Promise.all(
      keys.map((k) => this.call(`/kv?${SupabaseKV.q(k)}`, { method: "DELETE", prefer: "return=minimal" })),
    );
    return keys.length;
  }

  async incr(key: string): Promise<number> {
    return Number(await this.rpc("kv_incr", { k: key, ttl_seconds: null }));
  }

  async expire(key: string, seconds: number): Promise<number> {
    await this.call(`/kv?${SupabaseKV.q(key)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ expires_at: SupabaseKV.expiry(seconds) }),
    });
    return 1;
  }

  // ── sets ─────────────────────────────────────────────────────────
  async sadd(key: string, ...members: string[]): Promise<number> {
    for (const member of members) await this.rpc("kv_sadd", { k: key, member });
    return members.length;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    for (const member of members) await this.rpc("kv_srem", { k: key, member });
    return members.length;
  }

  async smembers(key: string): Promise<string[]> {
    const v = await this.get<Json>(key);
    return Array.isArray(v) ? (v as string[]) : [];
  }

  async scard(key: string): Promise<number> {
    return (await this.smembers(key)).length;
  }

  // ── lists ────────────────────────────────────────────────────────
  async lpush(key: string, ...values: Json[]): Promise<number> {
    // Redis pushes one at a time, so the last argument ends up at the head
    return Number(await this.rpc("kv_push", { k: key, vals: [...values].reverse(), at_head: true }));
  }

  async rpush(key: string, ...values: Json[]): Promise<number> {
    return Number(await this.rpc("kv_push", { k: key, vals: values, at_head: false }));
  }

  async lpop<T = Json>(key: string, count?: number): Promise<T | null> {
    const taken = (await this.rpc("kv_pop", { k: key, n: count ?? 1, from_head: true })) as Json[];
    if (!taken.length) return null;
    return (count === undefined ? taken[0] : taken) as T;
  }

  async rpop<T = Json>(key: string, count?: number): Promise<T | null> {
    const taken = (await this.rpc("kv_pop", { k: key, n: count ?? 1, from_head: false })) as Json[];
    if (!taken.length) return null;
    return (count === undefined ? taken[0] : taken) as T;
  }
}
