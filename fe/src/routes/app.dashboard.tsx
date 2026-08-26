import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HR_FEATURE_ENABLED } from "@/lib/features";
import {
  getAccounts,
  getLlmUsage,
  getPosts,
  type LinkedInAccount,
  type LlmUsageSummary,
  type PostRecord,
} from "@/lib/api";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Briefcase,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Linkedin,
  Loader2,
  PenSquare,
  Plus,
  RefreshCw,
  Send,
  Gauge,
  Sparkles,
  Users2,
} from "lucide-react";

export const Route = createFileRoute("/app/dashboard")({
  component: DashboardRoute,
});

const STATUS_BADGES: Record<PostRecord["status"], { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "border-slate-300 bg-slate-200 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  },
  scheduled: {
    label: "Scheduled",
    className: "border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200",
  },
  publishing: {
    label: "Publishing",
    className: "border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
  },
  published: {
    label: "Published",
    className: "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  },
  failed: {
    label: "Failed",
    className: "border-red-300 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
  },
};

function DashboardRoute() {
  const [persona, setPersona] = useState<"creator" | "hr">("creator");
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [llmUsage, setLlmUsage] = useState<LlmUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [accList, postList] = await Promise.all([getAccounts(), getPosts()]);
      setAccounts(accList);
      setPosts(postList);
      try {
        setLlmUsage(await getLlmUsage("month"));
      } catch {
        setLlmUsage(null);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedPersona = localStorage.getItem("linker-post-persona");
    if ((HR_FEATURE_ENABLED && savedPersona === "hr") || savedPersona === "creator") {
      setPersona(savedPersona);
    }
    void loadDashboardData();
  }, []);

  const activeAccountsCount = useMemo(
    () => accounts.filter((a) => a.status === "active").length,
    [accounts],
  );
  const publishedPostsCount = useMemo(
    () => posts.filter((p) => p.status === "published").length,
    [posts],
  );
  const scheduledPostsCount = useMemo(
    () => posts.filter((p) => p.status === "scheduled").length,
    [posts],
  );
  const draftPostsCount = useMemo(
    () => posts.filter((p) => p.status === "draft").length,
    [posts],
  );
  const failedPostsCount = useMemo(
    () => posts.filter((p) => p.status === "failed").length,
    [posts],
  );

  const stats = [
    {
      label: "Connected Accounts",
      value: loading ? "…" : activeAccountsCount,
      subtext: `${accounts.length} total profiles linked`,
      icon: Linkedin,
      color: "text-blue-600",
    },
    {
      label: "Published Posts",
      value: loading ? "…" : publishedPostsCount,
      subtext: "Live on LinkedIn",
      icon: Send,
      color: "text-emerald-600",
    },
    {
      label: "Scheduled Posts",
      value: loading ? "…" : scheduledPostsCount,
      subtext: "Queued for publishing",
      icon: CalendarClock,
      color: "text-orange-600",
    },
    {
      label: "Draft Posts",
      value: loading ? "…" : draftPostsCount,
      subtext: failedPostsCount > 0 ? `${failedPostsCount} failed post(s)` : "Saved in Linker Post",
      icon: PenSquare,
      color: "text-purple-600",
    },
  ];

  const totalPostsCount = posts.length;

  return (
    <AppShell pageTitle="Dashboard" rightPanel={<SetupPanel persona={persona} accountsCount={accounts.length} postsCount={totalPostsCount} />}>
      <div className="space-y-6 pb-10">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border bg-card p-6 shadow-soft rounded">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Welcome to Linker Post</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitor your connected LinkedIn profiles, track scheduled content, and manage your posts in real-time.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadDashboardData()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 border bg-background px-3.5 py-2 text-xs font-medium hover:bg-muted rounded transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-primary ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <Link
              to="/app/manage-posts"
              className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition shadow-sm"
            >
              <PenSquare className="h-4 w-4" /> Manage Posts
            </Link>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive rounded">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* Dynamic Metric Cards Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded border bg-card p-5 shadow-soft space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>{stat.label}</span>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className="font-display text-3xl font-bold text-foreground">
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground">{stat.subtext}</div>
            </div>
          ))}
        </div>

        <AiUsageSection initialUsage={llmUsage} loading={loading} />

        {/* Content Breakdown & Distribution */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Post Distribution Chart / Progress */}
          <div className="rounded border bg-card p-6 shadow-soft space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-display text-base font-bold">
                <BarChart3 className="h-5 w-5 text-primary" /> Post Content Breakdown
              </div>
              <span className="text-xs text-muted-foreground font-medium">Total: {totalPostsCount} posts</span>
            </div>

            {totalPostsCount === 0 ? (
              <div className="flex min-h-[160px] flex-col items-center justify-center border border-dashed rounded p-6 text-center text-xs text-muted-foreground">
                <PenSquare className="mb-2 h-7 w-7 text-muted-foreground/60" />
                <p className="font-medium text-foreground">No post data recorded yet</p>
                <p className="mt-1">Compose or schedule a post on Manage Posts to start tracking distribution stats.</p>
                <Link to="/app/manage-posts" className="mt-3 text-primary font-semibold hover:underline">
                  Go to Manage Posts →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <TooltipProvider delayDuration={200}>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted flex">
                    <BarSegment
                      widthPct={totalPostsCount ? (publishedPostsCount / totalPostsCount) * 100 : 0}
                      colorClass="bg-emerald-500"
                      label="Published"
                      hint="live on LinkedIn"
                      value={publishedPostsCount}
                    />
                    <BarSegment
                      widthPct={totalPostsCount ? (scheduledPostsCount / totalPostsCount) * 100 : 0}
                      colorClass="bg-orange-500"
                      label="Scheduled"
                      hint="queued to publish"
                      value={scheduledPostsCount}
                    />
                    <BarSegment
                      widthPct={totalPostsCount ? (draftPostsCount / totalPostsCount) * 100 : 0}
                      colorClass="bg-slate-400"
                      label="Drafts"
                      hint="saved in Linker Post"
                      value={draftPostsCount}
                    />
                    <BarSegment
                      widthPct={totalPostsCount ? (failedPostsCount / totalPostsCount) * 100 : 0}
                      colorClass="bg-red-500"
                      label="Failed"
                      hint="publish errors"
                      value={failedPostsCount}
                    />
                  </div>
                  <BarLegend
                    className="mt-2"
                    items={[
                      {
                        colorClass: "bg-emerald-500",
                        label: "Green",
                        hint: "published posts",
                        value: publishedPostsCount,
                      },
                      {
                        colorClass: "bg-orange-500",
                        label: "Orange",
                        hint: "scheduled posts",
                        value: scheduledPostsCount,
                      },
                      {
                        colorClass: "bg-slate-400",
                        label: "Gray",
                        hint: "draft posts",
                        value: draftPostsCount,
                      },
                      {
                        colorClass: "bg-red-500",
                        label: "Red",
                        hint: "failed posts",
                        value: failedPostsCount,
                      },
                    ]}
                  />
                </TooltipProvider>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs pt-2">
                  <div className="border bg-emerald-500/10 border-emerald-500/30 p-3 rounded text-center">
                    <div className="font-semibold text-emerald-900 dark:text-emerald-200">Published</div>
                    <div className="text-lg font-bold mt-0.5">{publishedPostsCount}</div>
                  </div>
                  <div className="border bg-orange-500/10 border-orange-500/30 p-3 rounded text-center">
                    <div className="font-semibold text-orange-900 dark:text-orange-200">Scheduled</div>
                    <div className="text-lg font-bold mt-0.5">{scheduledPostsCount}</div>
                  </div>
                  <div className="border bg-slate-500/10 border-slate-500/30 p-3 rounded text-center">
                    <div className="font-semibold text-slate-900 dark:text-slate-200">Drafts</div>
                    <div className="text-lg font-bold mt-0.5">{draftPostsCount}</div>
                  </div>
                  <div className="border bg-red-500/10 border-red-500/30 p-3 rounded text-center">
                    <div className="font-semibold text-red-900 dark:text-red-200">Failed</div>
                    <div className="text-lg font-bold mt-0.5">{failedPostsCount}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Connected LinkedIn Accounts Summary Card */}
          <div className="rounded border bg-card p-6 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-display text-base font-bold">
                <Linkedin className="h-5 w-5 text-[#0077B5]" /> Connected Accounts
              </div>
              <Link to="/app/accounts" className="text-xs font-semibold text-primary hover:underline">
                Manage →
              </Link>
            </div>

            {loading ? (
              <div className="flex min-h-[120px] items-center justify-center text-xs text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" /> Loading accounts…
              </div>
            ) : accounts.length === 0 ? (
              <div className="border border-dashed p-4 rounded text-center text-xs text-muted-foreground space-y-2">
                <p>No LinkedIn account connected yet.</p>
                <Link
                  to="/app/accounts"
                  className="inline-flex items-center gap-1.5 bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground rounded hover:opacity-90"
                >
                  <Plus className="h-3.5 w-3.5" /> Connect LinkedIn
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                {accounts.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between border bg-muted/20 p-2.5 rounded text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {acc.profile_image_url ? (
                        <img
                          src={acc.profile_image_url}
                          alt=""
                          className="h-7 w-7 rounded-full object-cover shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0077B5]/10 text-[#0077B5] shrink-0">
                          <Linkedin className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <div className="truncate font-semibold">{acc.display_name}</div>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${
                      acc.status === "active" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}>
                      {acc.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Database Posts Feed */}
        <div className="rounded border bg-card p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold">Recent Workspace Posts</h2>
            <Link to="/app/manage-posts" className="text-xs font-semibold text-primary hover:underline">
              View all posts →
            </Link>
          </div>

          {loading ? (
            <div className="flex min-h-[140px] items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" /> Loading posts…
            </div>
          ) : posts.length === 0 ? (
            <div className="border border-dashed p-6 rounded text-center text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">No posts created yet in this workspace.</p>
              <p>Click Manage Posts to draft your first LinkedIn post!</p>
              <Link
                to="/app/manage-posts"
                className="mt-2 inline-flex items-center gap-1.5 bg-primary px-4 py-2 text-xs font-medium text-primary-foreground rounded hover:opacity-90"
              >
                <PenSquare className="h-3.5 w-3.5" /> Compose Post
              </Link>
            </div>
          ) : (
            <div className="divide-y border rounded bg-card">
              {posts.slice(0, 5).map((post) => {
                const acc = accounts.find((a) => a.id === post.account_id);
                const badge = STATUS_BADGES[post.status];
                return (
                  <div key={post.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-3 hover:bg-muted/30 transition text-xs">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`border px-2 py-0.5 text-[10px] font-medium rounded ${badge.className}`}>
                          {badge.label}
                        </span>
                        <span className="font-semibold text-foreground truncate">
                          {acc?.display_name || "LinkedIn Account"}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          · {new Date(post.published_at || post.scheduled_for || post.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-foreground/90 font-normal">
                        {post.commentary || post.article_title || "(No text commentary)"}
                      </p>
                    </div>
                    <Link
                      to="/app/manage-posts"
                      className="text-primary font-medium hover:underline shrink-0 text-xs"
                    >
                      Details →
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function formatTokenCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

function formatUsd(value: string | number): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return "$0.00";
  if (amount > 0 && amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}

type BarLegendItem = {
  colorClass: string;
  label: string;
  hint: string;
  value?: string | number;
};

function BarLegend({ items, className }: { items: BarLegendItem[]; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground ${className ?? ""}`}>
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 shrink-0 rounded-full ${item.colorClass}`} aria-hidden />
          <span>
            <span className="font-medium text-foreground">{item.label}</span>
            {item.value !== undefined ? `: ${item.value}` : null}
            <span className="text-muted-foreground"> ({item.hint})</span>
          </span>
        </span>
      ))}
    </div>
  );
}

function BarSegment({
  widthPct,
  colorClass,
  label,
  hint,
  value,
}: {
  widthPct: number;
  colorClass: string;
  label: string;
  hint: string;
  value: string | number;
}) {
  if (widthPct <= 0) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`${colorClass} h-full min-w-[2px] cursor-help transition-all duration-500`}
          style={{ width: `${widthPct}%` }}
          aria-label={`${label}: ${value}`}
        />
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-[220px] border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
      >
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-muted-foreground">{hint}</p>
        <p className="mt-0.5 font-medium tabular-nums text-foreground">{value}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function AiUsageSection({
  initialUsage,
  loading,
}: {
  initialUsage: LlmUsageSummary | null;
  loading: boolean;
}) {
  const [usage, setUsage] = useState<LlmUsageSummary | null>(initialUsage);
  const [modelFilter, setModelFilter] = useState("all");
  const [filterLoading, setFilterLoading] = useState(false);

  useEffect(() => {
    setUsage(initialUsage);
    if (initialUsage?.selected_model) {
      setModelFilter(initialUsage.selected_model);
    }
  }, [initialUsage]);

  const availableModels = usage?.available_models ?? [];
  const displayModel =
    modelFilter !== "all"
      ? modelFilter
      : usage?.primary_model ?? (availableModels.length === 1 ? availableModels[0] : null);

  const onModelChange = async (next: string) => {
    setModelFilter(next);
    setFilterLoading(true);
    try {
      setUsage(await getLlmUsage("month", next));
    } catch {
      // keep previous usage visible
    } finally {
      setFilterLoading(false);
    }
  };

  const busy = loading || filterLoading;
  const total = usage?.total_tokens ?? 0;
  const inputPct = total ? ((usage?.input_tokens ?? 0) / total) * 100 : 0;
  const outputPct = total ? ((usage?.output_tokens ?? 0) / total) * 100 : 0;
  const cachedPct = total ? ((usage?.cached_tokens ?? 0) / total) * 100 : 0;
  const softPct = Math.min(100, usage?.token_usage_pct ?? 0);

  return (
    <div className="rounded border bg-card p-6 shadow-soft space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-display text-base font-bold">
            <Gauge className="h-5 w-5 text-primary" /> AI usage this month
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Token usage from rewrite and agents, stored per account.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground">
          {availableModels.length > 0 ? (
            <label className="flex items-center gap-2">
              <span className="whitespace-nowrap">Model</span>
              <select
                value={modelFilter}
                onChange={(e) => void onModelChange(e.target.value)}
                className="max-w-[220px] rounded border bg-background px-2 py-1 text-xs font-medium text-foreground outline-none focus:border-primary"
              >
                <option value="all">All models</option>
                {availableModels.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          ) : displayModel ? (
            <div>
              Model: <span className="font-medium text-foreground">{displayModel}</span>
            </div>
          ) : null}
          {displayModel && modelFilter === "all" && availableModels.length > 1 ? (
            <div className="text-[11px]">
              Showing all · most used:{" "}
              <span className="font-medium text-foreground">{displayModel}</span>
            </div>
          ) : null}
          <div>Est. cost: {busy ? "…" : formatUsd(usage?.estimated_cost_usd ?? 0)}</div>
        </div>
      </div>

      {!busy && (!usage || usage.requests_ok === 0) ? (
        <div className="border border-dashed rounded p-4 text-xs text-muted-foreground">
          No AI usage yet. Rewrite a post or run an agent to get started.
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                {busy ? "…" : formatTokenCount(total)} / {formatTokenCount(usage?.monthly_token_soft_limit ?? 0)} tokens
              </span>
              <span className="text-muted-foreground">{busy ? "…" : `${softPct.toFixed(0)}%`}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${busy ? 0 : softPct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-xs font-medium text-foreground">Token mix</div>
            <TooltipProvider delayDuration={200}>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted flex">
                <BarSegment
                  widthPct={inputPct}
                  colorClass="bg-sky-500"
                  label="Input tokens"
                  hint="text sent to the model"
                  value={formatTokenCount(usage?.input_tokens ?? 0)}
                />
                <BarSegment
                  widthPct={outputPct}
                  colorClass="bg-emerald-500"
                  label="Output tokens"
                  hint="text generated by the model"
                  value={formatTokenCount(usage?.output_tokens ?? 0)}
                />
                <BarSegment
                  widthPct={cachedPct}
                  colorClass="bg-amber-500"
                  label="Cached tokens"
                  hint="reused prompt from cache"
                  value={formatTokenCount(usage?.cached_tokens ?? 0)}
                />
              </div>
              <BarLegend
                className="mt-2"
                items={[
                  {
                    colorClass: "bg-sky-500",
                    label: "Blue",
                    hint: "input sent to model",
                    value: formatTokenCount(usage?.input_tokens ?? 0),
                  },
                  {
                    colorClass: "bg-emerald-500",
                    label: "Green",
                    hint: "output from model",
                    value: formatTokenCount(usage?.output_tokens ?? 0),
                  },
                  ...(cachedPct > 0
                    ? [
                        {
                          colorClass: "bg-amber-500",
                          label: "Amber",
                          hint: "cached prompt tokens",
                          value: formatTokenCount(usage?.cached_tokens ?? 0),
                        },
                      ]
                    : []),
                ]}
              />
            </TooltipProvider>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
              <div className="rounded border px-2.5 py-2">
                <div className="text-muted-foreground">Requests</div>
                <div className="font-semibold">{busy ? "…" : usage?.request_count ?? 0}</div>
              </div>
              <div className="rounded border px-2.5 py-2">
                <div className="text-muted-foreground">Input</div>
                <div className="font-semibold">{busy ? "…" : formatTokenCount(usage?.input_tokens ?? 0)}</div>
              </div>
              <div className="rounded border px-2.5 py-2">
                <div className="text-muted-foreground">Output</div>
                <div className="font-semibold">{busy ? "…" : formatTokenCount(usage?.output_tokens ?? 0)}</div>
              </div>
              <div className="rounded border px-2.5 py-2">
                <div className="text-muted-foreground">Cached</div>
                <div className="font-semibold">{busy ? "…" : formatTokenCount(usage?.cached_tokens ?? 0)}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
            <div className="rounded border px-2.5 py-2">
              <div className="text-muted-foreground">Avg / request</div>
              <div className="font-semibold">{busy ? "…" : formatTokenCount(Math.round(usage?.avg_tokens_per_request ?? 0))}</div>
            </div>
            <div className="rounded border px-2.5 py-2">
              <div className="text-muted-foreground">Max / request</div>
              <div className="font-semibold">{busy ? "…" : formatTokenCount(usage?.max_tokens_per_request ?? 0)}</div>
            </div>
            <div className="rounded border px-2.5 py-2">
              <div className="text-muted-foreground">Failed</div>
              <div className="font-semibold">{busy ? "…" : usage?.requests_failed ?? 0}</div>
            </div>
            <div className="rounded border px-2.5 py-2">
              <div className="text-muted-foreground">Cancelled</div>
              <div className="font-semibold">{busy ? "…" : usage?.requests_cancelled ?? 0}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SetupPanel({
  persona,
  accountsCount,
  postsCount,
}: {
  persona: "creator" | "hr";
  accountsCount: number;
  postsCount: number;
}) {
  const steps = [
    { label: "Connect LinkedIn Account", done: accountsCount > 0, link: "/app/accounts" },
    { label: "Compose & Save First Post", done: postsCount > 0, link: "/app/manage-posts" },
    { label: "Schedule or Publish Content", done: postsCount > 0, link: "/app/calendar" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Getting Started
        </div>
        <div className="font-display mt-1 text-base font-bold">Workspace Setup Progress</div>
      </div>

      <div className="space-y-2.5">
        {steps.map((step, index) => (
          <Link
            key={step.label}
            to={step.link}
            className="flex items-center justify-between border bg-card p-3 rounded text-xs hover:border-primary transition group"
          >
            <div className="flex items-center gap-2.5">
              {step.done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                  {index + 1}
                </span>
              )}
              <span className={step.done ? "line-through text-muted-foreground" : "font-medium text-foreground"}>
                {step.label}
              </span>
            </div>
            <span className="text-[11px] text-primary opacity-0 group-hover:opacity-100 transition">Go →</span>
          </Link>
        ))}
      </div>

      <Link
        to="/app/agents"
        className="inline-flex w-full items-center justify-center gap-2 rounded border bg-card px-3 py-2 text-xs font-medium hover:bg-muted transition"
      >
        <Sparkles className="h-4 w-4 text-primary" /> Run an agent
      </Link>
    </div>
  );
}
