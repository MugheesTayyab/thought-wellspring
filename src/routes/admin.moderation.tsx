import { useEffect, useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/client/lib/supabase";
import { authHeaders } from "@/client/lib/auth-headers";
import { useAuth } from "@/client/stores/auth-context";
import {
  apiFetchModerationDashboard,
  apiExecutePostModeration,
  apiExecuteEchoModeration,
  apiFetchModerationAuditLog,
  type DashboardResponseData,
} from "@/routes/api/admin.moderation";
import type { ModerationQueueItem, ModerationAuditEntry } from "@/server/db/moderation";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  Trash2,
  RotateCcw,
  RefreshCw,
  LogOut,
  MessageCircle,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  X,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/admin/moderation")({
  head: () => ({
    meta: [
      { title: "Trust & Safety Engine | BajiHears" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminModerationPage,
});

type TabType = "unresolved" | "posts" | "echoes" | "auto_flagged" | "audit";

interface ActionModalState {
  item: ModerationQueueItem;
  action: "approve" | "hide" | "reject" | "restore" | "dismiss_reports";
}

function AdminModerationPage() {
  const { signInWithGoogle } = useAuth();
  const [sessionUser, setSessionUser] = useState<{ id: string; email: string | null } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardResponseData | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("unresolved");
  const [auditEntries, setAuditEntries] = useState<ModerationAuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [actionModal, setActionModal] = useState<ActionModalState | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Check Supabase session
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          setSessionUser({
            id: data.session.user.id,
            email: data.session.user.email ?? null,
          });
        } else {
          setSessionUser(null);
        }
      } catch (err) {
        console.error("[AdminAuth] Session check failed", err);
      } finally {
        setAuthChecking(false);
      }
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSessionUser({
          id: session.user.id,
          email: session.user.email ?? null,
        });
      } else {
        setSessionUser(null);
        setDashboardData(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch dashboard data once session is ready
  const loadDashboard = async () => {
    if (!sessionUser) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeaders();
      const res = await apiFetchModerationDashboard({ headers });
      if (!res.ok) {
        setError(res.error.message || "Failed to load moderation queue");
      } else {
        setDashboardData(res.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error loading moderation queue");
    } finally {
      setLoading(false);
    }
  };

  // Fetch audit log
  const loadAuditLog = async () => {
    setAuditLoading(true);
    try {
      const headers = await authHeaders();
      const res = await apiFetchModerationAuditLog({ headers, data: { limit: 50 } });
      if (res.ok) {
        setAuditEntries(res.data.entries);
      }
    } catch (err) {
      console.error("[AdminAudit] Failed to load audit log", err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (sessionUser) {
      void loadDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUser]);

  useEffect(() => {
    if (activeTab === "audit" && sessionUser) {
      void loadAuditLog();
    }
  }, [activeTab, sessionUser]);

  const handleSignInWithGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to initiate sign-in");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSessionUser(null);
    setDashboardData(null);
  };

  const openActionModal = (
    item: ModerationQueueItem,
    action: "approve" | "hide" | "reject" | "restore" | "dismiss_reports",
  ) => {
    const defaultReasons: Record<string, string> = {
      approve: "Content meets community safety standards",
      hide: "Temporarily quarantined pending safety review",
      reject: "Violates community guidelines: Harassment, privacy, or harmful content",
      restore: "Content reviewed and restored to public view",
      dismiss_reports: "Reports reviewed and dismissed as benign or ungrounded",
    };
    setActionReason(defaultReasons[action] || "Manual moderator action");
    setActionModal({ item, action });
  };

  const handleExecuteAction = async () => {
    if (!actionModal) return;
    setActionSubmitting(true);
    try {
      const headers = await authHeaders();
      const { item, action } = actionModal;

      let res;
      if (item.type === "post") {
        res = await apiExecutePostModeration({
          headers,
          data: {
            postId: item.id,
            action,
            reason: actionReason,
          },
        });
      } else {
        res = await apiExecuteEchoModeration({
          headers,
          data: {
            echoId: item.id,
            action,
            reason: actionReason,
          },
        });
      }

      if (!res.ok) {
        throw new Error(res.error.message);
      }

      setNotice(
        `Successfully executed ${action.toUpperCase()} on ${item.type} (${item.id.slice(0, 8)}).`,
      );
      setActionModal(null);
      await loadDashboard();
      if (activeTab === "audit") {
        await loadAuditLog();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Action failed: ${msg}`);
    } finally {
      setActionSubmitting(false);
    }
  };

  // Filtered queue items based on active tab
  const filteredItems = useMemo(() => {
    if (!dashboardData) return [];
    const all = dashboardData.items;

    switch (activeTab) {
      case "unresolved":
        return all.filter((i) => i.status === "review" || i.openReportCount > 0);
      case "posts":
        return all.filter((i) => i.type === "post" && i.openReportCount > 0);
      case "echoes":
        return all.filter((i) => i.type === "echo" && i.openReportCount > 0);
      case "auto_flagged":
        return all.filter((i) => i.status === "review" && i.openReportCount === 0);
      default:
        return all;
    }
  }, [dashboardData, activeTab]);

  // Loading state
  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="flex items-center gap-3 text-muted-foreground font-vibe">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span>Verifying administrator credentials...</span>
        </div>
      </div>
    );
  }

  // Not signed in state
  if (!sessionUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-card/60 p-8 shadow-2xl backdrop-blur-xl text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldAlert className="size-7" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            BajiHears Trust & Safety
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-vibe">
            This operational engine is restricted to authorized moderators. Please authenticate with
            your verified Google account.
          </p>

          <div className="mt-6">
            <button
              onClick={handleSignInWithGoogle}
              className="w-full min-h-12 inline-flex items-center justify-center gap-3 rounded-2xl bg-primary px-6 font-display text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              <svg className="size-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          </div>

          <p className="mt-6 text-xs text-muted-foreground/60">
            Unauthorized access attempts are blocked and logged.
          </p>
        </div>
      </div>
    );
  }

  // Access Forbidden or error state
  if (error) {
    const isForbidden = /forbidden|privileges required/i.test(error);
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-rose-500/20 bg-card/60 p-8 shadow-2xl backdrop-blur-xl text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
            <AlertTriangle className="size-7" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">
            {isForbidden ? "Access Restricted (403)" : "Authentication Error"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-vibe">
            {isForbidden
              ? `Account (${sessionUser.email || sessionUser.id}) does not hold moderator authorization. Ensure your Supabase user ID or email is added to MODERATOR_USER_IDS or MODERATOR_EMAILS.`
              : error}
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={loadDashboard}
              className="min-h-11 rounded-2xl bg-primary px-6 font-display text-sm font-semibold text-primary-foreground"
            >
              Retry Authorization
            </button>
            <button
              onClick={handleSignOut}
              className="min-h-11 rounded-2xl border border-white/10 px-6 font-display text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Sign out and switch account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const counts = dashboardData?.counts || {
    unresolvedReports: 0,
    autoFlaggedPosts: 0,
    reportedPublishedPosts: 0,
    reportedEchoes: 0,
    quarantinedContent: 0,
    recentlyResolved24h: 0,
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased pb-24">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-bold tracking-tight sm:text-base">
                  BajiHears
                </span>
                <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  MODERATION
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground/80 hidden sm:block">
                Trust & Safety Engine · Cloudflare Workers + Supabase
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-medium text-foreground truncate max-w-[180px]">
                {dashboardData?.moderator?.email || sessionUser.email || "Moderator"}
              </span>
              <span className="text-[10px] text-muted-foreground">Authorized Owner</span>
            </div>

            <button
              onClick={loadDashboard}
              disabled={loading}
              title="Refresh queue"
              className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-secondary/50 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin text-primary" : ""}`} />
            </button>

            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-secondary/50 text-muted-foreground hover:text-rose-400 active:scale-95 transition-all"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Notice Banner */}
        {notice && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/10 p-4 text-xs font-medium text-primary">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{notice}</span>
            </div>
            <button onClick={() => setNotice(null)} className="p-1 hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Real-time KPI Metric Cards */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-8">
          <div className="rounded-2xl border border-white/10 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Unresolved
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-display text-2xl font-bold text-foreground">
                {counts.unresolvedReports}
              </span>
              <span className="text-[10px] text-amber-400 font-medium">Pending</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Auto-Flagged
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-display text-2xl font-bold text-amber-400">
                {counts.autoFlaggedPosts}
              </span>
              <span className="text-[10px] text-muted-foreground">Held</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Reported Posts
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-display text-2xl font-bold text-sky-400">
                {counts.reportedPublishedPosts}
              </span>
              <span className="text-[10px] text-muted-foreground">Wall</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Echo Reports
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-display text-2xl font-bold text-purple-400">
                {counts.reportedEchoes}
              </span>
              <span className="text-[10px] text-muted-foreground">Replies</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Quarantined
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-display text-2xl font-bold text-rose-400">
                {counts.quarantinedContent}
              </span>
              <span className="text-[10px] text-muted-foreground">Hidden</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Resolved 24h
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-display text-2xl font-bold text-emerald-400">
                {counts.recentlyResolved24h}
              </span>
              <span className="text-[10px] text-muted-foreground">Actions</span>
            </div>
          </div>
        </section>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-white/10 scrollbar-none mb-6">
          <button
            onClick={() => setActiveTab("unresolved")}
            className={`min-h-11 px-4 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "unresolved"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            All Unresolved ({counts.unresolvedReports})
          </button>

          <button
            onClick={() => setActiveTab("posts")}
            className={`min-h-11 px-4 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "posts"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            Reported Posts ({counts.reportedPublishedPosts})
          </button>

          <button
            onClick={() => setActiveTab("echoes")}
            className={`min-h-11 px-4 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "echoes"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            Reported Echoes ({counts.reportedEchoes})
          </button>

          <button
            onClick={() => setActiveTab("auto_flagged")}
            className={`min-h-11 px-4 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "auto_flagged"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            Auto-Flagged ({counts.autoFlaggedPosts})
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`min-h-11 px-4 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "audit"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            Audit History
          </button>
        </div>

        {/* Queue Items or Audit Tab */}
        {activeTab === "audit" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-sm font-semibold text-foreground">
                Immutable Decision Audit Trail
              </h2>
              <span className="text-xs text-muted-foreground">Latest 50 actions</span>
            </div>

            {auditLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                <Loader2 className="size-5 animate-spin mr-2 text-primary" />
                <span>Loading audit trail...</span>
              </div>
            ) : auditEntries.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-card/40 p-8 text-center text-sm text-muted-foreground">
                No moderation decisions recorded yet.
              </div>
            ) : (
              auditEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-white/10 bg-card/60 p-4 backdrop-blur-sm text-xs space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[10px] uppercase font-bold text-foreground">
                        {entry.actionType.replace("_", " ")}
                      </span>
                      <span className="text-muted-foreground uppercase text-[10px]">
                        {entry.targetType} · {entry.targetId.slice(0, 8)}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-foreground font-vibe">
                    <span className="text-muted-foreground">Reason: </span>
                    {entry.reason}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 border-t border-white/5 pt-2">
                    <span>
                      Transition:{" "}
                      <span className="font-mono text-amber-400">{entry.previousStatus}</span> →{" "}
                      <span className="font-mono text-emerald-400">{entry.newStatus}</span>
                    </span>
                    <span className="font-mono text-[10px] truncate max-w-[150px]">
                      By: {entry.performedBy}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-card/40 p-12 text-center">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                  <Check className="size-6" />
                </div>
                <h3 className="font-display text-base font-semibold text-foreground">
                  Queue Clean & Clear
                </h3>
                <p className="mt-1 text-xs text-muted-foreground font-vibe max-w-sm mx-auto">
                  No pending cases in this section. Every community report and automated flag has
                  been resolved.
                </p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="rounded-3xl border border-white/10 bg-card/60 p-5 shadow-lg backdrop-blur-xl transition-all hover:border-white/15"
                >
                  {/* Top Metadata Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          item.type === "post"
                            ? "bg-sky-500/15 text-sky-400 border border-sky-500/20"
                            : "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                        }`}
                      >
                        {item.type}
                      </span>

                      <span
                        className={`rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          item.status === "review"
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                            : item.status === "rejected"
                              ? "bg-zinc-500/15 text-zinc-400 border border-zinc-500/20"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {item.status === "review"
                          ? "Quarantined"
                          : item.openReportCount > 0
                            ? "Reported · Still Visible"
                            : "Published"}
                      </span>

                      {item.category && (
                        <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
                          {item.category}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Clock className="size-3.5" />
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Report Details Badge */}
                  {item.openReportCount > 0 && (
                    <div className="mb-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 text-xs text-amber-300">
                      <div className="flex items-center justify-between font-medium">
                        <span className="flex items-center gap-1.5 font-display">
                          <AlertTriangle className="size-3.5 text-amber-400" />
                          {item.openReportCount} Report
                          {item.openReportCount !== 1 ? "s" : ""} ({item.uniqueReporters} unique
                          device
                          {item.uniqueReporters !== 1 ? "s" : ""})
                        </span>
                        {item.latestReportedAt && (
                          <span className="text-[10px] text-amber-400/80">
                            Latest: {new Date(item.latestReportedAt).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                      {item.latestReason && (
                        <p className="mt-1 text-[11px] text-amber-200/90 font-vibe">
                          <span className="font-semibold text-amber-400">Reason: </span>
                          {item.latestReason}
                        </p>
                      )}
                    </div>
                  )}

                  {/* If Echo: Show Parent Post Context */}
                  {item.type === "echo" && item.parentPostText && (
                    <div className="mb-3 rounded-2xl bg-secondary/40 border border-white/5 p-3 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-semibold uppercase mb-1">
                        <MessageCircle className="size-3 text-primary" />
                        <span>In reply to confession:</span>
                      </div>
                      <p className="font-vibe text-foreground/80 line-clamp-2 italic">
                        "{item.parentPostText}"
                      </p>
                    </div>
                  )}

                  {/* Content Preview */}
                  <div className="mb-5 rounded-2xl bg-card/40 p-4 border border-white/5">
                    <p className="font-vibe text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-wrap">
                      {item.text}
                    </p>
                  </div>

                  {/* Action Buttons Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-4">
                    <div className="text-[11px] text-muted-foreground/60 font-mono">
                      ID: {item.id.slice(0, 8)}...
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Approve / Release */}
                      {item.status === "review" && (
                        <button
                          onClick={() => openActionModal(item, "approve")}
                          className="min-h-11 px-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 active:scale-95 transition-all"
                        >
                          <Check className="size-3.5" />
                          <span>Approve & Publish</span>
                        </button>
                      )}

                      {/* Hide / Quarantine */}
                      {item.status === "published" && (
                        <button
                          onClick={() => openActionModal(item, "hide")}
                          className="min-h-11 px-4 inline-flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/25 active:scale-95 transition-all"
                        >
                          <EyeOff className="size-3.5" />
                          <span>Hide / Quarantine</span>
                        </button>
                      )}

                      {/* Reject / Remove */}
                      {item.status !== "rejected" && (
                        <button
                          onClick={() => openActionModal(item, "reject")}
                          className="min-h-11 px-4 inline-flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/20 text-rose-400 text-xs font-semibold hover:bg-rose-500/25 active:scale-95 transition-all"
                        >
                          <Trash2 className="size-3.5" />
                          <span>Reject / Remove</span>
                        </button>
                      )}

                      {/* Restore */}
                      {item.status === "rejected" && (
                        <button
                          onClick={() => openActionModal(item, "restore")}
                          className="min-h-11 px-4 inline-flex items-center gap-2 rounded-xl bg-sky-500/15 border border-sky-500/20 text-sky-400 text-xs font-semibold hover:bg-sky-500/25 active:scale-95 transition-all"
                        >
                          <RotateCcw className="size-3.5" />
                          <span>Restore</span>
                        </button>
                      )}

                      {/* Dismiss False Reports */}
                      {item.openReportCount > 0 && (
                        <button
                          onClick={() => openActionModal(item, "dismiss_reports")}
                          className="min-h-11 px-4 inline-flex items-center gap-2 rounded-xl border border-white/10 text-muted-foreground text-xs font-medium hover:text-foreground hover:bg-white/5 active:scale-95 transition-all"
                        >
                          <CheckCircle2 className="size-3.5" />
                          <span>Dismiss Reports</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Confirmation Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-400" />
                <h3 className="font-display text-base font-bold text-foreground capitalize">
                  Confirm {actionModal.action.replace("_", " ")}
                </h3>
              </div>
              <button
                onClick={() => setActionModal(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground font-vibe mb-3">
              You are applying{" "}
              <strong className="text-foreground uppercase">{actionModal.action}</strong> on this{" "}
              {actionModal.item.type}. An audit entry will be permanently recorded.
            </p>

            <div className="rounded-2xl bg-secondary/50 p-3 text-xs mb-4 text-foreground/80 font-vibe line-clamp-3 italic">
              "{actionModal.item.text}"
            </div>

            <div className="space-y-1.5 mb-6">
              <label className="text-xs font-medium text-foreground">Decision Reason</label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={2}
                className="w-full rounded-2xl border border-white/10 bg-background/60 p-3 text-xs text-foreground focus:border-primary focus:outline-none"
                placeholder="Brief reason for the decision..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActionModal(null)}
                disabled={actionSubmitting}
                className="w-1/2 min-h-11 rounded-2xl border border-white/10 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAction}
                disabled={actionSubmitting}
                className="w-1/2 min-h-11 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
              >
                {actionSubmitting && <Loader2 className="size-4 animate-spin" />}
                <span>Confirm</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
