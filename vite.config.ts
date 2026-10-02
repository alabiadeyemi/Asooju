import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

/** Mount Vercel-style api/*.ts handlers in local Vite (Stripe + platform AI). */
function localApiPlugin(): Plugin {
  const routes: Record<string, string> = {
    "/api/stripe/checkout": "/api/stripe/checkout.ts",
    "/api/stripe/portal": "/api/stripe/portal.ts",
    "/api/stripe/webhook": "/api/stripe/webhook.ts",
    "/api/ai/gemini": "/api/ai/gemini.ts",
    "/api/ai/generate": "/api/ai/generate.ts",
    "/api/admin/stats": "/api/admin/stats.ts",
    "/api/admin/user": "/api/admin/user.ts",
    "/api/admin/users": "/api/admin/users.ts",
    "/api/admin/projects": "/api/admin/projects.ts",
    "/api/admin/activity": "/api/admin/activity.ts",
    "/api/admin/health": "/api/admin/health.ts",
    "/api/admin/stripe-sync": "/api/admin/stripe-sync.ts",
    "/api/admin/project": "/api/admin/project.ts",
    "/api/admin/credits": "/api/admin/credits.ts",
    "/api/admin/login": "/api/admin/login.ts",
  };

  return {
    name: "shipkernel-local-api",
    configResolved(config) {
      const env = loadEnv(config.mode, config.envDir || process.cwd(), "");
      for (const [k, v] of Object.entries(env)) {
        if (process.env[k] === undefined) process.env[k] = v;
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const url = (req.url || "").split("?")[0];
          const file = routes[url];
          if (!file) return next();
          const mod = await server.ssrLoadModule(file);
          const handler = mod.default;
          if (typeof handler !== "function") {
            res.statusCode = 500;
            res.end("API handler missing default export");
            return;
          }
          await handler(req, res);
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 8080,
    // Don't silently hop to 8081/8082 — preview + bookmarks break ("refused to connect")
    strictPort: true,
    proxy: {
      // Anthropic blocks browser CORS — proxy BYOK calls in local dev
      "/api/claude": {
        target: "https://api.anthropic.com",
        changeOrigin: true,
        rewrite: () => "/v1/messages",
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("anthropic-version", "2023-06-01");
          });
        },
      },
    },
  },
  plugins: [react(), localApiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
