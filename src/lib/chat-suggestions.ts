import { isSeedWorkspace } from "@/lib/vfs";

/**
 * Workspace-focused suggestion chips (Lovable pattern).
 * ZERO tokens — heuristics from current VFS only.
 * Labels = product language for enhancements / optimizations / feature buttresses.
 */

export type ChatSuggestion = {
  id: string;
  label: string;
  prompt: string;
  send?: boolean;
};

export type SuggestionContext = {
  vfs: Record<string, string>;
  previewError?: string;
  agentMode?: "plan" | "build";
  phase?: string;
  hasMoreWaves?: boolean;
};

const MAX = 8;

function pathsOf(vfs: Record<string, string>): string[] {
  return Object.keys(vfs);
}

function hasPath(vfs: Record<string, string>, re: RegExp): boolean {
  return pathsOf(vfs).some((p) => re.test(p));
}

function joinBodies(vfs: Record<string, string>, limit = 120_000): string {
  let used = 0;
  const chunks: string[] = [];
  for (const [path, content] of Object.entries(vfs)) {
    if (!/\.(tsx|ts|jsx|js|css)$/i.test(path)) continue;
    const slice = content.slice(0, 8000);
    if (used + slice.length > limit) break;
    chunks.push(slice);
    used += slice.length;
  }
  return chunks.join("\n");
}

function mentions(body: string, re: RegExp): boolean {
  return re.test(body);
}

/** Detect product surface from file names + light content scan */
function analyzeWorkspace(vfs: Record<string, string>) {
  const paths = pathsOf(vfs);
  const body = joinBodies(vfs);
  const pathStr = paths.join("\n");

  const modules = {
    auth:
      /auth|login|signup|sign-in|SignIn|signUp|onAuthStateChange/i.test(pathStr + body),
    cart: /\bcart\b|checkout|CartContext|useCart/i.test(pathStr + body),
    products: /product|catalog|collection|inventory|sku/i.test(pathStr + body),
    orders: /order|fulfillment|oms/i.test(pathStr + body),
    admin: /admin|dashboard|merchant/i.test(pathStr + body),
    customers: /customer|buyer|profile/i.test(pathStr + body),
    payments: /stripe|payment|checkout|billing/i.test(pathStr + body),
    supabase: /supabase|lib\/db|hasBackend|createClient/i.test(pathStr + body),
    schema: /schema\.sql/i.test(pathStr),
    settings: /settings|preferences/i.test(pathStr + body),
    search: /type=["']search["']|SearchInput|\bsearch\b.*filter|fuse\.js/i.test(body),
    dark: /dark:|data-theme|prefers-color-scheme|bg-zinc-950|bg-neutral-950/i.test(body),
    analytics: /analytics|chart|recharts|metrics|kpi/i.test(pathStr + body),
    discounts: /discount|coupon|promo|gift.?card/i.test(pathStr + body),
    shipping: /shipping|fulfillment|carrier|delivery/i.test(pathStr + body),
    reviews: /review|rating|testimonial/i.test(pathStr + body),
    wishlist: /wishlist|favorites/i.test(pathStr + body),
    notifications: /toast|notification|bell|inbox/i.test(pathStr + body),
    onboarding: /onboarding|empty.?state|GettingStarted/i.test(pathStr + body),
    i18n: /i18n|locale|useTranslation/i.test(pathStr + body),
    a11y: /aria-|role=["']|sr-only/i.test(body),
  };

  // Named pages/components for precise prompts
  const pageNames = paths
    .filter((p) => /pages?\/|components\//i.test(p))
    .map((p) => p.replace(/^.*\//, "").replace(/\.(tsx|jsx|ts|js)$/i, ""))
    .filter((n) => n && n !== "index" && n.length < 40)
    .slice(0, 12);

  const primary =
    modules.products && modules.cart
      ? "commerce"
      : modules.admin && modules.auth
        ? "saas"
        : modules.products
          ? "catalog"
          : modules.admin
            ? "ops"
            : "app";

  return { modules, pageNames, primary, pathCount: paths.length, body };
}

export function buildChatSuggestions(ctx: SuggestionContext): ChatSuggestion[] {
  const vfs = ctx.vfs || {};
  const out: ChatSuggestion[] = [];
  const add = (s: ChatSuggestion) => {
    if (out.length >= MAX) return;
    if (out.some((x) => x.id === s.id)) return;
    out.push(s);
  };

  // Runtime / procedure (still workspace-relevant)
  if (ctx.previewError?.trim()) {
    add({
      id: "fix",
      label: "Fix preview",
      prompt: `Fix this preview error surgically (minimal diffs, keep design): ${ctx.previewError.slice(0, 180)}`,
      send: true,
    });
  }

  if (ctx.phase === "awaiting_plan") {
    add({
      id: "approve",
      label: "Approve & build",
      prompt: "Approve and start building",
      send: true,
    });
    add({
      id: "tighten",
      label: "Tighten plan",
      prompt:
        "Revise the plan against the current workspace: prioritize hardening what already exists before new surfaces.",
    });
  }

  if (ctx.phase === "awaiting_continue") {
    add({
      id: "continue",
      label: "Continue",
      prompt: "Continue",
      send: true,
    });
    add({
      id: "pause",
      label: "Pause here",
      prompt: "Pause here",
      send: true,
    });
  }

  // Blank canvas — only workspace-bootstrap tips, not random product ideas
  if (isSeedWorkspace(vfs) || pathsOf(vfs).length <= 2) {
    add({
      id: "scaffold",
      label: "Scaffold from prompt",
      prompt:
        "Replace the blank canvas with a unique multifile app from my next message. Distinct brand, no generic AI layout, no ShipKernel tags.",
    });
    if (ctx.agentMode === "plan") {
      add({
        id: "plan-blank",
        label: "Plan first",
        prompt: "Plan the build against a blank workspace — waves, files, and risks. No code yet.",
      });
    }
    return out.slice(0, MAX);
  }

  const { modules: m, pageNames, primary } = analyzeWorkspace(vfs);
  const pagesHint = pageNames.length
    ? ` Existing modules: ${pageNames.slice(0, 6).join(", ")}.`
    : "";

  // —— Feature buttresses (premium depth on what already exists) ——
  if (m.products && !m.cart) {
    add({
      id: "buttress-cart",
      label: "Buttress: cart",
      prompt: `Add cart + checkout wired to the existing product/catalog surfaces.${pagesHint} Persist via lib/db (Supabase or localStorage). Match current visual system — no redesign.`,
    });
  }
  if (m.cart && !m.shipping) {
    add({
      id: "buttress-ship",
      label: "Shipping rates",
      prompt: `Add shipping method selection to checkout with sample rate tiers. Extend schema/db only as needed.${pagesHint} Keep existing cart UX.`,
    });
  }
  if (m.cart && !m.discounts) {
    add({
      id: "buttress-promo",
      label: "Promo codes",
      prompt: `Add promo/discount code support on cart/checkout with validation against sample codes in db.${pagesHint} Minimal UI chrome matching the brand.`,
    });
  }
  if (m.products && !mentions(joinBodies(vfs), /inventory|stockCount|stock_qty|\bsku\b/i)) {
    add({
      id: "buttress-inv",
      label: "Inventory",
      prompt: `Add inventory/stock fields to products and show low-stock states in admin/catalog.${pagesHint} Update schema.sql + db layer.`,
    });
  }
  if (m.products && !m.reviews) {
    add({
      id: "buttress-reviews",
      label: "Reviews",
      prompt: `Add product reviews/ratings on product detail, stored in db with local fallback.${pagesHint} Match typography and spacing.`,
    });
  }
  if (m.cart && !m.wishlist) {
    add({
      id: "buttress-wish",
      label: "Wishlist",
      prompt: `Add wishlist/save-for-later using the existing product model.${pagesHint} Persist in db/localStorage.`,
    });
  }
  if ((m.admin || m.products) && !m.orders) {
    add({
      id: "buttress-orders",
      label: "Order history",
      prompt: `Add orders list + detail (status timeline) for the commerce flow.${pagesHint} Wire schema + db; gate admin mutations behind auth if present.`,
    });
  }
  if (m.admin && !m.analytics) {
    add({
      id: "buttress-analytics",
      label: "Ops metrics",
      prompt: `Add a compact analytics strip on the admin/dashboard from existing entities (counts, recent activity) — no fake charts library beyond CSS/SVG.${pagesHint}`,
    });
  }
  if (m.auth && !m.settings) {
    add({
      id: "buttress-settings",
      label: "Account settings",
      prompt: `Add account/settings for the signed-in user (profile fields, sign out).${pagesHint} Use existing auth session.`,
    });
  }
  if (!m.auth && (m.admin || m.cart || m.orders)) {
    add({
      id: "buttress-auth",
      label: "Secure with auth",
      prompt: `Add email/password auth and protect admin/account routes. Update lib/supabase + schema RLS.${pagesHint} Preserve current IA.`,
    });
  }
  if (!m.supabase && (m.products || m.admin || m.cart)) {
    add({
      id: "buttress-backend",
      label: "Harden backend",
      prompt: `Ensure lib/supabase.ts, lib/db.ts (localStorage fallback), and supabase/schema.sql with RLS match the entities already in the UI.${pagesHint}`,
    });
  } else if (m.supabase && !m.schema) {
    add({
      id: "buttress-schema",
      label: "Add schema.sql",
      prompt: `Add supabase/schema.sql that accurately mirrors tables used by lib/db.ts, with indexes + RLS.`,
    });
  }

  // —— Optimizations / quality (workspace-scoped) ——
  add({
    id: "opt-a11y",
    label: "A11y pass",
    prompt: `Accessibility pass on primary screens${pagesHint}: labels, focus rings, keyboard nav, contrast. No visual redesign.`,
  });
  add({
    id: "opt-perf",
    label: "Perf pass",
    prompt: `Optimize this workspace: trim heavy re-renders, lazy route chunks where safe, compact lists. Do not change product behavior.${pagesHint}`,
  });
  add({
    id: "opt-empty",
    label: "Empty & loading",
    prompt: `Add polished empty states + loading skeletons on list/detail views that already exist.${pagesHint} On-brand copy only.`,
  });
  add({
    id: "opt-mobile",
    label: "Mobile polish",
    prompt: `Polish mobile layout for existing nav and primary pages${pagesHint}. Breakpoints under 640px; keep desktop intact.`,
  });
  if (!m.dark) {
    add({
      id: "opt-theme",
      label: "Theme refine",
      prompt: `Refine the visual system for uniqueness: distinctive type scale, color tokens, and surfaces. Ban purple-on-white AI defaults and “AI” badges/tags.${pagesHint}`,
    });
  } else {
    add({
      id: "opt-visual",
      label: "Visual uniqueness",
      prompt: `Raise visual uniqueness of the current UI — custom composition, typography, motion — without cloning common AI landing patterns. No “Built with AI” tags.${pagesHint}`,
    });
  }

  // Domain-specific premium buttress
  if (primary === "commerce") {
    add({
      id: "prem-commerce",
      label: "Premium checkout",
      prompt: `Upgrade checkout to a premium multi-step flow (contact → shipping → payment UI → review) using existing cart data.${pagesHint} Still local/demo-safe payments — no fake live charge APIs.`,
    });
  } else if (primary === "saas" || primary === "ops") {
    add({
      id: "prem-saas",
      label: "Roles & gates",
      prompt: `Add role-aware nav/gates (admin vs member) on top of existing auth/admin.${pagesHint} Extend schema minimally.`,
    });
  }

  if (ctx.agentMode === "plan") {
    add({
      id: "plan-next",
      label: "Plan next upgrade",
      prompt: `Plan the highest-leverage upgrade for this workspace only${pagesHint}. List files to touch and risks. No code.`,
    });
  }

  return out.slice(0, MAX);
}
