import {
  clientIp, getRedis, getSecret, getUser, normalizeUsername, rateLimit,
  SESSION_DAYS, sessionCookie, signToken, verifyPassword,
} from "@/lib/server/auth";

export async function POST(req: Request) {
  const redis = getRedis();
  if (!redis) {
    return Response.json({ error: "Accounts are not set up on this deployment." }, { status: 501 });
  }
  const body = (await req.json().catch(() => null)) as { username?: string; password?: string } | null;
  const username = normalizeUsername(body?.username ?? "");
  const password = body?.password ?? "";
  if (!username || !password) {
    return Response.json({ error: "Username and password required." }, { status: 400 });
  }
  if (!(await rateLimit(redis, `login:${clientIp(req)}:${username}`, 20, 600))) {
    return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  let user;
  try {
    user = await getUser(redis, username);
  } catch {
    return Response.json({ error: "Sign-in is unavailable right now. The database did not answer. Try again in a minute." }, { status: 503 });
  }
  if (!user || typeof user !== "object" || !("hash" in user) || !(await verifyPassword(password, user))) {
    return Response.json({ error: "Invalid username or password." }, { status: 401 });
  }
  if (!user.approved) {
    return Response.json(
      { error: "An admin has switched this account off.", pending: true },
      { status: 403 },
    );
  }

  const secret = await getSecret(redis);
  const maxAge = SESSION_DAYS * 86400;
  const token = signToken({ u: user.username, sv: user.sv, exp: Math.floor(Date.now() / 1000) + maxAge }, secret);
  return Response.json(
    { ok: true, user: { username: user.username, role: user.role } },
    { headers: { "set-cookie": sessionCookie(token, maxAge) } },
  );
}
