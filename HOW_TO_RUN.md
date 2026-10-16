# HOW TO RUN — Asooju

Accurate local runbook for this repo (Vite + React + Supabase + optional Stripe / platform AI).

---

## 0. Requirements

| Tool | Version / notes |
|------|-----------------|
| **Node.js** | 20 LTS or newer recommended |
| **npm** | Comes with Node (`npm -v`) |
| **Supabase project** | Auth + Postgres (free tier OK) |
| **Browser** | Chrome / Arc / Firefox |

Optional later: Stripe CLI (billing webhooks), AI API keys (BYOK or platform).

---

## 1. Get the code

### From this zip (no `node_modules` inside)

```bash
cd ~/Desktop   # or wherever you put the zip
unzip asooju-YYYYMMDD-HHMMSS.zip -d asooju
cd asooju
```

### From git

```bash
cd /path/to/asooju
```

---

## 2. Install dependencies

`node_modules` is **not** in the zip. Always install:

```bash
npm install
```

If install fails, clear and retry:

```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 3. Environment file (`.env`)

Create or edit **`.env` in the repo root** (same folder as `package.json`).

### Minimum (app boots + auth + projects)

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_or_publishable_key

# Admin console (/admin/login) — server only, never VITE_
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=choose-a-strong-password
# Also needs SUPABASE_SERVICE_ROLE_KEY (below) so login can mint a session
```


### AI — pick one path

**A) BYOK (unlimited):** paste keys in Settings → API Keys (browser-local only). Do **not** put provider secrets in `VITE_*`.

**B) Platform credits (signed-in users, no BYOK):**

```bash
PLATFORM_GEMINI_API_KEY=          # or PLATFORM_DEEPSEEK_API_KEY=
PLATFORM_AI_PROVIDER=gemini       # or deepseek
SUPABASE_SERVICE_ROLE_KEY=        # server only — never commit to a public repo
VITE_APP_URL=http://127.0.0.1:8080
```

### Billing (only if you want Stripe checkout)

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
```

### Optional — builder verify (recommended for production)

```bash
# Build/auto-fix wave verify uses export-bundle Sandpack; iframe preview UI unchanged
VITE_BUILD_VERIFY_BUNDLER=1
# Preview UI defaults to Draft (iframe). Opt in to Live Sandpack:
# VITE_PREVIEW_V2=1
```

See **Builder preview vs build verify** in [`README.md`](README.md) for the 2-wave smoke check.

**Rules**

- Every secret must be `NAME=value` on its own line (no bare keys without a name).
- Restart `npm run dev` after any `.env` change.
- Vite only exposes variables that start with `VITE_` to the browser. Server routes (`api/*`) read the rest via the local Vite API plugin.

Find Supabase URL + anon/publishable key:  
**Supabase Dashboard → Project Settings → API**.

---

## 4. Supabase database (required for cloud projects / billing)

In **Supabase → SQL Editor**, run **in order**:

1. [`supabase/schema.sql`](supabase/schema.sql) — `projects` table + RLS  
2. [`supabase/billing.sql`](supabase/billing.sql) — profiles, credits, usage (needed for free platform prompts)

If you skip these, **Guest mode** still works (projects in `localStorage` only).

---

## 5. Auth email = 6-digit code (not magic links)

Asooju signup uses **OTP codes** at `/auth/verify`.

1. Supabase → **Authentication → Providers → Email** → enable email + **Confirm email**.
2. **Authentication → Email Templates → Confirm signup** — use the **token**, not the link:

```html
<h2>Your Asooju code</h2>
<p>Enter this code to verify your email:</p>
<p style="font-size:24px;letter-spacing:6px;font-weight:700">{{ .Token }}</p>
<p>This code expires soon. If you didn’t sign up, ignore this email.</p>
```

Flow: `/auth/signup` → email code → `/auth/verify` → `/auth/onboarding` → `/app`.

### Password reset (forgot password)

1. Supabase → **Authentication → URL Configuration**:
   - Site URL = your app origin (e.g. `http://127.0.0.1:8080` or production domain)
   - Redirect URLs include: `http://127.0.0.1:8080/**` and `https://YOUR_DOMAIN/**`
2. Template **Reset password** can stay as the default link (uses `{{ .ConfirmationURL }}`).
3. In the app: **Sign in → Forgot password?** → `/auth/forgot-password` → email link → `/auth/reset-password`.

OAuth (Google / GitHub): enable providers in Supabase and set redirect URLs to your app origin (e.g. `http://127.0.0.1:8080/**`).

---

## 6. Start the app

```bash
npm run dev
```

Then open **exactly**:

```text
http://127.0.0.1:8080
```

### Why this URL matters

- Vite is bound to **`127.0.0.1:8080`** with **`strictPort: true`**.
- Do **not** use `localhost` if it resolves to IPv6 (`::1`) — preview can show “refused to connect”.
- Do **not** expect `8081` / `8082` — the server will **fail** instead of hopping ports.

If port 8080 is busy:

```bash
lsof -i :8080
kill <PID>
npm run dev
```

---

## 7. First actions in the UI

| Goal | What to do |
|------|------------|
| Try without account | **Continue as Guest** on login/signup |
| Full account | Sign up → enter email code → onboarding |
| Build an app | `/app/new` or open a project → Agent chat |
| AI keys | Settings → API Keys (BYOK) **or** rely on platform credits when signed in |
| Admin | `/admin/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD` (separate from user Auth password). Console: Overview · Users · Subs · Projects |

Builder preview runs in an iframe sandbox (`public/preview-sandbox.html`). Keep the tab on `http://127.0.0.1:8080`.

---

## 8. Useful scripts

```bash
npm run dev              # local app + /api/* handlers
npm run build            # production build → dist/
npm run preview          # serve dist (not a full API substitute)
npm run lint
npm run test
npm run validate:templates
npm run smoke:templates
```

---

## 9. Stripe locally (optional)

Only needed to test paid Pro checkout:

```bash
stripe listen --forward-to 127.0.0.1:8080/api/stripe/webhook
```

Put the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`, then restart `npm run dev`.

---

## 10. Production (Vercel)

Asooju is a Vite SPA + `api/*.ts` serverless functions.

### Deploy steps
1. Push the repo and import the project on Vercel (Framework Preset: Vite).
2. Set **Build Command** `npm run build`, **Output** `dist` (defaults are fine).
3. Configure env vars (Production + Preview as needed):

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_SUPABASE_URL` | Build + Runtime | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Build + Runtime | Anon / publishable key |
| `VITE_APP_URL` | Build + Runtime | `https://your-domain.com` (no trailing slash) |
| `APP_ORIGIN` | Runtime | Same as `VITE_APP_URL` (CORS allowlist) |
| `SUPABASE_SERVICE_ROLE_KEY` | Runtime | Billing, credits, admin APIs |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Runtime | Operator `/admin/login` (HMAC session; does not change user Auth passwords) |
| `PLATFORM_AI_PROVIDER` | Runtime | `gemini` or `deepseek` |
| `PLATFORM_GEMINI_API_KEY` / `PLATFORM_DEEPSEEK_API_KEY` | Runtime | Platform AI |
| `STRIPE_SECRET_KEY` | Runtime | Checkout / portal |
| `STRIPE_WEBHOOK_SECRET` | Runtime | Stripe webhooks |
| `STRIPE_PRICE_PRO` | Runtime | Pro price id |
| `VITE_BUILD_VERIFY_BUNDLER` | **Build** | Set to `1` so multi-wave build/auto-fix verify uses export Sandpack (see README) |
| `VITE_PREVIEW_V2` | **Build** | Optional `1` — Live Sandpack preview (default UI is Draft iframe) |

4. Supabase Auth → URL configuration: add `https://YOUR_DOMAIN/**` to redirect allow list; Site URL = production domain.
5. Stripe webhook endpoint: `https://YOUR_DOMAIN/api/stripe/webhook` (events: checkout + subscription).
6. Admin: set `ADMIN_EMAIL` + `ADMIN_PASSWORD` (+ `SUPABASE_SERVICE_ROLE_KEY`). Open `/admin/login` — operator password is separate from customer Auth passwords. Console tabs: Overview, Users, Subs, Projects (mobile bottom nav).

### Serverless notes
- `vercel.json` sets `maxDuration: 60` for AI routes (`api/ai/*`, `api/claude.ts`).
- Keep `"type": "module"` in `package.json` (Vite). API handlers use `export default`.
- Do not import `@/` path aliases from `api/` — use relative imports into `src/lib` (already required for `/api/ai/generate`).

Local Vite mounts the same `api/*.ts` files for Stripe + AI proxies.

---

## 11. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Port 8080 is already in use` | Free the port or stop the other process |
| Preview “refused to connect” | Use `http://127.0.0.1:8080` only; restart `npm run dev` |
| Signup but no code | Fix Confirm signup template to `{{ .Token }}`; check spam |
| “Sign in for free prompts” / no AI | Add BYOK in Settings **or** set `PLATFORM_*` + service role + run `billing.sql` |
| Projects don’t sync | Not signed in (guest) **or** `schema.sql` not applied |
| Claude BYOK CORS errors | Use local `/api/claude` proxy via `npm run dev` (already configured) |
| Env not loading | File must be named `.env` at repo root; restart Vite |

---

## 12. Minimal “just run it” checklist

```bash
cd asooju
npm install
# edit .env → at least VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
# (optional) run supabase/schema.sql + billing.sql
npm run dev
# open http://127.0.0.1:8080
```

More detail on billing/auth templates: [`supabase/SETUP.md`](supabase/SETUP.md).  
Commerce build brief: [`blueprints/shopify-clone.md`](blueprints/shopify-clone.md).

**Product / agent gaps (living log):** [`docs/DISCOVERED_ISSUES.md`](docs/DISCOVERED_ISSUES.md) — add new findings there as we find them.
