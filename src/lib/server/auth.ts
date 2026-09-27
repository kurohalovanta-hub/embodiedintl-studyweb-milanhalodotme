import { Redis } from "@upstash/redis";
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { SupabaseKV } from "@/lib/server/supabase-kv";

const scrypt = promisify(scryptCb);

// ── storage ────────────────────────────────────────────────────────
export function getRedis(): Redis | null {
  // Supabase, when configured, replaces Upstash as the store. It answers the
  // same calls, so every caller keeps treating it as the Redis client.
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (sbUrl && sbKey) return new SupabaseKV(sbUrl, sbKey) as unknown as Redis;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export interface UserRecord {
  username: string;
  hash: string; // hex
  salt: string; // hex
  role: "admin" | "user";
  approved: boolean;
  sv: number; // session version — bump to revoke all sessions
  createdAt: number;
  // one-time recovery code (hashed at rest, shown to the user exactly once)
  recoveryHash?: string;
  recoverySalt?: string;
  recoveryCreatedAt?: number;
}

const USER_KEY = (u: string) => `user:${u}`;
const USERS_SET = "users";
const SECRET_KEY = "auth:secret";

export function normalizeUsername(raw: string): string | null {
  const u = raw.trim().toLowerCase();
  return /^[a-z0-9_-]{3,24}$/.test(u) ? u : null;
}

// ── signing secret (auto-generated, stored in Redis → zero-env deploys) ──
let secretCache: string | null = null;
export async function getSecret(redis: Redis): Promise<string> {
  if (secretCache) return secretCache;
  let s = await redis.get<string>(SECRET_KEY);
  if (!s) {
    const fresh = randomBytes(32).toString("hex");
    // NX so concurrent cold starts agree on one secret
    const set = await redis.set(SECRET_KEY, fresh, { nx: true });
    s = set === "OK" ? fresh : ((await redis.get<string>(SECRET_KEY)) ?? fresh);
  }
  secretCache = s;
  return s;
}

// ── passwords ──────────────────────────────────────────────────────
export async function hashPassword(password: string, saltHex?: string) {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return { hash: derived.toString("hex"), salt: salt.toString("hex") };
}

export async function verifyPassword(password: string, user: UserRecord): Promise<boolean> {
  const { hash } = await hashPassword(password, user.salt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(user.hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── recovery codes (no email infra by design — ADR-004 / recalibration 05) ──
// 128 bits of entropy, grouped for legibility. Stored only as a scrypt hash, so a
// Redis dump never reveals a usable code. Single use: consuming it clears it.
export function generateRecoveryCode(): string {
  const hex = randomBytes(16).toString("hex").toUpperCase();
  return (hex.match(/.{1,8}/g) ?? []).join("-");
}

/** Accept the code however it was typed: dashes, spaces and case are irrelevant. */
export function normalizeRecoveryCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-F0-9]/g, "");
}

export async function verifyRecoveryCode(code: string, user: UserRecord): Promise<boolean> {
  if (!user.recoveryHash || !user.recoverySalt) return false;
  const { hash } = await hashPassword(normalizeRecoveryCode(code), user.recoverySalt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(user.recoveryHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── session tokens ─────────────────────────────────────────────────
const b64u = (buf: Buffer) => buf.toString("base64url");

export interface SessionPayload {
  u: string;
  sv: number;
  exp: number; // epoch seconds
}

export function signToken(payload: SessionPayload, secret: string): string {
  const body = b64u(Buffer.from(JSON.stringify(payload)));
  const mac = b64u(createHmac("sha256", secret).update(body).digest());
  return `${body}.${mac}`;
}

export function verifyToken(token: string, secret: string): SessionPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expect = b64u(createHmac("sha256", secret).update(body).digest());
  const a = Buffer.from(mac);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (typeof payload.u !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "eios_session";
export const SESSION_DAYS = 30;

export function sessionCookie(token: string, maxAgeSec: number): string {
  const secure = process.env.NODE_ENV !== "development" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
}

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq) === name) return part.slice(eq + 1);
  }
  return null;
}

// ── users ──────────────────────────────────────────────────────────
export async function getUser(redis: Redis, username: string): Promise<UserRecord | null> {
  return (await redis.get<UserRecord>(USER_KEY(username))) ?? null;
}

export async function putUser(redis: Redis, user: UserRecord): Promise<void> {
  await redis.set(USER_KEY(user.username), user);
  await redis.sadd(USERS_SET, user.username);
}

export async function deleteUser(redis: Redis, username: string): Promise<void> {
  await redis.del(USER_KEY(username));
  await redis.srem(USERS_SET, username);
  await redis.del(`progress:${username}`);
}

export async function listUsers(redis: Redis): Promise<UserRecord[]> {
  const names = await redis.smembers(USERS_SET);
  if (!names.length) return [];
  const users = await Promise.all(names.map((n) => getUser(redis, n as string)));
  return users
    .filter((u): u is UserRecord => !!u)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function userCount(redis: Redis): Promise<number> {
  return (await redis.scard(USERS_SET)) ?? 0;
}

// Places shown on the sign-in screen: SEAT_BASE plus the accounts in the store,
// out of SEAT_CAP. Joining closes once the total reaches the cap.
export const SEAT_BASE = Number(process.env.HALO_SEAT_BASE ?? 30);
export const SEAT_CAP = Number(process.env.HALO_SEAT_CAP ?? 50);
export const seatsTaken = (accounts: number) => Math.min(SEAT_CAP, SEAT_BASE + accounts);

// ── the authenticated-request helper every data route uses ─────────
export interface AuthContext {
  redis: Redis;
  user: UserRecord;
}

export async function requireSession(req: Request): Promise<AuthContext | Response> {
  const redis = getRedis();
  if (!redis) {
    return Response.json({ error: "Accounts not configured on this deployment." }, { status: 501 });
  }
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return new Response("unauthorized", { status: 401 });
  const secret = await getSecret(redis);
  const payload = verifyToken(token, secret);
  if (!payload) return new Response("unauthorized", { status: 401 });
  const user = await getUser(redis, payload.u);
  if (!user || !user.approved || user.sv !== payload.sv) {
    return new Response("unauthorized", { status: 401 });
  }
  return { redis, user };
}

export async function requireAdmin(req: Request): Promise<AuthContext | Response> {
  const ctx = await requireSession(req);
  if (ctx instanceof Response) return ctx;
  if (ctx.user.role !== "admin") return new Response("forbidden", { status: 403 });
  return ctx;
}

// ── minimal rate limiting (per key, fixed window) ──────────────────
export async function rateLimit(
  redis: Redis,
  key: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  const k = `rl:${key}:${Math.floor(Date.now() / (windowSec * 1000))}`;
  try {
    const n = await redis.incr(k);
    if (n === 1) await redis.expire(k, windowSec);
    return n <= limit;
  } catch {
    // Redis refusing writes (over its request quota, or down) must not lock
    // everyone out of sign-in, which only needs reads. Fail open.
    return true;
  }
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "local"
  );
}
