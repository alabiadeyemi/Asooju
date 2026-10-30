# Deploy Asooju on Coolify (no manual nginx)

## Why you saw HTTP 405

Coolify (or nginx) was serving **only the static Vite `dist/`**.  
Browser `POST /api/ai/gemini` hit static files → **405**. Platform AI never ran.

It does **not** have to be hard: run **one Node container** that serves the SPA **and** `/api`.

## Coolify setup (once)

1. **New Resource** → your Git repo → **Dockerfile** build pack (this repo has a `Dockerfile`).
2. **Port**: `3000` (container listens on `PORT`; Coolify proxies HTTPS to it).
3. **Domains**: `asooju.com` (Coolify handles TLS).
4. **Environment variables** (Runtime — not only build):

| Variable | Notes |
|----------|--------|
| `VITE_SUPABASE_URL` | Also as **build arg** |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Also as **build arg** |
| `VITE_APP_URL` | `https://asooju.com` — build + runtime |
| `APP_ORIGIN` | same as `VITE_APP_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | runtime |
| `PLATFORM_AI_PROVIDER` | `deepseek` or `gemini` |
| `PLATFORM_DEEPSEEK_API_KEY` / `PLATFORM_GEMINI_API_KEY` | matching key |
| Stripe / admin vars | as in `HOW_TO_RUN.md` |

5. Mark `VITE_*` as **available at build time** (Coolify: build-time env / Docker build args) so the SPA is baked correctly.
6. **Deploy**.

## Verify (30 seconds)

```bash
curl -sS https://asooju.com/api/healthz
```

Expect JSON like:

```json
{"ok":true,"service":"asooju-api","platformProvider":"deepseek",...}
```

If you still get nginx HTML `405`, the app is still on a **static-only** resource — switch that service to the **Dockerfile** (not “Static” / nginx-only).

## What the client does **not** need

- Hand-editing nginx `location /api/`
- `pm2` on the host
- Separate API server

Coolify’s proxy → container port → `npm start` (static + API). That’s it.
