import { createFileRoute, Link } from "@tanstack/react-router";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  List,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import {
  deletePost,
  getAccounts,
  getPosts,
  mergeSavedPost,
  POST_SAVED_EVENT,
  publishPostNow,
  updatePost,
  type LinkedInAccount,
  type PostRecord,
} from "@/lib/api";
import { ComposerModal } from "@/routes/app.manage-posts";

type CalendarView = "list" | "week" | "month";
type StatusFilter = "all" | PostRecord["status"];

const STATUS_STYLES: Record<PostRecord["status"], string> = {
  draft:
    "border-slate-300 bg-slate-200 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  scheduled:
    "border-orange-500 bg-orange-500 text-white shadow-sm font-medium",
  published:
    "border-emerald-600 bg-emerald-600 text-white shadow-sm font-medium",
  publishing:
    "border-blue-600 bg-blue-600 text-white shadow-sm font-medium",
  failed:
    "border-red-600 bg-red-600 text-white shadow-sm font-medium",
};

const STATUS_LABELS: Record<PostRecord["status"], string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  publishing: "Publishing",
  failed: "Failed",
};

export const Route = createFileRoute("/app/calendar")({ component: CalendarRoute });

function postDate(post: PostRecord): Date {
  const value =
    post.status === "scheduled"
      ? post.scheduled_for
      : post.status === "published"
        ? post.published_at
        : post.created_at;
  return new Date(value ?? post.created_at);
}

function postTitle(post: PostRecord): string {
  return (
    post.article_title ||
    post.commentary ||
    post.media_filename ||
    `${post.content_type[0].toUpperCase()}${post.content_type.slice(1)} post`
  );
}

function CalendarRoute() {
  return (
    <AppShell pageTitle="Calendar">
      <Calendar />
    </AppShell>
  );
}

function Calendar() {
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedPost, setSelectedPost] = useState<PostRecord | null>(null);

  const [composerDate, setComposerDate] = useState<Date | null>(null);
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

  const loadPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getPosts();
      setPosts(list);
      if (selectedPost) {
        const updated = list.find((p) => p.id === selectedPost.id);
        if (updated) setSelectedPost(updated);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load posts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPosts();
  }, []);

  useEffect(() => {
    const handleSavedPost = (event: Event) => {
      const post = (event as CustomEvent<PostRecord>).detail;
      if (!post?.id) return;
      setPosts((prev) => mergeSavedPost(prev, post));
    };
    window.addEventListener(POST_SAVED_EVENT, handleSavedPost);
    return () => window.removeEventListener(POST_SAVED_EVENT, handleSavedPost);
  }, []);

  const handleOpenComposer = (date?: Date) => {
    setComposerDate(date ?? new Date());
    setAccountsLoading(true);
    void getAccounts()
      .then(setAccounts)
      .finally(() => setAccountsLoading(false));
  };

  const visiblePosts = useMemo(
    () => posts.filter((post) => statusFilter === "all" || post.status === statusFilter),
    [posts, statusFilter],
  );

  const days = useMemo(() => {
    if (view === "week") {
      const start = startOfWeek(currentDate);
      return Array.from({ length: 7 }, (_, index) => addDays(start, index));
    }
    const monthStart = startOfMonth(currentDate);
    return eachDayOfInterval({
      start: startOfWeek(monthStart),
      end: endOfWeek(endOfMonth(monthStart)),
    });
  }, [currentDate, view]);

  const move = (direction: -1 | 1) => {
    if (view === "week") {
      setCurrentDate((value) => (direction === 1 ? addWeeks(value, 1) : subWeeks(value, 1)));
    } else {
      setCurrentDate((value) => (direction === 1 ? addMonths(value, 1) : subMonths(value, 1)));
    }
  };

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-col justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Post calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drafts, scheduled posts, and published posts from your Linker Post database.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadPosts()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 border bg-card px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <Link
            to="/app/manage-posts"
            className="inline-flex items-center justify-center gap-2 bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Manage Posts
          </Link>
        </div>
      </div>

      {error && (
        <div role="alert" className="border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col justify-between gap-3 border bg-card p-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => move(-1)}
            className="border p-2 hover:bg-muted"
            aria-label="Previous period"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            className="border p-2 hover:bg-muted"
            aria-label="Next period"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentDate(new Date())}
            className="border px-3 py-2 text-sm hover:bg-muted"
          >
            Today
          </button>
          <div className="min-w-36 px-2 font-display text-lg font-semibold">
            {view === "week"
              ? `${format(startOfWeek(currentDate), "MMM d")} – ${format(endOfWeek(currentDate), "MMM d, yyyy")}`
              : format(currentDate, "MMMM yyyy")}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            aria-label="Filter posts by status"
            className="border bg-background px-3 py-2 text-sm"
          >
            <option value="all">All posts</option>
            <option value="draft">Drafts</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="publishing">Publishing</option>
            <option value="failed">Failed</option>
          </select>
          <div className="flex border bg-muted/20 p-1">
            {(["list", "week", "month"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm capitalize ${
                  view === item ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {item === "list" ? (
                  <List className="h-3.5 w-3.5" />
                ) : (
                  <CalendarDays className="h-3.5 w-3.5" />
                )}
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-4 text-xs text-muted-foreground font-medium"
        aria-label="Post status legend"
      >
        {(["draft", "scheduled", "publishing", "published", "failed"] as const).map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                status === "draft"
                  ? "bg-slate-400"
                  : status === "scheduled"
                    ? "bg-orange-500"
                    : status === "publishing"
                      ? "bg-blue-600 animate-pulse"
                      : status === "published"
                        ? "bg-emerald-500"
                        : "bg-red-500"
              }`}
            />
            {STATUS_LABELS[status]}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[360px] items-center justify-center border bg-card p-8 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" /> Loading posts…
        </div>
      ) : view === "list" ? (
        <PostList
          posts={visiblePosts}
          onSelectPost={(post) => setSelectedPost(post)}
          onCreatePost={() => handleOpenComposer()}
        />
      ) : (
        <CalendarGrid
          days={days}
          posts={visiblePosts}
          currentDate={currentDate}
          view={view}
          onSelectPost={(post) => setSelectedPost(post)}
          onAddPostForDate={(date) => handleOpenComposer(date)}
        />
      )}

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onPostUpdated={() => void loadPosts()}
        />
      )}

      {composerDate && (
        <ComposerModal
          accounts={accounts}
          accountsLoading={accountsLoading}
          initialScheduledDate={composerDate}
          onClose={() => setComposerDate(null)}
          onSuccess={(_msg, newPost) => {
            setComposerDate(null);
            if (newPost) {
              setPosts((prev) => mergeSavedPost(prev, newPost));
            }
          }}
        />
      )}
    </div>
  );
}

function CalendarGrid({
  days,
  posts,
  currentDate,
  view,
  onSelectPost,
  onAddPostForDate,
}: {
  days: Date[];
  posts: PostRecord[];
  currentDate: Date;
  view: Exclude<CalendarView, "list">;
  onSelectPost: (post: PostRecord) => void;
  onAddPostForDate: (date: Date) => void;
}) {
  return (
    <div className="overflow-x-auto border bg-card">
      <div className="grid min-w-[760px] grid-cols-7 border-b bg-muted/20">
        {Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(new Date()), index)).map(
          (day) => (
            <div
              key={day.getDay()}
              className="border-r p-2 text-center text-xs font-semibold text-muted-foreground last:border-r-0"
            >
              {format(day, "EEE")}
            </div>
          ),
        )}
      </div>
      <div className={`grid min-w-[760px] grid-cols-7 ${view === "week" ? "min-h-[520px]" : ""}`}>
        {days.map((day) => {
          const dayPosts = posts
            .filter((post) => isSameDay(postDate(post), day))
            .sort((left, right) => postDate(left).getTime() - postDate(right).getTime());
          return (
            <div
              key={day.toISOString()}
              onClick={() => onAddPostForDate(day)}
              className={`group relative flex flex-col justify-between min-h-32 border-b border-r p-2 cursor-pointer hover:bg-primary/5 transition last:border-r-0 ${
                view === "month" && !isSameMonth(day, currentDate) ? "bg-muted/20" : ""
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center text-xs font-semibold rounded-full ${
                      isToday(day) ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddPostForDate(day);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-xs text-primary hover:bg-primary/10 rounded transition"
                    title={`Create post for ${format(day, "PP")}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {dayPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPost(post);
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddPostForDate(day);
                  }}
                  className="text-[10px] text-muted-foreground hover:text-primary font-medium opacity-0 group-hover:opacity-100 transition inline-flex items-center gap-0.5"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PostCard({ post, onClick }: { post: PostRecord; onClick: (e: React.MouseEvent) => void }) {
  const date = postDate(post);
  const isDraft = post.status === "draft";
  const subtextColor = isDraft ? "text-slate-600 dark:text-slate-400" : "text-white/85";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left border px-2 py-1.5 text-xs shadow-sm transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer rounded-sm ${STATUS_STYLES[post.status]}`}
      title={postTitle(post)}
    >
      <div className="truncate font-semibold">{postTitle(post)}</div>
      <div className={`mt-0.5 flex items-center justify-between gap-2 text-[10px] ${subtextColor}`}>
        <span>{format(date, "h:mm a")}</span>
        <span>{STATUS_LABELS[post.status]}</span>
      </div>
    </button>
  );
}

function PostList({
  posts,
  onSelectPost,
  onCreatePost,
}: {
  posts: PostRecord[];
  onSelectPost: (post: PostRecord) => void;
  onCreatePost: () => void;
}) {
  const ordered = [...posts].sort(
    (left, right) => postDate(right).getTime() - postDate(left).getTime(),
  );
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onCreatePost}
          className="inline-flex items-center gap-1.5 bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 rounded"
        >
          <Plus className="h-3.5 w-3.5" /> Create Post
        </button>
      </div>

      {ordered.length === 0 ? (
        <div className="border bg-card p-12 text-center text-sm text-muted-foreground rounded">
          No posts found.
        </div>
      ) : (
        <div className="divide-y border bg-card rounded">
          {ordered.map((post) => (
            <article
              key={post.id}
              onClick={() => onSelectPost(post)}
              className="flex cursor-pointer flex-col gap-3 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center"
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectPost(post);
                }
              }}
            >
              <span
                className={`inline-flex w-fit border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[post.status]}`}
              >
                {STATUS_LABELS[post.status]}
              </span>
              <FileText className="hidden h-5 w-5 text-muted-foreground sm:block" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{postTitle(post)}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {format(postDate(post), "PPp")} · {post.content_type}
                  {post.first_comment ? " · First comment saved" : ""}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function PostDetailModal({
  post,
  onClose,
  onPostUpdated,
}: {
  post: PostRecord;
  onClose: () => void;
  onPostUpdated: () => void;
}) {
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(post.account_id || "");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showScheduleInput, setShowScheduleInput] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState<string>(() => {
    if (post.scheduled_for) {
      const d = new Date(post.scheduled_for);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
    const defaultDate = addDays(new Date(), 1);
    return new Date(defaultDate.getTime() - defaultDate.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });

  useEffect(() => {
    let unmounted = false;
    async function fetchAccounts() {
      try {
        const list = await getAccounts();
        if (!unmounted) {
          setAccounts(list);
          if (!selectedAccountId && list.length > 0) {
            const active = list.find((a) => a.status === "active");
            if (active) setSelectedAccountId(active.id);
          }
        }
      } catch {
        // silent fail
      } finally {
        if (!unmounted) setLoadingAccounts(false);
      }
    }
    void fetchAccounts();
    return () => {
      unmounted = true;
    };
  }, [selectedAccountId]);

  const handlePublishNow = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      await publishPostNow(post.id, selectedAccountId || undefined);
      onPostUpdated();
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not publish post.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmSchedule = async () => {
    if (!scheduledDateTime) {
      setActionError("Please select a date and time.");
      return;
    }
    if (new Date(scheduledDateTime).getTime() < Date.now()) {
      setActionError("Choose a time that is not in the past.");
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      const isoDate = new Date(scheduledDateTime).toISOString();
      await updatePost(post.id, {
        scheduledFor: isoDate,
        accountId: selectedAccountId || undefined,
        status: "scheduled",
      });
      onPostUpdated();
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not schedule post.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (deleteFromLinkedIn: boolean = false) => {
    const confirmMessage = deleteFromLinkedIn
      ? "Are you sure you want to delete this post from LinkedIn and your calendar?"
      : "Are you sure you want to delete this post from your calendar?";
    if (!window.confirm(confirmMessage)) return;

    setActionLoading(true);
    setActionError(null);
    try {
      await deletePost(post.id, deleteFromLinkedIn);
      onPostUpdated();
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not delete post.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border bg-card text-card-foreground shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-3">
            <span className={`border px-2.5 py-1 text-xs font-semibold rounded ${STATUS_STYLES[post.status]}`}>
              {STATUS_LABELS[post.status]}
            </span>
            <h2 id="modal-title" className="font-display text-lg font-semibold truncate">
              {postTitle(post)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
          {actionError && (
            <div role="alert" className="flex items-start gap-2 rounded border border-destructive/40 bg-destructive/10 p-3 text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>{actionError}</div>
            </div>
          )}

          {post.failure_reason && (
            <div role="alert" className="flex items-start gap-2 rounded border border-red-500/40 bg-red-500/10 p-3 text-red-700 dark:text-red-300">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Publish Failure:</strong> {post.failure_reason}
              </div>
            </div>
          )}

          {/* Timing details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-muted/30 p-3 rounded border">
            <div>
              <span className="text-muted-foreground">Content type: </span>
              <strong className="capitalize text-foreground">{post.content_type}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Created: </span>
              <span className="font-medium text-foreground">{format(new Date(post.created_at), "PPp")}</span>
            </div>
            {post.scheduled_for && (
              <div>
                <span className="text-muted-foreground">Scheduled for: </span>
                <span className="font-medium text-foreground">{format(new Date(post.scheduled_for), "PPp")}</span>
              </div>
            )}
            {post.published_at && (
              <div>
                <span className="text-muted-foreground">Published at: </span>
                <span className="font-medium text-foreground">{format(new Date(post.published_at), "PPp")}</span>
              </div>
            )}
          </div>

          {/* Account Selector */}
          {(post.status === "draft" || post.status === "scheduled" || post.status === "failed" || post.status === "publishing") && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Target LinkedIn Account</label>
              {loadingAccounts ? (
                <div className="text-xs text-muted-foreground">Loading accounts…</div>
              ) : (
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full rounded border bg-background px-3 py-2 text-sm"
                >
                  <option value="">-- Select an account --</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.display_name} ({acc.status})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Post Text */}
          {post.commentary && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-muted-foreground">Post Text</div>
              <div className="rounded border bg-background p-4 whitespace-pre-wrap leading-relaxed">
                {post.commentary}
              </div>
            </div>
          )}

          {/* Article Info */}
          {post.content_type === "article" && post.article_source && (
            <div className="space-y-1.5 rounded border p-3 bg-muted/10">
              <div className="text-xs font-semibold text-muted-foreground">Article Details</div>
              {post.article_title && <div className="font-semibold">{post.article_title}</div>}
              {post.article_description && <div className="text-xs text-muted-foreground mt-1">{post.article_description}</div>}
              <a
                href={post.article_source}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline"
              >
                {post.article_source} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* Media Info */}
          {post.media_filename && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-muted-foreground">Media Attachment</div>
              <div className="flex items-center gap-2 text-xs border rounded p-2.5 bg-muted/20">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-medium truncate">{post.media_filename}</span>
                {post.media_size && (
                  <span className="text-muted-foreground">({(post.media_size / 1024).toFixed(1)} KB)</span>
                )}
              </div>
            </div>
          )}

          {/* First Comment */}
          {post.first_comment && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-muted-foreground">First Comment</div>
              <div className="rounded border bg-muted/20 p-3 text-xs italic">
                "{post.first_comment}"
              </div>
            </div>
          )}

          {/* LinkedIn URN */}
          {post.linkedin_post_urn && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-muted-foreground">LinkedIn URN</div>
              <div className="text-xs font-mono bg-muted p-2 rounded truncate select-all">
                {post.linkedin_post_urn}
              </div>
            </div>
          )}

          {/* Schedule Input */}
          {showScheduleInput && (
            <div className="space-y-2 rounded border border-primary/40 bg-primary/5 p-4">
              <label className="block text-xs font-semibold">Select Schedule Date & Time</label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="rounded border bg-background px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void handleConfirmSchedule()}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarIcon className="h-4 w-4" />}
                  Confirm Schedule
                </button>
                <button
                  type="button"
                  onClick={() => setShowScheduleInput(false)}
                  className="px-3 py-2 text-sm hover:underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4 bg-muted/20">
          <div className="flex flex-wrap items-center gap-2">
            {post.status === "draft" && (
              <>
                <button
                  type="button"
                  onClick={() => void handlePublishNow()}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Publish Now
                </button>
                <button
                  type="button"
                  onClick={() => setShowScheduleInput((v) => !v)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded border bg-card px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  <Clock className="h-4 w-4" />
                  Schedule
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(false)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 rounded border border-destructive/50 text-destructive hover:bg-destructive/10 px-3 py-2 text-sm font-medium disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" /> Delete Draft
                </button>
              </>
            )}

            {post.status === "scheduled" && (
              <>
                <button
                  type="button"
                  onClick={() => void handlePublishNow()}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Publish Now
                </button>
                <button
                  type="button"
                  onClick={() => setShowScheduleInput((v) => !v)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded border bg-card px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  <Clock className="h-4 w-4" />
                  Change Schedule
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(false)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 rounded border border-destructive/50 text-destructive hover:bg-destructive/10 px-3 py-2 text-sm font-medium disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" /> Delete Scheduled
                </button>
              </>
            )}

            {post.status === "published" && (
              <>
                <button
                  type="button"
                  onClick={() => void handleDelete(true)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete from LinkedIn & Calendar
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(false)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 rounded border border-muted-foreground/30 px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
                >
                  Delete from Calendar only
                </button>
              </>
            )}

            {(post.status === "publishing" || post.status === "failed") && (
              <>
                <button
                  type="button"
                  onClick={() => void handlePublishNow()}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Publish Now
                </button>
                <button
                  type="button"
                  onClick={() => setShowScheduleInput((v) => !v)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded border bg-card px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  <Clock className="h-4 w-4" />
                  Schedule
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(false)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 rounded border border-destructive/50 text-destructive hover:bg-destructive/10 px-3 py-2 text-sm font-medium disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" /> Delete Post
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
