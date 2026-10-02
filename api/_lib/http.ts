import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY for billing admin.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function userFromBearer(authHeader?: string | string[] | null) {
  const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!raw?.startsWith("Bearer ")) return null;
  const token = raw.slice(7).trim();
  if (!token) return null;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return { user: data.user, token, admin };
}

/** Same-origin / configured origins only — never wildcard on secret-bearing APIs. */
export function allowedOrigins(): string[] {
  const raw = [process.env.APP_ORIGIN, process.env.VITE_APP_URL]
    .filter(Boolean)
    .join(",");
  const list = raw
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
  // Local dev defaults
  for (const o of ["http://127.0.0.1:8080", "http://localhost:8080"]) {
    if (!list.includes(o)) list.push(o);
  }
  return list;
}

export function applyCors(req: any, res: any) {
  const origin = String(req.headers?.origin || "").replace(/\/$/, "");
  const allowed = allowedOrigins();
  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-api-key, x-provider, x-generation-id"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
}

const MAX_BODY_BYTES = Number(process.env.MAX_API_BODY_BYTES || 3_000_000);

export class BodyTooLargeError extends Error {
  status = 413;
  constructor(limit = MAX_BODY_BYTES) {
    super(`Request body too large (max ${limit} bytes)`);
    this.name = "BodyTooLargeError";
  }
}

export function readJsonBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === "object") {
      try {
        const approx = Buffer.byteLength(JSON.stringify(req.body), "utf8");
        if (approx > MAX_BODY_BYTES) {
          reject(new BodyTooLargeError());
          return;
        }
      } catch {
        /* ignore size probe */
      }
      resolve(req.body);
      return;
    }

    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;

    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        fail(new BodyTooLargeError());
        try {
          req.destroy?.();
        } catch {
          /* ignore */
        }
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (settled) return;
      settled = true;
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", fail);
  });
}

export function sendJson(res: any, status: number, body: unknown, req?: any) {
  if (req) applyCors(req, res);
  else {
    // Fallback when caller forgot req — still avoid "*"
    const allowed = allowedOrigins();
    if (allowed[0]) res.setHeader("Access-Control-Allow-Origin", allowed[0]);
  }
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-api-key, x-provider, x-generation-id"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.end(JSON.stringify(body));
}

export function handleOptions(req: any, res: any) {
  if (req.method === "OPTIONS") {
    applyCors(req, res);
    res.statusCode = 204;
    res.end();
    return true;
  }
  return false;
}

export function newGenerationId(hint?: string): string {
  const cleaned = String(hint || "").trim();
  if (cleaned.length >= 8 && cleaned.length <= 80) return cleaned;
  try {
    return randomUUID();
  } catch {
    return `gen_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}
