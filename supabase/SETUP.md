# ShipKernel setup

## 1. Environment

Create `.env` in the repo root:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key

# Optional: comma-separated emails allowed to open /admin
VITE_ADMIN_EMAILS=you@example.com
```

## 2. Database

In the Supabase SQL Editor, run:

[`supabase/schema.sql`](./schema.sql)

This creates `projects` with `vfs_files` (jsonb), RLS, and **does not** create an `exec_sql` RPC.

## 3. Admin access

Admin is **not** shown in the user sidebar. Open `/admin` directly.

Grant access by either:

- Setting `app_metadata.role = "admin"` on the user in Supabase Auth, or
- Listing the email in `VITE_ADMIN_EMAILS`

## 4. AI keys (BYOK + platform)

### Bring your own key (unlimited)
Keys in the browser (`localStorage`) and/or `.env` for local dev:

```bash
VITE_GEMINI_API_KEY=AQ....
VITE_DEEPSEEK_API_KEY=sk-...
VITE_OPENAI_API_KEY=sk-...
VITE_GROK_API_KEY=xai-...
VITE_CLAUDE_API_KEY=sk-ant-...
```

Signed-in users **without** a pasted BYOK key use **platform credits** (our server key).

### Platform credits (Lovable-style)
1. Run [`supabase/billing.sql`](./billing.sql) in the SQL Editor (after `schema.sql`).
2. Set **server** env (Vercel / `.env` — never expose the service role to the client):

```bash
PLATFORM_GEMINI_API_KEY=...          # server-only Gemini key for free/pro users
SUPABASE_SERVICE_ROLE_KEY=...        # billing + credit metering
VITE_SUPABASE_URL=...                # already required
VITE_APP_URL=http://127.0.0.1:8080   # Stripe redirect base

# Stripe (Checkout + Portal + webhooks)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...           # recurring Price for Pro ($29/mo → 100 credits)
```

3. Stripe Dashboard → Product **ShipKernel Pro** → recurring price → copy Price ID to `STRIPE_PRICE_PRO`.
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

ShipKernel verifies email with a **6-digit code** at `/auth/verify`, then a short onboarding at `/auth/onboarding`.

In **Supabase Dashboard → Authentication → Email Templates → Confirm signup**, use the token (not the link):

```html
<h2>Your ShipKernel code</h2>
<p>Enter this code to verify your email:</p>
<p style="font-size:24px;letter-spacing:6px;font-weight:700">{{ .Token }}</p>
<p>This code expires soon. If you didn’t sign up, ignore this email.</p>
```

Also enable **Confirm email** under Authentication → Providers → Email.

Optional: Authentication → Email → set OTP expiry (e.g. 3600s).

Do **not** rely on `{{ .ConfirmationURL }}` for ShipKernel signup — the app never needs the user to click a magic link.

Flow: Signup → email code → `/auth/verify` → `/auth/onboarding` → `/app`.

## 7. Templates

`/templates` and **New Project** seed real multifile VFS workspaces from `src/lib/templates.ts` (not prompt-only stubs).
