/**
 * POST /api/admin/login — operator admin gate.
 * Uses ADMIN_EMAIL + ADMIN_PASSWORD from server env.
 * Does NOT touch Supabase Auth user passwords.
 */
import {
  applyCors,
  getSupabaseAdmin,
  handleOptions,
  readJsonBody,
  sendJson,
} from "../_lib/http";
import {
  adminEnvConfigured,
  checkAdminCredentials,
  signAdminToken,
} from "../_lib/admin-session";

const loginBurst = new Map<string, { count: number; resetAt: number }>();

function assertLoginBurst(key: string) {
  const now = Date.now();
  const cur = loginBurst.get(key);
  if (!cur || now >= cur.resetAt) {
    loginBurst.set(key, { count: 1, resetAt: now + 60_000 });
    return;
  }
  cur.count += 1;
  if (cur.count > 10) {
    const err: any = new Error("Too many login attempts — try again shortly.");
    err.status = 429;
    throw err;
  }
}

export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" }, req);
  }

  if (!adminEnvConfigured()) {
    return sendJson(
      res,
      503,
      {
        error:
          "Admin login not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD in server env.",
      },
      req
    );
  }

  try {
    const ip = String(
      req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "unknown"
    )
      .split(",")[0]
      .trim();
    assertLoginBurst(ip);

    const body = await readJsonBody(req);
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(body?.password || "");

    if (!email || !password) {
      return sendJson(res, 400, { error: "Email and password required" }, req);
    }

    if (!checkAdminCredentials(email, password)) {
      return sendJson(res, 401, { error: "Invalid admin credentials" }, req);
    }

    // Optional: ensure service role works (admin APIs need it). Do not change Auth password.
    try {
      getSupabaseAdmin();
    } catch (e: any) {
      return sendJson(
        res,
        503,
        {
          error:
            e?.message ||
            "SUPABASE_SERVICE_ROLE_KEY required for admin console APIs",
        },
        req
      );
    }

    const token = signAdminToken(email);
    return sendJson(
      res,
      200,
      {
        token,
        email,
        expires_in: 60 * 60 * 12,
      },
      req
    );
  } catch (e: any) {
    const status = e?.status || 500;
    return sendJson(
      res,
      status,
      { error: e?.message || "Admin login failed" },
      req
    );
  }
}
