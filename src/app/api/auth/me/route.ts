import {
  getRedis, getSecret, getUser, readCookie, SESSION_COOKIE, userCount, verifyToken,
} from "@/lib/server/auth";

// Reports auth configuration + current session. Never errors — the client
// uses this single call to decide between local mode, login gate, and app.
export async function GET(req: Request) {
  const redis = getRedis();
  if (!redis) return Response.json({ configured: false });

  let user = null;
  const token = readCookie(req, SESSION_COOKIE);
  if (token) {
    try {
      const secret = await getSecret(redis);
      const payload = verifyToken(token, secret);
      if (payload) {
        const u = await getUser(redis, payload.u);
        if (u && u.approved && u.sv === payload.sv) {
          user = { username: u.username, role: u.role };
        }
      }
    } catch {
      // fall through as signed-out
    }
  }
  // Redis down or over quota: report signed-out rather than a 500, which the
  // client would mistake for "no accounts configured".
  let bootstrapped = true;
  try {
    bootstrapped = (await userCount(redis)) > 0;
  } catch {
    // keep the default
  }
  return Response.json({ configured: true, bootstrapped, user });
}
