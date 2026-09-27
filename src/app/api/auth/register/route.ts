import {
  clientIp, getRedis, hashPassword, normalizeUsername, putUser, rateLimit, SEAT_BASE, SEAT_CAP, userCount,
} from "@/lib/server/auth";

export async function POST(req: Request) {
  const redis = getRedis();
  if (!redis) {
    return Response.json({ error: "Accounts are not set up on this deployment. The README has the steps under Deploy." }, { status: 501 });
  }
  if (!(await rateLimit(redis, `reg:${clientIp(req)}`, 10, 600))) {
    return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  const body = (await req.json().catch(() => null)) as { username?: string; password?: string } | null;
  const username = normalizeUsername(body?.username ?? "");
  const password = body?.password ?? "";
  if (!username) {
    return Response.json({ error: "Username must be 3 to 24 characters: a-z, 0-9, _ or -." }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  // Joining is open: every new account can sign in straight away. The first
  // account is the admin, who can still revoke or delete anyone from /admin.
  let isFirst: boolean;
  try {
    const accounts = await userCount(redis);
    if (accounts > 0 && SEAT_BASE + accounts >= SEAT_CAP) {
      return Response.json({ error: `All ${SEAT_CAP} places are taken.` }, { status: 403 });
    }
    // reserve the name atomically
    const reserved = await redis.set(`user:${username}`, "pending", { nx: true, ex: 30 });
    if (reserved !== "OK") {
      return Response.json({ error: "That username is taken." }, { status: 409 });
    }

    isFirst = accounts === 0;
    const { hash, salt } = await hashPassword(password);
    await putUser(redis, {
      username, hash, salt,
      role: isFirst ? "admin" : "user",
      approved: true,
      sv: 1,
      createdAt: Date.now(),
    });
  } catch {
    // Redis refusing writes, usually the monthly request quota
    return Response.json(
      { error: "New accounts can't be saved right now because the database is over its limit. Try again soon, or look around as a guest." },
      { status: 503 },
    );
  }

  return Response.json({
    ok: true,
    approved: true,
    role: isFirst ? "admin" : "user",
    message: isFirst ? "Admin account created. You can sign in." : "Account created. You can sign in.",
  });
}
