/**
 * Env-gated admin session tokens (HMAC).
 * Independent of Supabase Auth user passwords.
 */
import { createHash, createHmac, timingSafeEqual } from "crypto";

function secret(): string {
  const s =
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "";
  if (!s) throw new Error("ADMIN_PASSWORD (or ADMIN_SESSION_SECRET) not set");
  return s;
}

function digestEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

export function adminEnvConfigured(): boolean {
  return Boolean(
    String(process.env.ADMIN_EMAIL || "").trim() &&
      String(process.env.ADMIN_PASSWORD || "")
  );
}

export function checkAdminCredentials(email: string, password: string): boolean {
  const expectedEmail = String(process.env.ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
  const expectedPassword = String(process.env.ADMIN_PASSWORD || "");
  if (!expectedEmail || !expectedPassword) return false;
  return (
    digestEqual(email.trim().toLowerCase(), expectedEmail) &&
    digestEqual(password, expectedPassword)
  );
}

export function signAdminToken(email: string, ttlSec = 60 * 60 * 12): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const body = Buffer.from(
    JSON.stringify({ typ: "shipkernel_admin", email, exp }),
    "utf8"
  ).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyAdminToken(
  token: string
): { email: string; exp: number } | null {
  try {
    const [body, sig] = String(token || "").split(".");
    if (!body || !sig) return null;
    const expect = createHmac("sha256", secret()).update(body).digest("base64url");
    if (!digestEqual(sig, expect)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload?.typ !== "shipkernel_admin") return null;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    const email = String(payload.email || "").trim().toLowerCase();
    if (!email) return null;
    return { email, exp: payload.exp };
  } catch {
    return null;
  }
}

export function bearerToken(authHeader?: string | string[] | null): string | null {
  const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!raw?.startsWith("Bearer ")) return null;
  const token = raw.slice(7).trim();
  return token || null;
}
