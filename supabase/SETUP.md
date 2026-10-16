# Asooju setup

## 1. Environment

Create `.env` in the repo root:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key

# Optional: comma-separated emails allowed to open /admin
# Optional (UI only — not a security control; admin requires app_metadata.role=admin)
# VITE_ADMIN_EMAILS=
```

## 2. Database

In the Supabase SQL Editor, run:

[`supabase/schema.sql`](./schema.sql)

This creates `projects` with `vfs_files` + `chat_messages` (jsonb), RLS, and **does not** create an `exec_sql` RPC.

If the table already exists, re-run `schema.sql` so missing columns are added (`chat_messages`, `preview_supabase_url`, `preview_supabase_anon_key` for per-project preview Supabase in the builder).

## 3. Admin access

Admin is **separate** from the builder:

- Login: `/admin/login`
- Env: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`
- Panel: `/admin` (own chrome — not in the user sidebar)

Grant access by setting `app_metadata.role = "admin"` on the user in Supabase Auth (Dashboard → Authentication → Users → user → App Metadata).

Server APIs under `/api/admin/*` re-check the JWT role with the service role key — client gates alone are not enough.

Do **not** treat client env email lists as a security control.

## 4. AI keys (BYOK + platform)

### Bring your own key (unlimited)
Paste keys in **Settings → API Keys**. They stay in the browser (`localStorage`) only — never put provider secrets in `VITE_*` (those get bundled into client JS).

Signed-in users **without** a pasted BYOK key use **platform credits** (server-held key).

### Platform credits (Lovable-style)
1. Run [`supabase/billing.sql`](./billing.sql) in the SQL Editor (after `schema.sql`).
   - Revokes client-callable `refund_credit`.
   - Adds idempotent `consume_credit_idempotent` / `refund_credit_idempotent` (service-role only).
2. Set **server** env (Vercel / `.env` — never expose the service role or platform AI keys to the client):

```bash
PLATFORM_GEMINI_API_KEY=...          # server-only Gemini key for free/pro users
PLATFORM_DEEPSEEK_API_KEY=...        # optional alternate platform provider
PLATFORM_AI_PROVIDER=gemini
SUPABASE_SERVICE_ROLE_KEY=...        # billing + credit metering
APP_ORIGIN=http://127.0.0.1:8080     # CORS allowlist (comma-separated for prod)
VITE_SUPABASE_URL=...                # already required
VITE_APP_URL=http://127.0.0.1:8080   # Stripe redirect base

# Optional abuse caps (defaults shown)
# MAX_API_BODY_BYTES=3000000
# AI_BURST_LIMIT=8
# AI_HOURLY_LIMIT=40
# AI_DAILY_LIMIT=120
# AI_MAX_CONCURRENT=2

# Stripe (Checkout + Portal + webhooks)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...           # recurring Price for Pro ($29/mo → 100 credits)
```

3. Stripe Dashboard → Product **Asooju Pro** → recurring price → copy Price ID to `STRIPE_PRICE_PRO`.
4. Webhook endpoint: `https://YOUR_DOMAIN/api/stripe/webhook`  
   Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`.
5. Local webhook forwarding: `stripe listen --forward-to localhost:8080/api/stripe/webhook`

**Economics**
| Plan | Access |
|------|--------|
| Free | 5 platform prompts on signup |
| Pro | 100 credits / month via Stripe subscription |
| BYOK | Unlimited; does not burn platform credits |

API routes: `/api/stripe/checkout`, `/api/stripe/portal`, `/api/stripe/webhook`, `/api/ai/gemini`.

Restart `npm run dev` after changing `.env`.

In the app: Settings → Billing for credit balance + Stripe portal; Settings → API Keys for BYOK.

- **OpenAI / Gemini / Grok / DeepSeek (BYOK)** — browser calls
- **Claude (BYOK)** — via `/api/claude` proxy
- **Platform (no BYOK)** — `/api/ai/gemini` with server key + credit spend/refund

Gemini uses Generative Language REST with `x-goog-api-key` (supports new `AQ.` auth keys).

## 5. Guest mode

Guest sessions are local-only. Projects save to `localStorage`, not Supabase.

## 6. Email signup = OTP code (not confirmation links)

Asooju verifies email with a **6-digit code** at `/auth/verify`, then a short onboarding at `/auth/onboarding`.

In **Supabase Dashboard → Authentication → Email Templates → Confirm signup**, use the token (not the link):

```html
<h2>Your Asooju code</h2>
<p>Enter this code to verify your email:</p>
<p style="font-size:24px;letter-spacing:6px;font-weight:700">{{ .Token }}</p>
<p>This code expires soon. If you didn’t sign up, ignore this email.</p>
```

Also enable **Confirm email** under Authentication → Providers → Email.

**Local testing tip:** if you keep hitting `Token has expired or is invalid` or email rate limits, temporarily disable **Confirm email** — signup will create a session immediately and skip `/auth/verify`. Turn it back on for production, with `{{ .Token }}` in the template.

Optional: Authentication → Email → set OTP expiry (e.g. 3600s).

Built-in Supabase mail is heavily rate-limited (~2–4/hour). After a few signup retries you’ll get rate-limit errors — wait, or add custom SMTP.

Do **not** rely on `{{ .ConfirmationURL }}` for Asooju signup — the app never needs the user to click a magic link.

Flow: Signup → email code → `/auth/verify` → `/auth/onboarding` → `/app`.

### Password reset

Allow redirect URLs that include `/auth/reset-password` (e.g. `http://127.0.0.1:8080/**`).  
App flow: Sign in → **Forgot password?** → email link → `/auth/reset-password`.  
Reset email template may use the default `{{ .ConfirmationURL }}` link.

## 7. Templates

`/templates` and **New Project** seed real multifile VFS workspaces from `src/lib/templates.ts` (not prompt-only stubs).
