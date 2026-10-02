/**
 * Server-side admin gate.
 * Accepts operator session from ADMIN_EMAIL/ADMIN_PASSWORD login
 * (HMAC token) — independent of customer Auth passwords.
 */
import { getSupabaseAdmin, sendJson } from "./http";
import { bearerToken, verifyAdminToken } from "./admin-session";

export type AdminCtx = {
  user: { id: string; email?: string | null; app_metadata?: Record<string, unknown> };
  token: string;
  admin: ReturnType<typeof getSupabaseAdmin>;
};

export async function requireAdmin(
  req: any,
  res: any
): Promise<AdminCtx | null> {
  const token = bearerToken(req.headers?.authorization);
  if (!token) {
    sendJson(res, 401, { error: "Unauthorized" }, req);
    return null;
  }

  const session = verifyAdminToken(token);
  if (!session) {
    sendJson(res, 401, { error: "Unauthorized — admin session invalid or expired" }, req);
    return null;
  }

  let admin: ReturnType<typeof getSupabaseAdmin>;
  try {
    admin = getSupabaseAdmin();
  } catch (e: any) {
    sendJson(
      res,
      503,
      { error: e?.message || "Missing SUPABASE_SERVICE_ROLE_KEY" },
      req
    );
    return null;
  }

  return {
    user: {
      id: "env-admin",
      email: session.email,
      app_metadata: { role: "admin", source: "env" },
    },
    token,
    admin,
  };
}
