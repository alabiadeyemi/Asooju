import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield,
  Users,
  Folder,
  Zap,
  CreditCard,
  Loader2,
  LogOut,
  RefreshCw,
  LayoutDashboard,
  Search,
  ChevronLeft,
  ChevronRight,
  Activity,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  clearAdminSession,
  hasAdminSession,
  readAdminEmail,
} from "@/lib/admin-session";
import { toast } from "sonner";
import {
  adminFetch,
  formatWhen,
  planBadgeClass,
  statusBadgeClass,
  type AdminActivityEvent,
  type AdminProjectRow,
  type AdminStats,
  type AdminUserRow,
} from "./admin-api";
import { UserDetailSheet } from "./UserDetailSheet";
import { ProjectInspectSheet } from "./ProjectInspectSheet";

type Tab = "overview" | "users" | "subs" | "plans" | "activity" | "projects";

const TABS: Array<{ id: Tab; label: string; icon: typeof Users }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "subs", label: "Subs", icon: CreditCard },
  { id: "plans", label: "Plans", icon: Layers },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "projects", label: "Projects", icon: Folder },
];

function readHashTab(): Tab {
  const h = (window.location.hash || "").replace("#", "");
  if (
    h === "users" ||
    h === "subs" ||
    h === "projects" ||
    h === "overview" ||
    h === "plans" ||
    h === "activity"
  )
    return h;
  return "overview";
}

/**
 * Operator console — fixed chrome, scrollable main only.
 * Auth: ADMIN_EMAIL / ADMIN_PASSWORD session (not customer Auth password).
 */
export default function AdminPanel() {
  const navigate = useNavigate();
  const adminEmail = readAdminEmail();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>(() =>
    typeof window !== "undefined" ? readHashTab() : "overview"
  );
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [userQ, setUserQ] = useState("");
  const [userQDebounced, setUserQDebounced] = useState("");
  const [userPlan, setUserPlan] = useState("");
  const [userStatus, setUserStatus] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [projQ, setProjQ] = useState("");
  const [projQDebounced, setProjQDebounced] = useState("");
  const [projPage, setProjPage] = useState(1);
  const [projects, setProjects] = useState<AdminProjectRow[]>([]);
  const [projTotal, setProjTotal] = useState(0);
  const [projLoading, setProjLoading] = useState(false);
  const [projError, setProjError] = useState<string | null>(null);

  const [actKind, setActKind] = useState("");
  const [actPage, setActPage] = useState(1);
  const [events, setEvents] = useState<AdminActivityEvent[]>([]);
  const [actTotal, setActTotal] = useState(0);
  const [actLoading, setActLoading] = useState(false);
  const [actError, setActError] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [health, setHealth] = useState<{
    ok: boolean;
    checks: Record<string, { ok: boolean; detail?: string }>;
    appOrigin?: string | null;
  } | null>(null);

  const limit = 25;

  useEffect(() => {
    if (!hasAdminSession()) {
      navigate("/admin/login", { replace: true });
      return;
    }
    setReady(true);
  }, [navigate]);

  useEffect(() => {
    window.location.hash = tab;
  }, [tab]);

  useEffect(() => {
    const t = window.setTimeout(() => setUserQDebounced(userQ), 300);
    return () => window.clearTimeout(t);
  }, [userQ]);

  useEffect(() => {
    const t = window.setTimeout(() => setProjQDebounced(projQ), 300);
    return () => window.clearTimeout(t);
  }, [projQ]);

  const goTab = (next: Tab, opts?: { status?: string; plan?: string }) => {
    if (opts?.status !== undefined) setUserStatus(opts.status);
    if (opts?.plan !== undefined) setUserPlan(opts.plan);
    if (next === "users" || next === "subs") setUserPage(1);
    setTab(next);
  };

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const [s, h] = await Promise.all([
        adminFetch<AdminStats>("/api/admin/stats"),
        adminFetch<{
          ok: boolean;
          checks: Record<string, { ok: boolean; detail?: string }>;
          appOrigin?: string | null;
        }>("/api/admin/health").catch(() => null),
      ]);
      setStats(s);
      if (h) setHealth(h);
    } catch (e: any) {
      setStatsError(e?.message || "Failed to load stats");
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(userPage));
      params.set("limit", String(limit));
      if (userQDebounced.trim()) params.set("q", userQDebounced.trim());
      if (userPlan) params.set("plan", userPlan);
      const status =
        tab === "subs" && !userStatus ? "subscribed" : userStatus;
      if (status) params.set("status", status);
      const data = await adminFetch<{
        users: AdminUserRow[];
        total: number;
      }>(`/api/admin/users?${params}`);
      setUsers(data.users || []);
      setUserTotal(data.total ?? 0);
    } catch (e: any) {
      setUsersError(e?.message || "Failed to load users");
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [userPage, userQDebounced, userPlan, userStatus, tab]);

  const loadProjects = useCallback(async () => {
    setProjLoading(true);
    setProjError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(projPage));
      params.set("limit", String(limit));
      if (projQDebounced.trim()) params.set("q", projQDebounced.trim());
      const data = await adminFetch<{
        projects: AdminProjectRow[];
        total: number;
      }>(`/api/admin/projects?${params}`);
      setProjects(data.projects || []);
      setProjTotal(data.total ?? 0);
    } catch (e: any) {
      setProjError(e?.message || "Failed to load projects");
      setProjects([]);
    } finally {
      setProjLoading(false);
    }
  }, [projPage, projQDebounced]);

  const loadActivity = useCallback(async () => {
    setActLoading(true);
    setActError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(actPage));
      params.set("limit", String(40));
      if (actKind) params.set("kind", actKind);
      const data = await adminFetch<{
        events: AdminActivityEvent[];
        total: number;
      }>(`/api/admin/activity?${params}`);
      setEvents(data.events || []);
      setActTotal(data.total ?? 0);
    } catch (e: any) {
      setActError(e?.message || "Failed to load activity");
      setEvents([]);
    } finally {
      setActLoading(false);
    }
  }, [actPage, actKind]);

  useEffect(() => {
    if (ready) void loadStats();
  }, [ready, loadStats]);

  useEffect(() => {
    if (!ready) return;
    if (tab === "users" || tab === "subs") void loadUsers();
  }, [ready, tab, loadUsers]);

  useEffect(() => {
    if (ready && tab === "projects") void loadProjects();
  }, [ready, tab, loadProjects]);

  useEffect(() => {
    if (ready && tab === "activity") void loadActivity();
  }, [ready, tab, loadActivity]);

  const refreshAll = async () => {
    await loadStats();
    if (tab === "users" || tab === "subs") await loadUsers();
    if (tab === "projects") await loadProjects();
    if (tab === "activity") await loadActivity();
    toast.success("Refreshed");
  };

  const signOutAdmin = () => {
    clearAdminSession();
    navigate("/admin/login", { replace: true });
  };

  const userPageCount = Math.max(1, Math.ceil(userTotal / limit));
  const projPageCount = Math.max(1, Math.ceil(projTotal / limit));
  const actPageCount = Math.max(1, Math.ceil(actTotal / 40));

  const kpi = useMemo(
    () => [
      {
        label: "Users",
        value: stats?.users ?? 0,
        icon: Users,
        onClick: () => goTab("users", { status: "", plan: "" }),
      },
      {
        label: "Projects",
        value: stats?.projects ?? 0,
        icon: Folder,
        onClick: () => goTab("projects"),
      },
      {
        label: "Spend 24h",
        value: stats?.spend24h ?? 0,
        icon: Zap,
        onClick: () => goTab("activity"),
      },
      {
        label: "Active subs",
        value: stats?.activeSubs ?? 0,
        icon: CreditCard,
        onClick: () => goTab("subs", { status: "active" }),
      },
      {
        label: "Credits out",
        value: stats?.creditsOutstanding ?? 0,
        icon: Layers,
        onClick: () => goTab("plans"),
      },
      {
        label: "Low credits",
        value: stats?.lowCreditUsers ?? 0,
        icon: Activity,
        onClick: () => goTab("users", { status: "", plan: "" }),
      },
    ],
    [stats]
  );

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-[#050505] text-white flex flex-col overflow-hidden">
      {/* Fixed top bar */}
      <header className="shrink-0 z-30 border-b border-white/10 px-3 sm:px-5 h-14 flex items-center justify-between gap-3 bg-[#050505]">
        <div className="flex items-center gap-2.5 min-w-0">
          <Shield className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-semibold tracking-tight truncate">
              ShipKernel Admin
            </h1>
            <p className="text-[10px] text-white/35 truncate hidden sm:block">
              {adminEmail || "operator"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-white/50 px-2"
            onClick={() => void refreshAll()}
          >
            <RefreshCw className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button asChild variant="ghost" size="sm" className="text-white/50 px-2 hidden sm:inline-flex">
            <Link to="/app">Builder</Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-white/50 px-2"
            onClick={signOutAdmin}
          >
            <LogOut className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Fixed left nav — desktop */}
        <nav className="hidden md:flex w-48 shrink-0 flex-col border-r border-white/10 bg-[#070707] py-3 overflow-y-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => goTab(t.id)}
              className={`mx-2 mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-left transition-colors ${
                tab === t.id
                  ? "bg-white/10 text-white"
                  : "text-white/45 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <t.icon className="w-4 h-4 shrink-0" />
              {t.label}
            </button>
          ))}
        </nav>

        {/* Scrollable main only */}
        <main className="flex-1 min-w-0 overflow-y-auto overscroll-contain pb-20 md:pb-6">
          <div className="max-w-6xl mx-auto p-3 sm:p-5 space-y-5">
            {tab === "overview" && (
              <section className="space-y-5">
                <h2 className="text-xs font-medium text-white/45 uppercase tracking-wider">
                  Overview
                </h2>
                {statsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-white/40">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                  </div>
                ) : statsError ? (
                  <p className="text-sm text-red-300/90">{statsError}</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      {kpi.map((c) => (
                        <button
                          key={c.label}
                          type="button"
                          onClick={c.onClick}
                          className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="flex items-center gap-2 text-white/40 mb-2">
                            <c.icon className="h-4 w-4" />
                            <span className="text-xs">{c.label}</span>
                          </div>
                          <div className="text-2xl font-bold tabular-nums">{c.value}</div>
                        </button>
                      ))}
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/50 space-y-2">
                      <p>
                        Plans — free: {stats?.plans?.free || 0} · pro:{" "}
                        {stats?.plans?.pro || 0} · byok: {stats?.plans?.byok || 0}
                      </p>
                      <p>
                        Stripe — with sub id: {stats?.withStripeSub ?? 0} · trialing:{" "}
                        {stats?.trialing ?? 0} · canceled: {stats?.canceled ?? 0}
                      </p>
                      <p>
                        Credits — outstanding: {stats?.creditsOutstanding ?? 0} · lifetime
                        burn: {stats?.creditsLifetimeBurn ?? 0} · spend 7d:{" "}
                        {stats?.spend7d ?? 0} · new users 7d: {stats?.newUsers7d ?? 0}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-white/10 overflow-hidden">
                        <div className="px-3 py-2.5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/40">
                          Recent signups
                        </div>
                        <ul className="divide-y divide-white/5">
                          {(stats?.recentSignups || []).map((u) => (
                            <li key={u.id}>
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2.5 hover:bg-white/[0.03] flex justify-between gap-2 text-sm"
                                onClick={() => setSelectedUserId(u.id)}
                              >
                                <span className="truncate">{u.email || u.id}</span>
                                <span
                                  className={`shrink-0 text-[10px] rounded border px-1.5 py-0.5 ${planBadgeClass(
                                    u.plan
                                  )}`}
                                >
                                  {u.plan}
                                </span>
                              </button>
                            </li>
                          ))}
                          {!stats?.recentSignups?.length && (
                            <li className="px-3 py-6 text-center text-white/30 text-sm">
                              No signups yet
                            </li>
                          )}
                        </ul>
                      </div>
                      <div className="rounded-xl border border-white/10 overflow-hidden">
                        <div className="px-3 py-2.5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/40">
                          Low credit (≤1)
                        </div>
                        <ul className="divide-y divide-white/5">
                          {(stats?.lowCreditSample || []).map((u) => (
                            <li key={u.id}>
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2.5 hover:bg-white/[0.03] flex justify-between gap-2 text-sm"
                                onClick={() => setSelectedUserId(u.id)}
                              >
                                <span className="truncate">{u.email || u.id}</span>
                                <span className="tabular-nums text-white/45 shrink-0">
                                  {u.credits_balance}
                                </span>
                              </button>
                            </li>
                          ))}
                          {!stats?.lowCreditSample?.length && (
                            <li className="px-3 py-6 text-center text-white/30 text-sm">
                              Nobody low on credits
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-[10px] uppercase tracking-wider text-white/40">
                          System health
                        </h3>
                        <span
                          className={`text-[10px] rounded border px-1.5 py-0.5 ${
                            health?.ok
                              ? "border-emerald-500/30 text-emerald-300"
                              : "border-amber-500/30 text-amber-200"
                          }`}
                        >
                          {health ? (health.ok ? "all ok" : "issues") : "—"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        {Object.entries(health?.checks || {}).map(([k, v]) => (
                          <div
                            key={k}
                            className="rounded-lg border border-white/5 px-2 py-1.5 flex items-center justify-between gap-2"
                          >
                            <span className="text-white/45 truncate">{k}</span>
                            <span className={v.ok ? "text-emerald-400" : "text-amber-300"}>
                              {v.ok ? "ok" : "no"}
                            </span>
                          </div>
                        ))}
                      </div>
                      {health?.appOrigin ? (
                        <p className="text-[11px] text-white/30">Origin: {health.appOrigin}</p>
                      ) : null}
                    </div>

                  </>
                )}
              </section>
            )}

            {tab === "plans" && (
              <section className="space-y-4">
                <h2 className="text-xs font-medium text-white/45 uppercase tracking-wider">
                  Plan catalog
                </h2>
                <p className="text-sm text-white/40">
                  Product entitlements (read-only reference). Change a user&apos;s plan from
                  their detail sheet.
                </p>
                {statsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-white/40">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(["free", "pro", "byok"] as const).map((id) => {
                      const cat = stats?.planCatalog?.[id];
                      const count = stats?.plans?.[id] || 0;
                      return (
                        <div
                          key={id}
                          className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-xs uppercase tracking-wide rounded border px-2 py-0.5 ${planBadgeClass(
                                id
                              )}`}
                            >
                              {cat?.label || id}
                            </span>
                            <button
                              type="button"
                              className="text-xs text-white/40 hover:text-white tabular-nums"
                              onClick={() => goTab("users", { plan: id, status: "" })}
                            >
                              {count} users
                            </button>
                          </div>
                          <p className="text-2xl font-bold tracking-tight">
                            {cat?.priceUsd
                              ? `$${cat.priceUsd}`
                              : id === "byok"
                                ? "Keys"
                                : "Free"}
                            {cat?.priceUsd ? (
                              <span className="text-sm font-normal text-white/35">/mo</span>
                            ) : null}
                          </p>
                          <ul className="space-y-1.5 text-xs text-white/50">
                            {(cat?.features || []).map((f) => (
                              <li key={f}>· {f}</li>
                            ))}
                          </ul>
                          <p className="text-[11px] text-white/30">
                            Welcome: {cat?.welcomeCredits ?? 0} · Monthly:{" "}
                            {cat?.monthlyCredits ?? 0}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {tab === "activity" && (
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end gap-2 justify-between">
                  <h2 className="text-xs font-medium text-white/45 uppercase tracking-wider">
                    Activity
                  </h2>
                  <p className="text-[11px] text-white/30 tabular-nums">{actTotal} events</p>
                </div>
                <select
                  value={actKind}
                  onChange={(e) => {
                    setActKind(e.target.value);
                    setActPage(1);
                  }}
                  className="h-10 rounded-md border border-white/10 bg-white/[0.04] px-2 text-sm sm:w-56"
                >
                  <option value="">All kinds</option>
                  <option value="credit_spend">credit_spend</option>
                  <option value="admin_grant">admin_grant</option>
                  <option value="admin_adjust">admin_adjust</option>
                  <option value="admin_plan_change">admin_plan_change</option>
                  <option value="admin_grant_pro_pack">admin_grant_pro_pack</option>
                  <option value="admin_stripe_sync">admin_stripe_sync</option>
                  <option value="admin_note">admin_note</option>
                  <option value="admin_project_delete">admin_project_delete</option>
                  <option value="admin_ban">admin_ban</option>
                </select>
                {actLoading ? (
                  <div className="flex items-center gap-2 text-sm text-white/40">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                  </div>
                ) : actError ? (
                  <p className="text-sm text-red-300/90">{actError}</p>
                ) : (
                  <>
                    <div className="rounded-xl border border-white/10 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-left text-sm">
                          <thead className="sticky top-0 bg-[#0c0c0c] text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
                            <tr>
                              <th className="px-3 py-2.5 font-medium">When</th>
                              <th className="px-3 py-2.5 font-medium">User</th>
                              <th className="px-3 py-2.5 font-medium">Kind</th>
                              <th className="px-3 py-2.5 font-medium">Amt</th>
                              <th className="px-3 py-2.5 font-medium">Plan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {events.map((ev) => (
                              <tr
                                key={ev.id}
                                className="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer"
                                onClick={() => setSelectedUserId(ev.user_id)}
                              >
                                <td className="px-3 py-2.5 text-xs text-white/40 whitespace-nowrap">
                                  {formatWhen(ev.created_at)}
                                </td>
                                <td className="px-3 py-2.5 truncate max-w-[180px]">
                                  {ev.email || ev.user_id}
                                </td>
                                <td className="px-3 py-2.5 font-mono text-xs">{ev.kind}</td>
                                <td className="px-3 py-2.5 tabular-nums">{ev.amount}</td>
                                <td className="px-3 py-2.5">
                                  <span
                                    className={`text-[10px] rounded border px-1.5 py-0.5 ${planBadgeClass(
                                      ev.plan
                                    )}`}
                                  >
                                    {ev.plan || "—"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                            {!events.length && (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="px-3 py-8 text-center text-white/35"
                                >
                                  No events
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <Pager
                      page={actPage}
                      pageCount={actPageCount}
                      onPrev={() => setActPage((p) => Math.max(1, p - 1))}
                      onNext={() => setActPage((p) => Math.min(actPageCount, p + 1))}
                    />
                  </>
                )}
              </section>
            )}

            {(tab === "users" || tab === "subs") && (
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end gap-2 justify-between">
                  <h2 className="text-xs font-medium text-white/45 uppercase tracking-wider">
                    {tab === "subs" ? "Subscriptions" : "Users"}
                  </h2>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] text-white/30 tabular-nums">
                      {userTotal} total
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-white/50 h-8 text-[11px]"
                      onClick={() => {
                        const header = [
                          "id",
                          "email",
                          "plan",
                          "credits_balance",
                          "credits_lifetime_used",
                          "subscription_status",
                          "stripe_customer_id",
                          "projectCount",
                          "created_at",
                        ];
                        const rows = users.map((u) =>
                          [
                            u.id,
                            u.email || "",
                            u.plan,
                            u.credits_balance,
                            u.credits_lifetime_used,
                            u.subscription_status || "",
                            u.stripe_customer_id || "",
                            u.projectCount,
                            u.created_at,
                          ]
                            .map((c) => `"${String(c).replace(/"/g, '""')}"`)
                            .join(",")
                        );
                        const csv = [header.join(","), ...rows].join("\n");
                        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `shipkernel-users-page-${userPage}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success("Exported current page");
                      }}
                    >
                      Export CSV
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                    <Input
                      value={userQ}
                      onChange={(e) => {
                        setUserQ(e.target.value);
                        setUserPage(1);
                      }}
                      placeholder="Search email…"
                      className="pl-8 bg-white/[0.04] border-white/10"
                    />
                  </div>
                  <select
                    value={userPlan}
                    onChange={(e) => {
                      setUserPlan(e.target.value);
                      setUserPage(1);
                    }}
                    className="h-10 rounded-md border border-white/10 bg-white/[0.04] px-2 text-sm sm:w-28"
                  >
                    <option value="">All plans</option>
                    <option value="free">free</option>
                    <option value="pro">pro</option>
                    <option value="byok">byok</option>
                  </select>
                  <select
                    value={userStatus}
                    onChange={(e) => {
                      setUserStatus(e.target.value);
                      setUserPage(1);
                    }}
                    className="h-10 rounded-md border border-white/10 bg-white/[0.04] px-2 text-sm sm:w-36"
                  >
                    <option value="">
                      {tab === "subs" ? "Any with Stripe sub" : "Any status"}
                    </option>
                    <option value="active">active</option>
                    <option value="trialing">trialing</option>
                    <option value="past_due">past_due</option>
                    <option value="canceled">canceled</option>
                    <option value="subscribed">has sub id</option>
                    <option value="none">no sub</option>
                  </select>
                </div>

                {usersLoading ? (
                  <div className="flex items-center gap-2 text-sm text-white/40">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                  </div>
                ) : usersError ? (
                  <p className="text-sm text-red-300/90">{usersError}</p>
                ) : (
                  <>
                    <div className="rounded-xl border border-white/10 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-left text-sm">
                          <thead className="sticky top-0 bg-[#0c0c0c] text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
                            <tr>
                              <th className="px-3 py-2.5 font-medium">Email</th>
                              <th className="px-3 py-2.5 font-medium">Plan</th>
                              <th className="px-3 py-2.5 font-medium">Credits</th>
                              <th className="px-3 py-2.5 font-medium">Sub</th>
                              <th className="px-3 py-2.5 font-medium">Projects</th>
                              <th className="px-3 py-2.5 font-medium">Joined</th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.map((u) => (
                              <tr
                                key={u.id}
                                className="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer"
                                onClick={() => setSelectedUserId(u.id)}
                              >
                                <td className="px-3 py-2.5 truncate max-w-[200px]">
                                  {u.email || "—"}
                                </td>
                                <td className="px-3 py-2.5">
                                  <span
                                    className={`inline-block rounded border px-1.5 py-0.5 text-[10px] uppercase ${planBadgeClass(
                                      u.plan
                                    )}`}
                                  >
                                    {u.plan}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 tabular-nums">
                                  {u.credits_balance}
                                </td>
                                <td className="px-3 py-2.5">
                                  <span
                                    className={`inline-block rounded border px-1.5 py-0.5 text-[10px] ${statusBadgeClass(
                                      u.subscription_status
                                    )}`}
                                  >
                                    {u.subscription_status || "—"}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 tabular-nums">
                                  {u.projectCount}
                                </td>
                                <td className="px-3 py-2.5 text-xs text-white/40 whitespace-nowrap">
                                  {formatWhen(u.created_at)}
                                </td>
                              </tr>
                            ))}
                            {!users.length && (
                              <tr>
                                <td
                                  colSpan={6}
                                  className="px-3 py-8 text-center text-white/35"
                                >
                                  No users match
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <Pager
                      page={userPage}
                      pageCount={userPageCount}
                      onPrev={() => setUserPage((p) => Math.max(1, p - 1))}
                      onNext={() =>
                        setUserPage((p) => Math.min(userPageCount, p + 1))
                      }
                    />
                  </>
                )}
              </section>
            )}

            {tab === "projects" && (
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end gap-2 justify-between">
                  <h2 className="text-xs font-medium text-white/45 uppercase tracking-wider">
                    Projects
                  </h2>
                  <p className="text-[11px] text-white/30 tabular-nums">
                    {projTotal} total
                  </p>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <Input
                    value={projQ}
                    onChange={(e) => {
                      setProjQ(e.target.value);
                      setProjPage(1);
                    }}
                    placeholder="Search project name…"
                    className="pl-8 bg-white/[0.04] border-white/10"
                  />
                </div>
                {projLoading ? (
                  <div className="flex items-center gap-2 text-sm text-white/40">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                  </div>
                ) : projError ? (
                  <p className="text-sm text-red-300/90">{projError}</p>
                ) : (
                  <>
                    <div className="rounded-xl border border-white/10 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[560px] text-left text-sm">
                          <thead className="sticky top-0 bg-[#0c0c0c] text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
                            <tr>
                              <th className="px-3 py-2.5 font-medium">Name</th>
                              <th className="px-3 py-2.5 font-medium">Owner</th>
                              <th className="px-3 py-2.5 font-medium">Updated</th>
                            </tr>
                          </thead>
                          <tbody>
                            {projects.map((p) => (
                              <tr
                                key={p.id}
                                className="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer"
                                onClick={() => setSelectedProjectId(p.id)}
                              >
                                <td className="px-3 py-2.5 truncate max-w-[220px]">
                                  {p.name}
                                </td>
                                <td className="px-3 py-2.5 truncate max-w-[200px] text-white/60">
                                  {p.ownerEmail || p.user_id}
                                </td>
                                <td className="px-3 py-2.5 text-xs text-white/40 whitespace-nowrap">
                                  {formatWhen(p.updated_at)}
                                </td>
                              </tr>
                            ))}
                            {!projects.length && (
                              <tr>
                                <td
                                  colSpan={3}
                                  className="px-3 py-8 text-center text-white/35"
                                >
                                  No projects
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <Pager
                      page={projPage}
                      pageCount={projPageCount}
                      onPrev={() => setProjPage((p) => Math.max(1, p - 1))}
                      onNext={() =>
                        setProjPage((p) => Math.min(projPageCount, p + 1))
                      }
                    />
                  </>
                )}
              </section>
            )}
          </div>
        </main>
      </div>

      {/* Fixed bottom tabs — mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-white/10 bg-[#070707]/[max(0.35rem,env(safe-area-inset-bottom))]">
        <div className="flex overflow-x-auto h-14">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => goTab(t.id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] min-w-[4.5rem] px-2 shrink-0 ${
                tab === t.id ? "text-white" : "text-white/40"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <UserDetailSheet
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onChanged={() => {
          void loadStats();
          if (tab === "users" || tab === "subs") void loadUsers();
          if (tab === "activity") void loadActivity();
        }}
      />
      <ProjectInspectSheet
        projectId={selectedProjectId}
        onClose={() => setSelectedProjectId(null)}
        onDeleted={() => {
          void loadStats();
          if (tab === "projects") void loadProjects();
        }}
        onOpenOwner={(uid) => {
          setSelectedProjectId(null);
          setSelectedUserId(uid);
        }}
      />
    </div>
  );
}

function Pager({
  page,
  pageCount,
  onPrev,
  onNext,
}: {
  page: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-white/40">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={page <= 1}
        onClick={onPrev}
        className="text-white/50"
      >
        <ChevronLeft className="w-4 h-4 mr-1" /> Prev
      </Button>
      <span className="tabular-nums">
        Page {page} / {pageCount}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={page >= pageCount}
        onClick={onNext}
        className="text-white/50"
      >
        Next <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}
