export type RewriteDraftSnapshot = {
  commentary: string;
  editorValue: string;
  editorDelta: string | null;
};

export type RewriteDraftRecord = {
  version: 1;
  postKey: string;
  original: RewriteDraftSnapshot;
  ai: RewriteDraftSnapshot;
  showing: "original" | "ai";
  updatedAt: number;
};

const DRAFT_PREFIX = "linkerpost.rewrite-draft.";
const NEW_POST_SESSION_KEY = "linkerpost.rewrite-session.new-post";

function draftStorageKey(postKey: string): string {
  return `${DRAFT_PREFIX}${postKey}`;
}

export function composerRewriteKey(postId?: string | null): string {
  if (postId) return `post:${postId}`;
  if (typeof window === "undefined") return "new:pending";
  const existing = sessionStorage.getItem(NEW_POST_SESSION_KEY);
  if (existing) return `new:${existing}`;
  const id = crypto.randomUUID();
  sessionStorage.setItem(NEW_POST_SESSION_KEY, id);
  return `new:${id}`;
}

export function clearNewPostRewriteSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(NEW_POST_SESSION_KEY);
}

function isSnapshot(value: unknown): value is RewriteDraftSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as RewriteDraftSnapshot;
  return typeof snapshot.commentary === "string" && typeof snapshot.editorValue === "string";
}

export function loadRewriteDraft(postKey: string): RewriteDraftRecord | null {
  if (typeof window === "undefined" || !postKey) return null;
  try {
    const raw = localStorage.getItem(draftStorageKey(postKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RewriteDraftRecord;
    if (
      parsed.version !== 1 ||
      parsed.postKey !== postKey ||
      !isSnapshot(parsed.original) ||
      !isSnapshot(parsed.ai) ||
      (parsed.showing !== "original" && parsed.showing !== "ai")
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveRewriteDraft(record: RewriteDraftRecord): void {
  if (typeof window === "undefined" || !record.postKey) return;
  try {
    localStorage.setItem(draftStorageKey(record.postKey), JSON.stringify(record));
  } catch {
    // Ignore quota / private-mode failures; the in-memory pair still works for this session.
  }
}

export function clearRewriteDraft(postKey: string): void {
  if (typeof window === "undefined" || !postKey) return;
  localStorage.removeItem(draftStorageKey(postKey));
}

export function commentaryFromQuillText(text: string): string {
  return text.replace(/\u00a0/g, " ").replace(/\n$/, "");
}
