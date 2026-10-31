/**
 * Node host for /api/* (Vercel-style handlers) + optional SPA from dist/.
 *
 * API only (behind nginx that already serves static files):
 *   npm run start:api
 *
 * Full stack (Node serves dist + API — simplest nginx proxy_pass /):
 *   npm run build && npm start
 *
 * nginx (API-only proxy — keep path /api/... intact, no trailing slash on proxy_pass):
 *
 *   location /api/ {
 *     proxy_pass http://127.0.0.1:8787;
 *     proxy_http_version 1.1;
 *     proxy_set_header Host $host;
 *     proxy_set_header Authorization $http_authorization;
 *     proxy_set_header Content-Type $http_content_type;
 *     proxy_read_timeout 120s;
 *   }
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PORT = Number(process.env.API_PORT || process.env.PORT || 8787);
// 0.0.0.0 required for Coolify/Docker reverse proxy; override with API_HOST=127.0.0.1 for local-only
const HOST = process.env.API_HOST || "0.0.0.0";
const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const SERVE_STATIC =
  process.env.SERVE_STATIC === "1" ||
  process.env.SERVE_STATIC === "true" ||
  process.argv.includes("--static");

/** Minimal .env loader — avoid importing vite (devDependency) in the prod image. */
function loadEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

for (const name of [
  ".env",
  ".env.local",
  ".env.production",
  ".env.production.local",
  ".env.development",
  ".env.development.local",
]) {
  for (const [k, v] of Object.entries(loadEnvFile(path.join(ROOT, name)))) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

/** Match local Vite plugin + Vercel filesystem routes */
const ROUTES: Record<string, string> = {
  "/api/stripe/checkout": "api/stripe/checkout.ts",
  "/api/stripe/portal": "api/stripe/portal.ts",
  "/api/stripe/webhook": "api/stripe/webhook.ts",
  "/api/ai/gemini": "api/ai/gemini.ts",
  "/api/ai/generate": "api/ai/generate.ts",
  "/api/admin/stats": "api/admin/stats.ts",
  "/api/admin/user": "api/admin/user.ts",
  "/api/admin/users": "api/admin/users.ts",
  "/api/admin/projects": "api/admin/projects.ts",
  "/api/admin/activity": "api/admin/activity.ts",
  "/api/admin/health": "api/admin/health.ts",
  "/api/admin/stripe-sync": "api/admin/stripe-sync.ts",
  "/api/admin/project": "api/admin/project.ts",
  "/api/admin/credits": "api/admin/credits.ts",
  "/api/admin/login": "api/admin/login.ts",
  "/api/claude": "api/claude.ts",
};

const handlerCache = new Map<
  string,
  (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void> | void
>();

async function loadHandler(rel: string) {
  const cached = handlerCache.get(rel);
  if (cached) return cached;
  const abs = path.join(ROOT, rel);
  const mod = await import(pathToFileURL(abs).href);
  if (typeof mod.default !== "function") {
    throw new Error(`No default export: ${rel}`);
  }
  const handler = mod.default as (
    req: http.IncomingMessage,
    res: http.ServerResponse
  ) => Promise<void> | void;
  handlerCache.set(rel, handler);
  return handler;
}

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function safeJoinDist(urlPath: string): string | null {
  const decoded = decodeURIComponent(urlPath.split("?")[0] || "/");
  const rel = decoded === "/" ? "/index.html" : decoded;
  const abs = path.normalize(path.join(DIST, rel));
  if (!abs.startsWith(DIST)) return null;
  return abs;
}

function serveStatic(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  if (!SERVE_STATIC) return false;
  if (!fs.existsSync(DIST)) {
    sendJson(res, 503, {
      error: "dist/ missing — run npm run build before npm start",
    });
    return true;
  }

  const urlPath = (req.url || "/").split("?")[0] || "/";
  let filePath = safeJoinDist(urlPath);
  if (!filePath) {
    res.statusCode = 403;
    res.end("Forbidden");
    return true;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // SPA fallback
    filePath = path.join(DIST, "index.html");
  }
  if (!fs.existsSync(filePath)) {
    res.statusCode = 404;
    res.end("Not found");
    return true;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
  if (ext === ".html") {
    res.setHeader("Cache-Control", "no-cache");
  } else if (urlPath.startsWith("/assets/")) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  }
  fs.createReadStream(filePath).pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = (req.url || "").split("?")[0] || "/";

    // Lightweight probe so nginx proxy can be verified without auth
    if (url === "/api/healthz") {
      const { resolvePlatformAi } = await import("../api/_lib/platform-ai.ts");
      const platform = resolvePlatformAi();
      sendJson(res, 200, {
        ok: true,
        service: "asooju-api",
        platformProvider: platform?.provider || null,
        platformReason: platform?.reason || null,
      });
      return;
    }

    const file = ROUTES[url];
    if (file) {
      const handler = await loadHandler(file);
      await handler(req, res);
      return;
    }

    if (url.startsWith("/api/")) {
      sendJson(res, 404, { error: `No API route for ${url}` });
      return;
    }

    if (serveStatic(req, res)) return;

    sendJson(res, 404, {
      error: `No API route for ${url}. Start with --static (npm start) to serve the SPA, or proxy only /api/ from nginx.`,
    });
  } catch (e: any) {
    console.error("[api-server]", e);
    if (!res.headersSent) {
      sendJson(res, 500, { error: e?.message || "API server error" });
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[api-server] http://${HOST}:${PORT}`);
  console.log(
    `[api-server] PLATFORM_AI_PROVIDER=${process.env.PLATFORM_AI_PROVIDER || "(unset)"}`
  );
  console.log(
    `[api-server] static=${SERVE_STATIC ? `on (${DIST})` : "off (API only — nginx must proxy /api/)"}`
  );
  console.log(`[api-server] probe: GET /api/healthz`);
});
