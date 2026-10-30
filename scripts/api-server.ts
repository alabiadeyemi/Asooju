/**
 * Standalone Node host for /api/* (Vercel-style handlers).
 * Use behind nginx when the SPA is static-only:
 *
 *   location /api/ {
 *     proxy_pass http://127.0.0.1:8787;
 *     proxy_http_version 1.1;
 *     proxy_set_header Host $host;
 *     proxy_set_header Authorization $http_authorization;
 *     proxy_set_header Content-Type $http_content_type;
 *     proxy_read_timeout 120s;
 *   }
 *
 * Run: npm run start:api
 */
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadEnv } from "vite";

const PORT = Number(process.env.API_PORT || process.env.PORT || 8787);
const ROOT = process.cwd();

// Match local Vite plugin + Vercel filesystem routes
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

for (const [k, v] of Object.entries(loadEnv("production", ROOT, ""))) {
  if (process.env[k] === undefined) process.env[k] = v;
}
for (const [k, v] of Object.entries(loadEnv("development", ROOT, ""))) {
  if (process.env[k] === undefined) process.env[k] = v;
}

async function loadHandler(rel: string) {
  const abs = path.join(ROOT, rel);
  const mod = await import(pathToFileURL(abs).href);
  if (typeof mod.default !== "function") {
    throw new Error(`No default export: ${rel}`);
  }
  return mod.default as (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void> | void;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = (req.url || "").split("?")[0];
    const file = ROUTES[url || ""];
    if (!file) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: `No API route for ${url}` }));
      return;
    }
    const handler = await loadHandler(file);
    await handler(req, res);
  } catch (e: any) {
    console.error("[api-server]", e);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: e?.message || "API server error" }));
    }
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[api-server] listening on http://127.0.0.1:${PORT}`);
  console.log(`[api-server] platform provider env: ${process.env.PLATFORM_AI_PROVIDER || "(unset)"}`);
});
