import { useEffect, useState } from "react";
import { Loader2, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  adminFetch,
  formatWhen,
  planBadgeClass,
  statusBadgeClass,
  type AdminUserDetail,
} from "./admin-api";
import {
  FREE_WELCOME_CREDITS,
  PRO_MONTHLY_CREDITS,
  PRO_PRICE_LABEL,
} from "@/lib/billing";

const PLAN_BLURBS: Record<string, string> = {
  free: `${FREE_WELCOME_CREDITS} welcome platform credits · BYOK unlimited`,
  pro: `${PRO_MONTHLY_CREDITS} credits / cycle · ${PRO_PRICE_LABEL}/mo Stripe`,
  byok: "Personal keys · platform credits not spent while BYOK active",
};

type Props = {
  userId: string | null;
  onClose: () => void;
  onChanged: () => void;
};

export function UserDetailSheet({ userId, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState("free");
  const [creditsBalance, setCreditsBalance] = useState("0");
  const [creditsDelta, setCreditsDelta] = useState("5");
  const [subStatus, setSubStatus] = useState("");
  const [reason, setReason] = useState("admin_adjust");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void adminFetch<AdminUserDetail>(`/api/admin/user?id=${encodeURIComponent(userId)}`)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        setPlan(d.profile.plan || "free");
        setCreditsBalance(String(d.profile.credits_balance ?? 0));
        setSubStatus(d.profile.subscription_status || "");
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || "Failed to load user");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId) return null;

  const copy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const next = await adminFetch<AdminUserDetail & { ok: boolean }>(
        "/api/admin/user",
        {
          method: "PATCH",
          body: JSON.stringify({ id: userId, reason: reason.trim() || "admin_adjust", ...body }),
        }
      );
      setDetail(next);
      setPlan(next.profile.plan || "free");
      setCreditsBalance(String(next.profile.credits_balance ?? 0));
      setSubStatus(next.profile.subscription_status || "");
      toast.success("Updated");
      onChanged();
    } catch (e: any) {
      toast.error("Update failed", { description: e?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close overlay"
        className="fixed inset-0 z-40 bg-black/60 md:bg-black/40"
        onClick={onClose}
      />
      <aside
        className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a] border-white/10 md:inset-y-0 md:left-auto md:right-0 md:w-[440px] md:border-l"
        role="dialog"
        aria-modal="true"
      >
        <div className="shrink-0 flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold truncate">
              {detail?.profile.email || "User"}
            </h2>
            <p className="text-[11px] text-white/35 font-mono truncate">{userId}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="shrink-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-white/40">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          )}
          {error && <p className="text-sm text-red-300/90">{error}</p>}

          {detail && (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                <span
                  className={`rounded-md border px-2 py-1 uppercase tracking-wide ${planBadgeClass(
                    detail.profile.plan
                  )}`}
                >
                  {detail.profile.plan}
                </span>
                <span
                  className={`rounded-md border px-2 py-1 ${statusBadgeClass(
                    detail.profile.subscription_status
                  )}`}
                >
                  {detail.profile.subscription_status || "no sub"}
                </span>
                {detail.auth.isBanned && (
                  <span className="rounded-md border border-red-500/40 bg-red-500/15 px-2 py-1 text-red-200">
                    Banned
                  </span>
                )}
              </div>

              <p className="text-xs text-white/45 leading-relaxed">
                {PLAN_BLURBS[detail.profile.plan] || PLAN_BLURBS.free}
              </p>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  className="text-xs"
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Grant Pro pack to ${detail.profile.email}? Sets plan=pro and ${PRO_MONTHLY_CREDITS} credits.`
                      )
                    )
                      return;
                    void patch({ grant_pro_pack: true });
                  }}
                >
                  Grant Pro pack
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  className="text-xs"
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Reset credits to ${FREE_WELCOME_CREDITS} welcome for ${detail.profile.email}?`
                      )
                    )
                      return;
                    void patch({ reset_welcome_credits: true });
                  }}
                >
                  Reset welcome credits
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  className="text-xs"
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const res = await adminFetch<{
                        ok: boolean;
                        result: string;
                        stripeStatus?: string;
                      }>("/api/admin/stripe-sync", {
                        method: "POST",
                        body: JSON.stringify({ id: userId }),
                      });
                      toast.success(
                        res.result === "synced"
                          ? `Stripe synced (${res.stripeStatus || "ok"})`
                          : "No Stripe subscription found"
                      );
                      onChanged();
                      const d = await adminFetch<AdminUserDetail>(
                        `/api/admin/user?id=${encodeURIComponent(userId)}`
                      );
                      setDetail(d);
                      setPlan(d.profile.plan || "free");
                      setCreditsBalance(String(d.profile.credits_balance ?? 0));
                      setSubStatus(d.profile.subscription_status || "");
                    } catch (e: any) {
                      toast.error("Stripe sync failed", {
                        description: e?.message,
                      });
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Sync Stripe
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  className="text-xs border-white/15"
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Clear Stripe IDs/status for ${detail.profile.email}? Does not cancel in Stripe Dashboard.`
                      )
                    )
                      return;
                    void patch({ clear_stripe: true });
                  }}
                >
                  Clear Stripe fields
                </Button>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[10px] uppercase text-white/35">Credits</dt>
                  <dd className="tabular-nums font-medium">{detail.profile.credits_balance}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-white/35">Lifetime used</dt>
                  <dd className="tabular-nums font-medium">
                    {detail.profile.credits_lifetime_used}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-white/35">Projects</dt>
                  <dd className="tabular-nums font-medium">{detail.projectCount}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-white/35">Period end</dt>
                  <dd className="text-xs">{formatWhen(detail.profile.current_period_end)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[10px] uppercase text-white/35">Last sign-in</dt>
                  <dd className="text-xs">{formatWhen(detail.auth.lastSignInAt)}</dd>
                </div>
              </dl>

              <div className="space-y-2">
                <h3 className="text-[10px] uppercase tracking-wider text-white/35">Stripe</h3>
                {[
                  ["Customer", detail.profile.stripe_customer_id],
                  ["Subscription", detail.profile.stripe_subscription_id],
                ].map(([label, val]) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 text-xs font-mono text-white/50"
                  >
                    <span className="text-white/30 w-24 shrink-0">{label}</span>
                    <span className="truncate flex-1">{val || "—"}</span>
                    {val ? (
                      <button
                        type="button"
                        className="shrink-0 text-white/40 hover:text-white"
                        onClick={() => copy(String(val), label)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="text-[10px] uppercase tracking-wider text-white/35">Projects</h3>
                <ul className="space-y-1 max-h-28 overflow-y-auto text-xs">
                  {(detail.projects || []).map((p) => (
                    <li
                      key={p.id}
                      className="flex justify-between gap-2 border-b border-white/5 py-1.5"
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="text-white/30 shrink-0">{formatWhen(p.updated_at)}</span>
                    </li>
                  ))}
                  {!detail.projects?.length && (
                    <li className="text-white/30">No projects</li>
                  )}
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-[10px] uppercase tracking-wider text-white/35">Usage</h3>
                <ul className="space-y-1 max-h-40 overflow-y-auto text-xs font-mono text-white/50">
                  {(detail.recentUsage || []).map((u) => (
                    <li
                      key={u.id}
                      className="flex justify-between gap-2 border-b border-white/5 py-1"
                    >
                      <span className="truncate">
                        {u.kind} · {u.amount}
                        {u.kind === "admin_note" && u.meta && (u.meta as any).note
                          ? ` — ${String((u.meta as any).note).slice(0, 80)}`
                          : ""}
                      </span>
                      <span className="text-white/30 shrink-0">
                        {formatWhen(u.created_at)}
                      </span>
                    </li>
                  ))}
                  {!detail.recentUsage?.length && (
                    <li className="text-white/30">No usage events</li>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>

        {detail && (
          <div className="shrink-0 border-t border-white/10 bg-[#0a0a0a] px-4 py-3 space-y-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase text-white/35 block mb-1">Plan</label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full h-9 rounded-md border border-white/10 bg-white/[0.04] px-2 text-sm"
                >
                  <option value="free">free</option>
                  <option value="pro">pro</option>
                  <option value="byok">byok</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase text-white/35 block mb-1">
                  Sub status
                </label>
                <select
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value)}
                  className="w-full h-9 rounded-md border border-white/10 bg-white/[0.04] px-2 text-sm"
                >
                  <option value="">none</option>
                  <option value="active">active</option>
                  <option value="trialing">trialing</option>
                  <option value="past_due">past_due</option>
                  <option value="canceled">canceled</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase text-white/35 block mb-1">
                  Set credits
                </label>
                <Input
                  value={creditsBalance}
                  onChange={(e) => setCreditsBalance(e.target.value)}
                  className="bg-white/[0.04] border-white/10 h-9"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-white/35 block mb-1">
                  Delta
                </label>
                <Input
                  value={creditsDelta}
                  onChange={(e) => setCreditsDelta(e.target.value)}
                  className="bg-white/[0.04] border-white/10 h-9"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase text-white/35 block mb-1">Reason</label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-white/[0.04] border-white/10 h-9"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-white/35 block mb-1">
                Add note
              </label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Support note (audited)"
                className="bg-white/[0.04] border-white/10 h-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => {
                  const body: Record<string, unknown> = {};
                  if (plan !== detail.profile.plan) body.plan = plan;
                  const nextSub = subStatus || null;
                  if (nextSub !== (detail.profile.subscription_status || null)) {
                    body.subscription_status = nextSub;
                  }
                  const bal = Number(creditsBalance);
                  if (
                    Number.isFinite(bal) &&
                    Math.trunc(bal) !== Number(detail.profile.credits_balance ?? 0)
                  ) {
                    body.credits_balance = Math.trunc(bal);
                  }
                  if (note.trim()) body.note = note.trim();
                  if (!Object.keys(body).length) {
                    toast.message("Nothing to save");
                    return;
                  }
                  void patch(body).then(() => setNote(""));
                }}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save profile"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => void patch({ credits_delta: Number(creditsDelta) })}
              >
                Apply delta
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy || !note.trim()}
                onClick={() => {
                  void patch({ note: note.trim() }).then(() => setNote(""));
                }}
              >
                Save note
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() => {
                  const nextBan = !detail.auth.isBanned;
                  if (
                    !window.confirm(
                      nextBan
                        ? `Ban ${detail.profile.email}? They cannot sign in.`
                        : `Unban ${detail.profile.email}?`
                    )
                  ) {
                    return;
                  }
                  void patch({ ban: nextBan });
                }}
              >
                {detail.auth.isBanned ? "Unban" : "Ban"}
              </Button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
