import { createFileRoute, Link } from "@tanstack/react-router";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { useDropzone, type Accept, type FileRejection } from "react-dropzone";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Filter,
  Image as ImageIcon,
  Linkedin,
  Loader2,
  MessageSquare,
  Newspaper,
  PenSquare,
  Plus,
  RefreshCw,
  Save,
  Send,
  Share2,
  Wand2 as Sparkles,
  ThumbsUp,
  Trash2,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsCompactScreen } from "@/hooks/use-mobile";
import {
  addPostComment,
  createPost,
  deletePost,
  emitSavedPost,
  getAccounts,
  getPostAnalytics,
  getPostComments,
  getPosts,
  mergeSavedPost,
  POST_SAVED_EVENT,
  publishPostNow,
  rewritePostWithAi,
  updatePost,
  type LinkedInAccount,
  type PostAnalytics,
  type PostComment,
  type PostRecord,
} from "@/lib/api";
import {
  clearNewPostRewriteSession,
  clearRewriteDraft,
  commentaryFromQuillText,
  composerRewriteKey,
  loadRewriteDraft,
  saveRewriteDraft,
  type RewriteDraftRecord,
} from "@/lib/rewrite-draft-storage";
import "react-quill-new/dist/quill.snow.css";

type ReactQuillComponent = typeof import("react-quill-new").default;

let cachedQuillEditor: ReactQuillComponent | null = null;
let quillEditorPromise: Promise<ReactQuillComponent> | null = null;

export function preloadComposerEditor(): Promise<ReactQuillComponent | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (cachedQuillEditor) return Promise.resolve(cachedQuillEditor);
  if (!quillEditorPromise) {
    quillEditorPromise = import("react-quill-new").then((mod) => {
      cachedQuillEditor = mod.default;
      return cachedQuillEditor;
    });
  }
  return quillEditorPromise;
}

type ContentType = PostRecord["content_type"];
type SubmitAction = "draft" | "schedule" | "publish";
type FilterStatus = "all" | "draft" | "scheduled" | "published" | "failed";

type QuillSource = "user" | "api" | "silent";
type QuillEditorView = {
  getText: () => string;
  getContents: () => unknown;
};
type QuillEditor = QuillEditorView & {
  setText: (text: string, source?: QuillSource) => void;
  setContents: (delta: unknown, source?: QuillSource) => void;
  root?: { innerHTML: string };
};
type ComposerQuillHandle = { getEditor: () => QuillEditor };
type EditorSnapshot = {
  commentary: string;
  editorValue: string;
  editorDelta: string | null;
};

function editorHtmlFromPlain(text: string) {
  return text.replace(/\n/g, "<br/>");
}

type QuillToolbar = {
  quill: {
    format: (name: string, value: string | boolean) => void;
    getSelection: (focus?: boolean) => { index: number; length: number } | null;
    insertText: (index: number, text: string, name: string, value: string) => void;
    removeFormat: (index: number, length: number) => void;
    setSelection: (index: number, length: number) => void;
  };
};

const TABS: Array<{
  id: ContentType;
  label: string;
  icon: typeof PenSquare;
}> = [
  { id: "text", label: "Text", icon: PenSquare },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "video", label: "Video", icon: Video },
  { id: "document", label: "Document", icon: FileText },
  { id: "article", label: "Article", icon: Newspaper },
];

const FILE_LIMITS: Partial<Record<ContentType, number>> = {
  image: 10 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  document: 20 * 1024 * 1024,
};

const DROPZONE_ACCEPT: Partial<Record<ContentType, Accept>> = {
  image: {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/gif": [".gif"],
  },
  video: { "video/mp4": [".mp4"] },
  document: {
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  },
};

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

function promptForHttpUrl(): string | null {
  const input = window.prompt("Enter the link URL", "https://");
  if (!input) return null;
  try {
    const url = new URL(input);
    if (!["http:", "https: blast"].includes(url.protocol)) throw new Error("Invalid protocol");
    return url.toString();
  } catch {
    window.alert("Enter a valid http:// or https:// link.");
    return null;
  }
}

function handleQuillLink(this: QuillToolbar, enabled: boolean) {
  if (!enabled) {
    this.quill.format("link", false);
    return;
  }
  const selection = this.quill.getSelection(true);
  const url = promptForHttpUrl();
  if (!selection || !url) return;
  if (selection.length > 0) {
    this.quill.format("link", url);
    return;
  }
  const label = window.prompt("Link text", url) ?? url;
  this.quill.insertText(selection.index, label, "link", url);
  this.quill.setSelection(selection.index + label.length, 0);
}

function handleQuillClean(this: QuillToolbar) {
  const selection = this.quill.getSelection(true);
  if (!selection || selection.length === 0) {
    window.alert("Select the formatted text you want to clear first.");
    return;
  }
  this.quill.removeFormat(selection.index, selection.length);
}

const QUILL_MODULES = {
  toolbar: {
    container: [
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["blockquote", "link"],
      ["clean"],
    ],
    handlers: {
      link: handleQuillLink,
      clean: handleQuillClean,
    },
  },
};

const QUILL_FORMATS = ["bold", "italic", "underline", "strike", "list", "blockquote", "link"];

function toDatetimeLocal(date: Date): string {
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
}

function defaultScheduleDate(): Date {
  const nextSlot = new Date(Date.now() + 60_000);
  nextSlot.setSeconds(0, 0);
  return nextSlot;
}

function splitDatetimeLocal(value: string): { date: Date; time: string } {
  const date = value ? new Date(value) : defaultScheduleDate();
  const safeDate = Number.isNaN(date.getTime()) ? defaultScheduleDate() : date;
  return {
    date: safeDate,
    time: `${String(safeDate.getHours()).padStart(2, "0")}:${String(safeDate.getMinutes()).padStart(2, "0")}`,
  };
}

function mergeDateAndTime(date: Date, time: string): string {
  const [hours, minutes] = time.split(":").map((part) => Number(part));
  const merged = new Date(date);
  merged.setHours(hours || 0, minutes || 0, 0, 0);
  return toDatetimeLocal(merged);
}

function SchedulePickerPanel({
  scheduledParts,
  error,
  submitting,
  scheduledLocal,
  scheduleDisabledDays,
  onSelectDay,
  onTimeChange,
  onConfirm,
}: {
  scheduledParts: { date: Date; time: string };
  error: string | null;
  submitting: SubmitAction | null;
  scheduledLocal: string;
  scheduleDisabledDays: { before: Date };
  onSelectDay: (day: Date) => void;
  onTimeChange: (time: string) => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] text-destructive rounded">
          {error}
        </div>
      )}
      <Calendar
        mode="single"
        selected={scheduledParts.date}
        onSelect={(day) => {
          if (!day) return;
          onSelectDay(day);
        }}
        disabled={scheduleDisabledDays}
        className="mx-auto w-full [--cell-size:2.6rem] sm:[--cell-size:2.4rem]"
        classNames={{
          root: "w-full",
          months: "w-full flex flex-col",
          month: "w-full",
          week: "mt-2 flex w-full",
        }}
      />
      <label className="grid gap-1.5 text-xs font-medium">
        Time
        <input
          type="time"
          value={scheduledParts.time}
          onChange={(e) => onTimeChange(e.target.value)}
          className="h-11 w-full border bg-background px-3 text-sm outline-none focus:border-primary rounded"
        />
      </label>
      {scheduledLocal && (
        <p className="text-center text-xs text-muted-foreground">
          Publishes {format(new Date(scheduledLocal), "EEE, MMM d 'at' h:mm a")}
        </p>
      )}
      <button
        type="button"
        onClick={onConfirm}
        disabled={submitting !== null || !scheduledLocal}
        className="inline-flex h-11 w-full items-center justify-center gap-2 bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 rounded disabled:opacity-50"
      >
        {submitting === "schedule" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CalendarClock className="h-4 w-4" />
        )}
        Confirm schedule
      </button>
    </div>
  );
}

const ComposerQuillEditor = forwardRef<
  any,
  {
    value: string;
    commentary: string;
    onEditorChange: (
      nextValue: string,
      delta: unknown,
      source: unknown,
      editor: QuillEditorView,
    ) => void;
    onPlainTextChange: (text: string) => void;
  }
>(function ComposerQuillEditor(
  { value, commentary, onEditorChange, onPlainTextChange },
  ref,
) {
  const [Editor, setEditor] = useState<ReactQuillComponent | null>(
    () => (typeof window === "undefined" ? null : cachedQuillEditor),
  );

  useEffect(() => {
    if (Editor) return;
    let cancelled = false;
    void preloadComposerEditor().then((loaded) => {
      if (!cancelled && loaded) setEditor(() => loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [Editor]);

  if (!Editor) {
    return (
      <textarea
        placeholder="Share what's on your mind…"
        value={commentary}
        onChange={(e) => onPlainTextChange(e.target.value)}
        className="min-h-[160px] w-full p-4 text-sm bg-transparent outline-none resize-none border-none"
      />
    );
  }

  return (
    <Editor
      ref={ref}
      theme="snow"
      value={value}
      onChange={onEditorChange}
      modules={QUILL_MODULES}
      formats={QUILL_FORMATS}
      placeholder="Share what's on your mind…"
    />
  );
});
ComposerQuillEditor.displayName = "ComposerQuillEditor";

export const Route = createFileRoute("/app/manage-posts")({ component: ManagePostsRoute });

function ManagePostsRoute() {
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostRecord | null>(null);
  const [editingPost, setEditingPost] = useState<PostRecord | null>(null);

  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadAccountsAndPosts = async (accId?: string, sync?: boolean) => {
    if (posts.length === 0) {
      setPostsLoading(true);
    }
    try {
      const [accList, postList] = await Promise.all([
        getAccounts(),
        getPosts(accId || undefined, sync),
      ]);
      setAccounts(accList);
      setPosts((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        for (const fetched of postList) {
          map.set(fetched.id, fetched);
        }
        return Array.from(map.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
      });
    } catch (caught) {
      setNotification({
        type: "error",
        text: caught instanceof Error ? caught.message : "Could not load posts or accounts.",
      });
    } finally {
      setAccountsLoading(false);
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    void preloadComposerEditor();
  }, []);

  useEffect(() => {
    void loadAccountsAndPosts(selectedAccountId);
  }, [selectedAccountId]);

  useEffect(() => {
    if (!notification) return;
    const timer = window.setTimeout(() => setNotification(null), 2000);
    return () => window.clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    const handleSavedPost = (event: Event) => {
      const post = (event as CustomEvent<PostRecord>).detail;
      if (!post?.id) return;
      setPosts((prev) => mergeSavedPost(prev, post));
      setStatusFilter((current) => (current === "all" || current === post.status ? current : "all"));
      setNotification({
        type: "success",
        text:
          post.status === "scheduled" && post.scheduled_for
            ? `Post scheduled for ${new Date(post.scheduled_for).toLocaleString()}.`
            : post.status === "published"
              ? "Post published successfully on LinkedIn."
              : post.status === "draft"
                ? "Draft saved."
                : "Post saved.",
      });
    };
    window.addEventListener(POST_SAVED_EVENT, handleSavedPost);
    return () => window.removeEventListener(POST_SAVED_EVENT, handleSavedPost);
  }, []);

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (statusFilter === "all") return true;
      return p.status === statusFilter;
    });
  }, [posts, statusFilter]);

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setNotification({ type: "success", text: "Post deleted successfully." });
    setSelectedPost(null);
  };

  const handlePostUpdated = (updated: PostRecord) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelectedPost(updated);
  };

  return (
    <AppShell pageTitle="Manage Posts">
      <div className="mx-auto max-w-6xl space-y-6 pb-12">
        {/* Page Header - Clean Header without duplicate button */}
        <div className="border bg-card p-6 shadow-soft rounded">
          <h1 className="font-display text-2xl font-bold tracking-tight">Manage Posts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compose, schedule, and view performance analytics across your connected LinkedIn accounts.
          </p>
        </div>

        {notification && (
          <div
            className={`flex items-center justify-between border px-4 py-3 text-sm rounded ${
              notification.type === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-destructive/30 bg-destructive/5 text-destructive"
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <span>{notification.text}</span>
            </div>
            <button type="button" onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="flex flex-col gap-4 border bg-card p-4 shadow-soft md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account:</span>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="border bg-background px-3 py-1.5 text-sm font-medium outline-none focus:border-primary rounded min-w-[220px]"
            >
              <option value="">All Connected Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.display_name} — Personal profile
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void loadAccountsAndPosts(selectedAccountId, true)}
              disabled={postsLoading}
              className="inline-flex items-center gap-1.5 border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted rounded transition shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-primary ${postsLoading ? "animate-spin" : ""}`} /> Sync
            </button>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1 border-t pt-3 md:border-t-0 md:pt-0">
            {(["all", "draft", "scheduled", "published", "failed"] as FilterStatus[]).map((st) => {
              const count = st === "all" ? posts.length : posts.filter((p) => p.status === st).length;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-medium capitalize rounded transition ${
                    statusFilter === st
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {st} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Posts List / Grid */}
        {postsLoading ? (
          <div className="flex min-h-[260px] items-center justify-center border bg-card p-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" /> Loading posts…
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center border border-dashed bg-card p-8 text-center">
            <PenSquare className="mb-3 h-10 w-10 text-muted-foreground/60" />
            <h3 className="text-base font-semibold">No posts found</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {statusFilter === "all"
                ? "You haven't created any posts yet. Click 'Add Post' to compose your first post."
                : `No posts with status '${statusFilter}' found for the selected filter.`}
            </p>
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Create Post
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.map((post) => {
              const acc = accounts.find((a) => a.id === post.account_id);
              const badge = STATUS_BADGES[post.status];
              return (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="group cursor-pointer flex flex-col justify-between border bg-card p-5 shadow-soft transition hover:border-primary hover:shadow-md rounded"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {acc?.profile_image_url ? (
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
                        <span className="truncate text-xs font-semibold text-foreground">
                          {acc?.display_name || "LinkedIn Account"}
                        </span>
                      </div>
                      <span className={`border px-2 py-0.5 text-[11px] font-medium rounded ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>

                    <p className="line-clamp-3 text-sm text-foreground/90 whitespace-pre-wrap">
                      {post.commentary || "(No text commentary)"}
                    </p>

                    {post.article_title && (
                      <div className="border bg-muted/20 p-2.5 text-xs">
                        <div className="font-semibold truncate">{post.article_title}</div>
                        {post.article_source && (
                          <div className="truncate text-muted-foreground">{post.article_source}</div>
                        )}
                      </div>
                    )}

                    {post.media_filename && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground border p-2 rounded bg-muted/10">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate">{post.media_filename}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 border-t pt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {post.published_at
                          ? `Published ${new Date(post.published_at).toLocaleDateString()}`
                          : post.scheduled_for
                          ? `Sched. ${new Date(post.scheduled_for).toLocaleDateString()}`
                          : `Created ${new Date(post.created_at).toLocaleDateString()}`}
                      </span>
                    </div>
                    <span className="text-primary font-medium group-hover:underline">View details →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Real Composer Modal */}
        {composerOpen && (
          <ComposerModal
            accounts={accounts}
            accountsLoading={accountsLoading}
            initialPost={editingPost || undefined}
            onClose={() => {
              setComposerOpen(false);
              setEditingPost(null);
            }}
            onSuccess={(msg, newPost) => {
              setComposerOpen(false);
              setEditingPost(null);
              setNotification({ type: "success", text: msg });
              if (newPost) {
                setPosts((prev) => mergeSavedPost(prev, newPost));
                if (statusFilter !== "all" && statusFilter !== newPost.status) {
                  setStatusFilter("all");
                }
              }
            }}
          />
        )}

        {/* Post Detail & Live Analytics Modal */}
        {selectedPost && (
          <PostDetailAnalyticsModal
            post={selectedPost}
            accounts={accounts}
            onClose={() => setSelectedPost(null)}
            onDeleted={handlePostDeleted}
            onUpdated={handlePostUpdated}
            onEditPost={(postToEdit) => {
              setSelectedPost(null);
              setEditingPost(postToEdit);
              setComposerOpen(true);
            }}
          />
        )}
      </div>
    </AppShell>
  );
}

{/* REAL COMPOSER MODAL (RESPONSIVE & VIEWPORT CONSTRAINED) */}
export function ComposerModal({
  accounts,
  accountsLoading,
  initialScheduledDate,
  initialPost,
  onClose,
  onSuccess,
}: {
  accounts: LinkedInAccount[];
  accountsLoading: boolean;
  initialScheduledDate?: Date;
  initialPost?: PostRecord;
  onClose: () => void;
  onSuccess: (msg: string, post?: PostRecord) => void;
}) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    initialPost?.account_id || accounts.find((a) => a.status === "active")?.id || "",
  );
  const [contentType, setContentType] = useState<ContentType>(
    initialPost?.content_type || "text",
  );
  const rewriteKeyRef = useRef(composerRewriteKey(initialPost?.id));
  const storedRewriteDraftRef = useRef<RewriteDraftRecord | null>(
    loadRewriteDraft(rewriteKeyRef.current),
  );
  const storedRewriteDraft = storedRewriteDraftRef.current;
  const storedVisibleDraft =
    storedRewriteDraft &&
    (storedRewriteDraft.showing === "ai" ? storedRewriteDraft.ai : storedRewriteDraft.original);

  const [editorValue, setEditorValue] = useState(
    storedVisibleDraft?.editorValue ||
      (initialPost?.commentary ? initialPost.commentary.replace(/\n/g, "<br/>") : ""),
  );
  const [editorDelta, setEditorDelta] = useState<string | null>(
    storedVisibleDraft?.editorDelta || initialPost?.editor_delta || null,
  );
  const [commentary, setCommentary] = useState(
    storedVisibleDraft?.commentary || initialPost?.commentary || "",
  );
  const [firstComment, setFirstComment] = useState(initialPost?.first_comment || "");
  const [media, setMedia] = useState<File | null>(null);
  const [articleSource, setArticleSource] = useState(initialPost?.article_source || "");
  const [articleTitle, setArticleTitle] = useState(initialPost?.article_title || "");
  const [articleDescription, setArticleDescription] = useState(initialPost?.article_description || "");
  const [schedulePickerOpen, setSchedulePickerOpen] = useState(false);
  const [scheduledLocal, setScheduledLocal] = useState(() =>
    initialPost?.scheduled_for
      ? toDatetimeLocal(new Date(initialPost.scheduled_for))
      : initialScheduledDate
      ? toDatetimeLocal(initialScheduledDate)
      : "",
  );
  const [submitting, setSubmitting] = useState<SubmitAction | null>(null);
  const [rewriting, setRewriting] = useState(false);
  const [creativeRewrite, setCreativeRewrite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rewriteOriginal, setRewriteOriginal] = useState<EditorSnapshot | null>(
    storedRewriteDraft?.original ?? null,
  );
  const [rewriteAi, setRewriteAi] = useState<EditorSnapshot | null>(storedRewriteDraft?.ai ?? null);
  const [showingRewrite, setShowingRewrite] = useState<"original" | "ai">(
    storedRewriteDraft?.showing ?? "original",
  );
  const quillRef = useRef<ComposerQuillHandle | null>(null);
  const rewriteRequestId = useRef(0);
  const rewritingRef = useRef(false);
  const rewriteOriginalRef = useRef<EditorSnapshot | null>(storedRewriteDraft?.original ?? null);
  const rewriteAiRef = useRef<EditorSnapshot | null>(storedRewriteDraft?.ai ?? null);
  const showingRewriteRef = useRef<"original" | "ai">(storedRewriteDraft?.showing ?? "original");
  const isCompactScreen = useIsCompactScreen();

  const getLiveDraft = (): EditorSnapshot => {
    const editor = quillRef.current?.getEditor?.();
    if (!editor) {
      return { commentary, editorValue, editorDelta };
    }
    const liveCommentary = commentaryFromQuillText(editor.getText());
    return {
      commentary: liveCommentary,
      editorValue: editor.root?.innerHTML || editorHtmlFromPlain(liveCommentary),
      editorDelta: JSON.stringify(editor.getContents()),
    };
  };

  const persistRewritePair = (
    original: EditorSnapshot,
    ai: EditorSnapshot,
    showing: "original" | "ai",
  ) => {
    rewriteOriginalRef.current = original;
    rewriteAiRef.current = ai;
    showingRewriteRef.current = showing;
    setRewriteOriginal(original);
    setRewriteAi(ai);
    setShowingRewrite(showing);
    saveRewriteDraft({
      version: 1,
      postKey: rewriteKeyRef.current,
      original,
      ai,
      showing,
      updatedAt: Date.now(),
    });
  };

  const discardRewriteDraft = () => {
    clearRewriteDraft(rewriteKeyRef.current);
    if (!initialPost?.id) clearNewPostRewriteSession();
    rewriteOriginalRef.current = null;
    rewriteAiRef.current = null;
    showingRewriteRef.current = "original";
    setRewriteOriginal(null);
    setRewriteAi(null);
    setShowingRewrite("original");
  };

  const closeComposer = () => {
    discardRewriteDraft();
    onClose();
  };

  const applyEditorSnapshot = (snapshot: EditorSnapshot, version: "original" | "ai") => {
    showingRewriteRef.current = version;
    setCommentary(snapshot.commentary);
    setEditorValue(snapshot.editorValue);
    setEditorDelta(snapshot.editorDelta);
    setShowingRewrite(version);
    const editor = quillRef.current?.getEditor?.();
    if (!editor) return;
    if (snapshot.editorDelta) {
      try {
        editor.setContents(JSON.parse(snapshot.editorDelta), "silent");
        return;
      } catch {
        // fall through to plain text
      }
    }
    editor.setText(snapshot.commentary, "silent");
  };

  const showRewriteVersion = (version: "original" | "ai") => {
    const currentOriginal = rewriteOriginalRef.current;
    const currentAi = rewriteAiRef.current;
    if (!currentOriginal || !currentAi) return;
    const live = getLiveDraft();
    const showing = showingRewriteRef.current;
    const nextOriginal = showing === "original" ? live : currentOriginal;
    const nextAi = showing === "ai" ? live : currentAi;
    persistRewritePair(nextOriginal, nextAi, version);
    applyEditorSnapshot(version === "ai" ? nextAi : nextOriginal, version);
  };

  const handleRewriteWithAI = async () => {
    const live = getLiveDraft();
    if (!live.commentary.trim() && !articleSource.trim()) {
      setError("Please write some post text or add an article link to rewrite.");
      return;
    }
    const original = rewriteOriginalRef.current ?? live;
    rewriteOriginalRef.current = original;
    showingRewriteRef.current = "original";
    setRewriteOriginal(original);
    setShowingRewrite("original");
    setCommentary(original.commentary);
    setEditorValue(original.editorValue);
    setEditorDelta(original.editorDelta);
    applyEditorSnapshot(original, "original");
    const requestId = ++rewriteRequestId.current;
    rewritingRef.current = true;
    setRewriting(true);
    setError(null);
    try {
      const res = await rewritePostWithAi({
        commentary: live.commentary,
        articleSource,
        creative: creativeRewrite,
      });
      if (requestId !== rewriteRequestId.current) return;
      const rewritten = res.rewritten_commentary;
      const aiSnapshot: EditorSnapshot = {
        commentary: rewritten,
        editorValue: res.html || editorHtmlFromPlain(rewritten),
        editorDelta: res.rewritten_editor_delta || null,
      };
      persistRewritePair(original, aiSnapshot, "ai");
      applyEditorSnapshot(aiSnapshot, "ai");
    } catch (caught) {
      if (requestId !== rewriteRequestId.current) return;
      applyEditorSnapshot(original, "original");
      if (!rewriteAiRef.current) {
        rewriteOriginalRef.current = null;
        setRewriteOriginal(null);
        setShowingRewrite("original");
      }
      setError(
        caught instanceof Error && caught.message.trim()
          ? caught.message
          : "Failed to rewrite post content.",
      );
    } finally {
      if (requestId === rewriteRequestId.current) {
        rewritingRef.current = false;
        setRewriting(false);
      }
    }
  };

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null;
  const activeTab = TABS.find((tab) => tab.id === contentType) ?? TABS[0];

  const handleEditorChange = (
    value: string,
    _delta: unknown,
    source: unknown,
    editor: QuillEditorView,
  ) => {
    const plainText = commentaryFromQuillText(editor.getText());
    if (plainText.length > 3000) {
      setError("Post text cannot exceed 3,000 characters.");
      return;
    }
    if (source === "user") setError(null);
    const live: EditorSnapshot = {
      commentary: plainText,
      editorValue: value,
      editorDelta: JSON.stringify(editor.getContents()),
    };
    setEditorValue(live.editorValue);
    setEditorDelta(live.editorDelta);
    setCommentary(live.commentary);
    if (rewritingRef.current || source !== "user") return;
    const currentOriginal = rewriteOriginalRef.current;
    const currentAi = rewriteAiRef.current;
    if (!currentOriginal || !currentAi) return;
    const showing = showingRewriteRef.current;
    persistRewritePair(
      showing === "original" ? live : currentOriginal,
      showing === "ai" ? live : currentAi,
      showing,
    );
  };

  const handleRejectedFiles = (rejections: FileRejection[]) => {
    const code = rejections[0]?.errors[0]?.code;
    const maxBytes = FILE_LIMITS[contentType] ?? 0;
    setError(
      code === "file-too-large"
        ? `This file exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB limit.`
        : `Unsupported ${activeTab.label.toLowerCase()} file type.`,
    );
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: DROPZONE_ACCEPT[contentType],
    maxFiles: 1,
    maxSize: FILE_LIMITS[contentType],
    multiple: false,
    disabled: !["image", "video", "document"].includes(contentType),
    onDropAccepted: (files: File[]) => {
      setError(null);
      setMedia(files[0] ?? null);
    },
    onDropRejected: handleRejectedFiles,
  });

  const canSubmit =
    commentary.trim().length > 0 ||
    media !== null ||
    (contentType === "article" && articleSource.trim() !== "" && articleTitle.trim() !== "");

  const submit = async (action: SubmitAction) => {
    if (!canSubmit) {
      setError("Write post text or add the content required for this post type.");
      return;
    }
    if (action !== "draft" && !selectedAccountId) {
      setError("Select a connected LinkedIn account.");
      return;
    }
    if (["image", "video", "document"].includes(contentType) && !media && !initialPost) {
      setError(`Select a ${contentType} file.`);
      return;
    }
    if (action === "schedule") {
      if (!scheduledLocal) {
        setError("Choose a date and time for the scheduled post.");
        return;
      }
      if (new Date(scheduledLocal).getTime() < Date.now()) {
        setError("Choose a time that is not in the past.");
        return;
      }
    }

    setSubmitting(action);
    setError(null);
    const live = getLiveDraft();
    setCommentary(live.commentary);
    setEditorValue(live.editorValue);
    setEditorDelta(live.editorDelta);
    try {
      let result: PostRecord;
      if (initialPost) {
        result = await updatePost(initialPost.id, {
          commentary: live.commentary,
          editorDelta: live.editorDelta,
          firstComment,
          accountId: selectedAccountId || null,
          scheduledFor: action === "schedule" ? new Date(scheduledLocal).toISOString() : undefined,
          articleSource,
          articleTitle,
          articleDescription,
          contentType,
          status: action === "schedule" ? "scheduled" : initialPost.status,
        });
        // Publish now must hit LinkedIn immediately — even if the post was scheduled.
        if (action === "publish") {
          result = await publishPostNow(initialPost.id, selectedAccountId || undefined);
        }
      } else {
        result = await createPost({
          action,
          contentType,
          commentary: live.commentary,
          editorDelta: live.editorDelta,
          firstComment,
          accountId: selectedAccountId || null,
          scheduledFor: action === "schedule" ? new Date(scheduledLocal).toISOString() : undefined,
          articleSource,
          articleTitle,
          articleDescription,
          media,
        });
      }
      let msg = initialPost ? "Post updated successfully." : "Draft saved.";
      if (result.status === "published") {
        msg = result.first_comment_status === "published"
          ? "Post and first comment published successfully on LinkedIn."
          : "Post published successfully on LinkedIn.";
      } else if (result.status === "scheduled") {
        msg = `Post scheduled for ${new Date(result.scheduled_for!).toLocaleString()}.`;
      }
      emitSavedPost(result);
      discardRewriteDraft();
      onSuccess(msg, result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The post could not be saved.");
    } finally {
      setSubmitting(null);
    }
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const scheduledParts = splitDatetimeLocal(scheduledLocal);
  const scheduleDisabledDays = {
    before: todayStart,
  };

  const handleSchedulePickerOpen = (open: boolean) => {
    if (open && !scheduledLocal) {
      setScheduledLocal(toDatetimeLocal(defaultScheduleDate()));
    }
    if (open) setError(null);
    setSchedulePickerOpen(open);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5">
      <div className="relative w-full max-w-4xl max-h-[88vh] border bg-card shadow-2xl rounded flex flex-col overflow-hidden">
        {/* Modal Sticky Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 shrink-0 bg-card z-10">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight">
              {initialPost ? "Edit Post" : "Compose a LinkedIn post"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {initialPost
                ? "Update post commentary, media details, first comment, or schedule parameters."
                : "Publish immediately, save a draft, or store a post for a future date."}
            </p>
          </div>
          <button type="button" onClick={closeComposer} className="p-1.5 text-muted-foreground hover:bg-muted rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive rounded">
              {error}
            </div>
          )}

          {/* Account Selector */}
          <div className="border bg-muted/10 p-4 rounded">
            <label htmlFor="modal-posting-account" className="text-xs font-medium text-muted-foreground">
              Posting as
            </label>
            {accountsLoading ? (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading accounts…
              </div>
            ) : accounts.length === 0 ? (
              <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                <span>No LinkedIn account connected</span>
                <Link to="/app/accounts" className="font-medium text-primary hover:underline">
                  Connect an account
                </Link>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-3">
                {selectedAccount?.profile_image_url ? (
                  <img
                    src={selectedAccount.profile_image_url}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0077B5]/10 text-[#0077B5]">
                    <Linkedin className="h-4 w-4" />
                  </span>
                )}
                <select
                  id="modal-posting-account"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="min-w-0 flex-1 border bg-background px-3 py-2 text-sm outline-none focus:border-primary rounded"
                >
                  <option value="">Select a LinkedIn account</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id} disabled={acc.status !== "active"}>
                      {acc.display_name} — Personal profile
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Content Type Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setContentType(tab.id);
                  setMedia(null);
                  setError(null);
                }}
                className={`inline-flex shrink-0 items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium transition rounded ${
                  contentType === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "border bg-card hover:bg-muted"
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" /> {tab.label}
              </button>
            ))}
          </div>

          {/* Editor Container */}
          <div className="border bg-card rounded shadow-soft">
            <div className="flex flex-col gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
              <label
                htmlFor="creative-rewrite"
                className="inline-flex w-fit items-center gap-2 text-xs font-semibold text-foreground"
              >
                <Switch
                  id="creative-rewrite"
                  checked={creativeRewrite}
                  onCheckedChange={setCreativeRewrite}
                  disabled={rewriting}
                />
                Creative mode
              </label>
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleRewriteWithAI}
                    disabled={rewriting || (!commentary.trim() && !articleSource.trim())}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary font-semibold px-3 py-1 text-xs transition disabled:opacity-40"
                  >
                    {rewriting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Rewriting with AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-primary" /> Rewrite with AI
                      </>
                    )}
                  </button>
                  {rewriteOriginal && rewriteAi && (
                    <div className="inline-flex items-center rounded-full border bg-muted/40 p-0.5">
                      <button
                        type="button"
                        onClick={() => showRewriteVersion("original")}
                        disabled={rewriting}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-40 ${
                          showingRewrite === "original"
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Original text
                      </button>
                      <button
                        type="button"
                        onClick={() => showRewriteVersion("ai")}
                        disabled={rewriting}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-40 ${
                          showingRewrite === "ai"
                            ? "bg-card text-primary shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Sparkles className="h-3.5 w-3.5" /> AI text
                      </button>
                    </div>
                  )}
                </div>
                <span className="shrink-0">{commentary.length} / 3,000</span>
              </div>
            </div>
            {rewriting && (
              <p className="border-b px-4 py-1.5 text-[11px] text-muted-foreground">
                {creativeRewrite
                  ? "Rewriting with AI in creative mode. Your original draft stays visible."
                  : "Rewriting with AI. Your original draft stays visible."}
              </p>
            )}
            {!rewriting && rewriteOriginal && rewriteAi && (
              <p className="border-b px-4 py-1.5 text-[11px] text-muted-foreground">
                {showingRewrite === "ai"
                  ? "Showing the AI text. Switch to Original text anytime. This stays on this device until you close or save."
                  : "Showing your original text. Switch to AI text anytime. This stays on this device until you close or save."}
              </p>
            )}
            <div className="linker-quill-editor">
              <ComposerQuillEditor
                ref={quillRef}
                value={editorValue}
                commentary={commentary}
                onEditorChange={handleEditorChange}
                onPlainTextChange={(text) => {
                  const live: EditorSnapshot = {
                    commentary: text,
                    editorValue: editorHtmlFromPlain(text),
                    editorDelta: null,
                  };
                  setCommentary(live.commentary);
                  setEditorValue(live.editorValue);
                  setEditorDelta(null);
                  const currentOriginal = rewriteOriginalRef.current;
                  const currentAi = rewriteAiRef.current;
                  if (!currentOriginal || !currentAi) return;
                  const showing = showingRewriteRef.current;
                  persistRewritePair(
                    showing === "original" ? live : currentOriginal,
                    showing === "ai" ? live : currentAi,
                    showing,
                  );
                }}
              />
            </div>
            <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">
              LinkedIn publishes post commentary as plain text. Formatting is retained in Linker Post drafts and schedules.
            </p>

            {["image", "video", "document"].includes(contentType) && (
              <div className="p-4 pt-0">
                {media ? (
                  <div className="flex items-center gap-3 border bg-muted/20 p-3 rounded">
                    <FileText className="h-6 w-6 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium">{media.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {(media.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                    <button type="button" onClick={() => setMedia(null)} className="p-1 text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    {...getRootProps()}
                    className={`flex min-h-28 w-full cursor-pointer flex-col items-center justify-center border-2 border-dashed p-4 text-center text-xs text-muted-foreground transition rounded hover:border-primary ${
                      isDragActive ? "border-primary bg-brand-soft/50" : ""
                    }`}
                  >
                    <input {...getInputProps()} />
                    <UploadCloud className="mb-2 h-6 w-6 text-primary" />
                    <span className="font-medium text-foreground">
                      {isDragActive ? "Drop file here" : `Choose a ${activeTab.label.toLowerCase()} file`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {contentType === "article" && (
              <div className="grid gap-3 border-t p-4 text-xs">
                <label className="grid gap-1 font-medium">
                  Article URL
                  <input
                    type="url"
                    value={articleSource}
                    onChange={(e) => setArticleSource(e.target.value)}
                    placeholder="https://example.com/article"
                    className="border bg-background px-3 py-2 outline-none focus:border-primary rounded"
                  />
                </label>
                <label className="grid gap-1 font-medium">
                  Article Title
                  <input
                    value={articleTitle}
                    onChange={(e) => setArticleTitle(e.target.value)}
                    className="border bg-background px-3 py-2 outline-none focus:border-primary rounded"
                  />
                </label>
              </div>
            )}

            {/* First Comment */}
            <div className="border-t p-4">
              <label htmlFor="first-comment" className="text-xs font-medium">
                First comment <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="first-comment"
                value={firstComment}
                maxLength={1250}
                rows={3}
                onChange={(e) => setFirstComment(e.target.value)}
                placeholder="Add a link, context, or call to action…"
                className="mt-1.5 w-full resize-y border bg-background px-3 py-2 text-xs outline-none focus:border-primary rounded"
              />
              <div className="mt-1 text-right text-[11px] text-muted-foreground">
                {firstComment.length} / 1,250
              </div>
            </div>
          </div>

        </div>

        {/* Modal Sticky Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-6 py-4 shrink-0 bg-card z-10">
          <button
            type="button"
            onClick={() => void submit("draft")}
            disabled={submitting !== null}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 border px-4 py-2 text-xs font-medium hover:bg-muted rounded disabled:opacity-50"
          >
            {submitting === "draft" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save draft
          </button>
          <div className="flex w-full sm:w-auto gap-2">
            {isCompactScreen ? (
              <>
                <button
                  type="button"
                  disabled={submitting !== null || accounts.length === 0}
                  onClick={() => handleSchedulePickerOpen(true)}
                  className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 border px-3 py-2.5 text-xs font-medium hover:bg-muted rounded disabled:opacity-50 sm:flex-none sm:px-4"
                >
                  <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {scheduledLocal
                      ? `Schedule · ${format(new Date(scheduledLocal), "MMM d, h:mm a")}`
                      : "Schedule"}
                  </span>
                </button>
                <Drawer
                  open={schedulePickerOpen}
                  onOpenChange={handleSchedulePickerOpen}
                  shouldScaleBackground={false}
                >
                  <DrawerContent
                    overlayClassName="z-[90]"
                    className="z-[90] mx-auto w-full max-w-lg pb-[max(1rem,env(safe-area-inset-bottom))]"
                  >
                    <DrawerHeader className="px-5 pb-1 pt-3 text-center sm:text-center">
                      <DrawerTitle className="text-base">Pick a date and time</DrawerTitle>
                      <DrawerDescription className="text-xs">
                        The post will publish to LinkedIn at this local time.
                      </DrawerDescription>
                    </DrawerHeader>
                    <div className="max-h-[min(70vh,34rem)] overflow-y-auto px-5 pb-5">
                      <SchedulePickerPanel
                        scheduledParts={scheduledParts}
                        error={error}
                        submitting={submitting}
                        scheduledLocal={scheduledLocal}
                        scheduleDisabledDays={scheduleDisabledDays}
                        onSelectDay={(day) =>
                          setScheduledLocal(mergeDateAndTime(day, scheduledParts.time))
                        }
                        onTimeChange={(time) =>
                          setScheduledLocal(mergeDateAndTime(scheduledParts.date, time))
                        }
                        onConfirm={() => void submit("schedule")}
                      />
                    </div>
                  </DrawerContent>
                </Drawer>
              </>
            ) : (
              <Popover open={schedulePickerOpen} onOpenChange={handleSchedulePickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    disabled={submitting !== null || accounts.length === 0}
                    className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 border px-4 py-2 text-xs font-medium hover:bg-muted rounded disabled:opacity-50"
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
                    {scheduledLocal
                      ? `Schedule · ${format(new Date(scheduledLocal), "MMM d, h:mm a")}`
                      : "Schedule"}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="center"
                  side="top"
                  sideOffset={10}
                  collisionPadding={16}
                  className="z-[90] w-[min(calc(100vw-2rem),22.5rem)] p-4"
                  onOpenAutoFocus={(event) => event.preventDefault()}
                >
                  <div className="mb-3">
                    <div className="text-sm font-semibold">Pick a date and time</div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      The post will publish to LinkedIn at this local time.
                    </p>
                  </div>
                  <SchedulePickerPanel
                    scheduledParts={scheduledParts}
                    error={error}
                    submitting={submitting}
                    scheduledLocal={scheduledLocal}
                    scheduleDisabledDays={scheduleDisabledDays}
                    onSelectDay={(day) =>
                      setScheduledLocal(mergeDateAndTime(day, scheduledParts.time))
                    }
                    onTimeChange={(time) =>
                      setScheduledLocal(mergeDateAndTime(scheduledParts.date, time))
                    }
                    onConfirm={() => void submit("schedule")}
                  />
                </PopoverContent>
              </Popover>
            )}
            <button
              type="button"
              onClick={() => void submit("publish")}
              disabled={submitting !== null || accounts.length === 0 || !canSubmit}
              className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 bg-primary px-5 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 rounded disabled:opacity-50"
            >
              {submitting === "publish" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Publish now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

{/* POST DETAIL & LIVE ANALYTICS MODAL */}
function PostDetailAnalyticsModal({
  post,
  accounts,
  onClose,
  onDeleted,
  onUpdated,
  onEditPost,
}: {
  post: PostRecord;
  accounts: LinkedInAccount[];
  onClose: () => void;
  onDeleted: (id: string) => void;
  onUpdated: (post: PostRecord) => void;
  onEditPost: (post: PostRecord) => void;
}) {
  const [analytics, setAnalytics] = useState<PostAnalytics | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acc = accounts.find((a) => a.id === post.account_id);
  const isPublished = post.status === "published";

  const fetchLiveStats = async () => {
    if (!isPublished) return;
    setLoadingStats(true);
    try {
      const [statsRes, commentsRes] = await Promise.all([
        getPostAnalytics(post.id),
        getPostComments(post.id),
      ]);
      setAnalytics(statsRes);
      setComments(commentsRes);
    } catch (caught) {
      console.warn("Analytics fetch warning", caught);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    void fetchLiveStats();
  }, [post.id, isPublished]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    setSubmittingComment(true);
    setError(null);
    try {
      const created = await addPostComment(post.id, newCommentText.trim());
      setComments((prev) => [...prev, created]);
      setNewCommentText("");
      if (analytics) {
        setAnalytics({ ...analytics, comments_count: analytics.comments_count + 1 });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not post reply comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDelete = async (deleteFromLinkedIn: boolean) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    setDeleting(true);
    setError(null);
    try {
      await deletePost(post.id, deleteFromLinkedIn);
      onDeleted(post.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete post.");
    } finally {
      setDeleting(false);
    }
  };

  const handlePublishNow = async () => {
    setPublishing(true);
    setError(null);
    try {
      const updated = await publishPostNow(post.id, post.account_id);
      onUpdated(updated);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not publish post.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5">
      <div className="relative w-full max-w-2xl max-h-[88vh] border bg-card shadow-2xl rounded flex flex-col overflow-hidden">
        {/* Sticky Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 shrink-0 bg-card z-10">
          <div className="flex items-center gap-3">
            {acc?.profile_image_url ? (
              <img src={acc.profile_image_url} alt="" className="h-9 w-9 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0077B5]/10 text-[#0077B5]">
                <Linkedin className="h-5 w-5" />
              </span>
            )}
            <div>
              <h3 className="text-base font-bold">{acc?.display_name || "LinkedIn Account"}</h3>
              <p className="text-xs text-muted-foreground">Post Details & Analytics</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-muted-foreground hover:bg-muted rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive rounded">
              {error}
            </div>
          )}

          {/* Live Social Analytics Cards */}
          {isPublished && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Live LinkedIn Performance Stats
                </span>
                <button
                  type="button"
                  onClick={() => void fetchLiveStats()}
                  disabled={loadingStats}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingStats ? "animate-spin" : ""}`} /> Refresh
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="border bg-card p-3 rounded text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                    <ThumbsUp className="h-3.5 w-3.5 text-blue-600" /> Likes
                  </div>
                  <div className="text-xl font-bold">{analytics?.likes_count ?? 0}</div>
                </div>
                <div className="border bg-card p-3 rounded text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600" /> Comments
                  </div>
                  <div className="text-xl font-bold">{analytics?.comments_count ?? comments.length}</div>
                </div>
                <div className="border bg-card p-3 rounded text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                    <Share2 className="h-3.5 w-3.5 text-purple-600" /> Reposts
                  </div>
                  <div className="text-xl font-bold">{analytics?.reposts_count ?? 0}</div>
                </div>
                <div className="border bg-card p-3 rounded text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                    <Eye className="h-3.5 w-3.5 text-orange-600" /> Impressions
                  </div>
                  <div className="text-xl font-bold">{analytics?.impressions_count ?? 0}</div>
                </div>
              </div>
            </div>
          )}

          {/* Post Content */}
          <div className="border bg-muted/10 p-4 rounded space-y-3">
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">{post.commentary}</p>

            {post.article_title && (
              <div className="border bg-card p-3 rounded text-xs space-y-1">
                <div className="font-semibold">{post.article_title}</div>
                {post.article_source && <div className="text-primary truncate">{post.article_source}</div>}
                {post.article_description && <div className="text-muted-foreground">{post.article_description}</div>}
              </div>
            )}

            {post.first_comment && (
              <div className="border-t pt-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">First comment: </span>
                {post.first_comment}
              </div>
            )}
          </div>

          {/* Live Comments & Reply Section */}
          {isPublished && (
            <div className="border-t pt-4 space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Comments & Replies ({comments.length})
              </h4>

              {comments.length === 0 ? (
                <div className="text-xs text-muted-foreground italic py-2">
                  No comments on this post yet. Be the first to reply!
                </div>
              ) : (
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {comments.map((c) => (
                    <div key={c.id} className="border bg-card p-3 rounded text-xs space-y-1">
                      <div className="flex items-center justify-between font-semibold">
                        <span>{c.actor_name || "LinkedIn Member"}</span>
                        {c.created_at && (
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {new Date(Number(c.created_at)).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-foreground/90">{c.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Comment Form */}
              <form onSubmit={(e) => void handleAddComment(e)} className="flex gap-2">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Write a reply or comment on LinkedIn…"
                  className="flex-1 border bg-background px-3 py-2 text-xs outline-none focus:border-primary rounded"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !newCommentText.trim()}
                  className="inline-flex items-center gap-1.5 bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 rounded disabled:opacity-50 shrink-0"
                >
                  {submittingComment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Reply
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-6 py-4 shrink-0 bg-card z-10">
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditPost(post);
              }}
              className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 border border-primary/40 bg-primary/5 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/10 rounded transition"
            >
              <PenSquare className="h-3.5 w-3.5" /> Edit Post
            </button>
            {isPublished ? (
              <button
                type="button"
                onClick={() => void handleDelete(true)}
                disabled={deleting}
                className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 border border-destructive/40 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 rounded disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete from LinkedIn & App
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleDelete(false)}
                disabled={deleting}
                className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 border border-destructive/40 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 rounded disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Post
              </button>
            )}
          </div>

          {!isPublished && (
            <button
              type="button"
              onClick={() => void handlePublishNow()}
              disabled={publishing}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-primary px-5 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 rounded disabled:opacity-50"
            >
              {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Publish Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
