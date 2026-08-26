const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

if (!configuredApiUrl) {
  throw new Error("VITE_API_URL is required");
}

export const API_URL = configuredApiUrl.replace(/\/$/, "");

export type AuthUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
};

export type LinkedInAccount = {
  id: string;
  provider: "linkedin";
  provider_account_id: string;
  account_type: "member";
  display_name: string;
  given_name: string | null;
  family_name: string | null;
  email: string | null;
  email_verified: boolean | null;
  profile_image_url: string | null;
  locale: string | Record<string, string> | null;
  token_expires_at: string;
  scopes: string[];
  status: "active" | "expired" | "revoked";
  last_synced_at: string;
  created_at: string;
};

export type PostRecord = {
  id: string;
  account_id: string | null;
  status: "draft" | "scheduled" | "publishing" | "published" | "failed";
  content_type: "text" | "image" | "video" | "document" | "article";
  commentary: string;
  editor_delta: string | null;
  first_comment: string | null;
  first_comment_status: "pending" | "published" | "failed" | null;
  first_comment_error: string | null;
  article_source: string | null;
  article_title: string | null;
  article_description: string | null;
  media_filename: string | null;
  media_content_type: string | null;
  media_size: number | null;
  linkedin_media_urn: string | null;
  linkedin_post_urn: string | null;
  linkedin_comment_id: string | null;
  linkedin_comment_urn: string | null;
  scheduled_for: string | null;
  published_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
};

export const POST_SAVED_EVENT = "linker-post-saved";

export function normalizePost(post: PostRecord): PostRecord {
  return {
    ...post,
    id: String(post.id),
    account_id: post.account_id == null ? null : String(post.account_id),
  };
}

export function mergeSavedPost(posts: PostRecord[], post: PostRecord): PostRecord[] {
  const saved = normalizePost(post);
  return [saved, ...posts.filter((item) => String(item.id) !== saved.id)].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function emitSavedPost(post: PostRecord): void {
  if (typeof window === "undefined" || !post?.id) return;
  window.dispatchEvent(new CustomEvent(POST_SAVED_EVENT, { detail: normalizePost(post) }));
}

export type AgentRecord = {
  id: string;
  user_id: string | null;
  agent_name: string;
  key: string;
  name: string;
  description: string;
  needs: string;
  persona: "creator" | "hr" | "custom";
  mode: "Draft only" | "Auto publish" | "Approval required";
  is_active: boolean;
  auto_save_to_library: boolean;
  notify_on_completion: boolean;
  total_runs: number;
  next_run: string | null;
  run_cadence_datetimes: string[];
  created_at: string;
  updated_at: string;
};

export type AgentRunRecord = {
  id: string;
  run_id: string;
  user_id: string;
  agent_id: string;
  input: string;
  output: unknown;
  status: string;
  error_message: string | null;
  created_at: string;
};

export type LibraryRunItem = {
  id: string;
  run_id: string;
  agent_id: string;
  agent_name: string;
  agent_display_name: string;
  agent_description: string;
  agent_needs: string;
  input: string;
  status: string;
  error_message: string | null;
  created_at: string;
  title: string | null;
  model: string | null;
  post_count: number;
  calendar_scheduled: boolean;
};

type AuthResponse = {
  user: AuthUser;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseError(response: Response): Promise<ApiError> {
  let message = "The request could not be completed.";
  try {
    const body = (await response.json()) as { detail?: string };
    if (typeof body.detail === "string") message = body.detail;
  } catch {
    // Keep the safe generic error when the server did not return JSON.
  }
  return new ApiError(message, response.status);
}

async function getCsrfToken(): Promise<string> {
  const response = await fetch(`${API_URL}/api/auth/csrf`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw await parseError(response);
  const body = (await response.json()) as { csrf_token: string };
  return body.csrf_token;
}

async function request<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "DELETE" | "PATCH";
    body?: unknown;
    csrf?: boolean;
    cache?: RequestCache;
  } = {},
): Promise<T> {
  const send = async (csrfToken?: string) => {
    const headers = new Headers({ Accept: "application/json" });
    if (options.body !== undefined) headers.set("Content-Type", "application/json");
    if (csrfToken) headers.set("X-CSRF-Token", csrfToken);
    return fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      credentials: "include",
      cache: options.cache,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  };

  let csrfToken = options.csrf ? await getCsrfToken() : undefined;
  let response = await send(csrfToken);
  if (options.csrf && response.status === 403) {
    csrfToken = await getCsrfToken();
    response = await send(csrfToken);
  }
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function signup(input: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}): Promise<AuthUser> {
  const result = await request<AuthResponse>("/api/auth/signup", {
    method: "POST",
    body: input,
    csrf: true,
  });
  return result.user;
}

export async function login(input: { email: string; password: string }): Promise<AuthUser> {
  const result = await request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: input,
    csrf: true,
  });
  return result.user;
}

/** Complete Google OAuth after redirect — sets session cookies on this FE origin (CHIPS). */
export async function exchangeGoogleSession(code: string): Promise<AuthUser> {
  const result = await request<AuthResponse>("/api/auth/google/session", {
    method: "POST",
    body: { code },
    csrf: true,
  });
  return result.user;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const result = await request<AuthResponse>("/api/auth/me");
  return result.user;
}

export type NotificationPrefs = {
  post_failures: boolean;
  channel_updates: boolean;
  collaboration: boolean;
  publish_confirmations: boolean;
  empty_queue: boolean;
  billing: boolean;
  daily_recap: boolean;
  weekly_report: boolean;
};

export type UserSettingsRecord = {
  backup_email: string | null;
  headline: string | null;
  bio: string | null;
  company: string | null;
  appearance: string;
  timezone: string;
  time_format: string;
  week_start: string;
  landing_page: string;
  notification_prefs: NotificationPrefs;
  referral_code: string;
  referral_url: string;
};

export async function getPublicConfig(): Promise<{ pricing_enabled: boolean }> {
  return request("/api/config");
}

export async function getUserSettings(): Promise<UserSettingsRecord> {
  return request("/api/settings");
}

export async function updateProfile(input: {
  first_name?: string;
  last_name?: string;
  headline?: string | null;
  bio?: string | null;
  company?: string | null;
  password?: string;
}): Promise<AuthUser> {
  const result = await request<AuthResponse>("/api/settings/profile", {
    method: "PATCH",
    csrf: true,
    body: input,
  });
  return result.user;
}

export async function updateUserSettings(
  input: Partial<Omit<UserSettingsRecord, "referral_code" | "referral_url" | "backup_email">> & {
    notification_prefs?: NotificationPrefs;
  },
): Promise<UserSettingsRecord> {
  return request("/api/settings", {
    method: "PATCH",
    csrf: true,
    body: input,
  });
}

export async function createSupportTicket(input: {
  kind: "support" | "feature" | "feedback";
  category?: string;
  title: string;
  body: string;
}): Promise<{ id: string }> {
  return request("/api/settings/support", {
    method: "POST",
    csrf: true,
    body: input,
  });
}

export function startGoogleAuth(): void {
  window.location.assign(`${API_URL}/api/auth/google`);
}

export type AssistantLink = {
  label: string;
  path: string;
};

export type AssistantChatResponse = {
  reply: string;
  links: AssistantLink[];
};

export async function chatWithAssistant(input: {
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
}): Promise<AssistantChatResponse> {
  return request("/api/assistant/chat", {
    method: "POST",
    csrf: true,
    body: input,
  });
}

export async function logout(): Promise<void> {
  await request<{ message: string }>("/api/auth/logout", {
    method: "POST",
    csrf: true,
  });
}

export type PostAnalytics = {
  post_id: string;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  impressions_count: number;
};

export type PostComment = {
  id: string;
  actor_urn: string;
  actor_name?: string | null;
  text: string;
  created_at?: number | string | null;
};

export async function getAccounts(): Promise<LinkedInAccount[]> {
  const result = await request<{ accounts: LinkedInAccount[] }>("/api/accounts");
  return result.accounts;
}

export async function getPosts(accountId?: string, sync?: boolean): Promise<PostRecord[]> {
  const params = new URLSearchParams();
  if (accountId) params.set("account_id", accountId);
  if (sync) params.set("sync", "true");
  const query = params.toString() ? `?${params.toString()}` : "";
  const result = await request<{ posts: PostRecord[] }>(`/api/posts${query}`);
  return result.posts.map(normalizePost);
}

export async function getPostAnalytics(postId: string): Promise<PostAnalytics> {
  return await request<PostAnalytics>(`/api/posts/${encodeURIComponent(postId)}/analytics`);
}

export async function getPostComments(postId: string): Promise<PostComment[]> {
  const res = await request<{ post_id: string; comments: PostComment[] }>(
    `/api/posts/${encodeURIComponent(postId)}/comments`,
  );
  return res.comments;
}

export async function addPostComment(
  postId: string,
  text: string,
  parentCommentUrn?: string,
): Promise<PostComment> {
  return await request<PostComment>(`/api/posts/${encodeURIComponent(postId)}/comments`, {
    method: "POST",
    body: { text, parent_comment_urn: parentCommentUrn },
    csrf: true,
  });
}

export async function connectLinkedIn(
  returnTo: "/app/accounts" | "/onboarding" = "/app/accounts",
): Promise<void> {
  const result = await request<{ authorization_url: string }>("/api/linkedin/connect", {
    method: "POST",
    body: { return_to: returnTo },
    csrf: true,
  });
  window.location.assign(result.authorization_url);
}

export async function disconnectAccount(accountId: string): Promise<void> {
  await request<{ message: string }>(`/api/accounts/${encodeURIComponent(accountId)}`, {
    method: "DELETE",
    csrf: true,
  });
}

export async function createPost(input: {
  action: "draft" | "schedule" | "publish";
  contentType: PostRecord["content_type"];
  commentary: string;
  editorDelta?: string | null;
  firstComment?: string;
  accountId: string | null;
  scheduledFor?: string;
  articleSource?: string;
  articleTitle?: string;
  articleDescription?: string;
  media?: File | null;
}): Promise<PostRecord> {
  const form = new FormData();
  form.set("action", input.action);
  form.set("content_type", input.contentType);
  form.set("commentary", input.commentary);
  if (input.editorDelta) form.set("editor_delta", input.editorDelta);
  if (input.firstComment) form.set("first_comment", input.firstComment);
  if (input.accountId) form.set("account_id", input.accountId);
  if (input.scheduledFor) form.set("scheduled_for", input.scheduledFor);
  if (input.articleSource) form.set("article_source", input.articleSource);
  if (input.articleTitle) form.set("article_title", input.articleTitle);
  if (input.articleDescription) form.set("article_description", input.articleDescription);
  if (input.media) form.set("media", input.media);

  const response = await fetch(`${API_URL}/api/posts`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "X-CSRF-Token": await getCsrfToken(),
    },
    body: form,
  });
  if (!response.ok) throw await parseError(response);
  return normalizePost((await response.json()) as PostRecord);
}

export async function deletePost(
  postId: string,
  deleteFromLinkedIn: boolean = false,
): Promise<void> {
  const query = deleteFromLinkedIn ? "?delete_from_linkedin=true" : "";
  await request<{ message: string }>(`/api/posts/${encodeURIComponent(postId)}${query}`, {
    method: "DELETE",
    csrf: true,
  });
}

export async function publishPostNow(
  postId: string,
  accountId?: string | null,
): Promise<PostRecord> {
  return normalizePost(
    await request<PostRecord>(`/api/posts/${encodeURIComponent(postId)}/publish`, {
      method: "POST",
      body: accountId ? { account_id: accountId } : {},
      csrf: true,
    }),
  );
}

export async function updatePost(
  postId: string,
  input: {
    scheduledFor?: string | null;
    accountId?: string | null;
    status?: PostRecord["status"];
    commentary?: string;
    editorDelta?: string | null;
    firstComment?: string | null;
    articleSource?: string | null;
    articleTitle?: string | null;
    articleDescription?: string | null;
    contentType?: PostRecord["content_type"];
  },
): Promise<PostRecord> {
  return normalizePost(
    await request<PostRecord>(`/api/posts/${encodeURIComponent(postId)}`, {
      method: "PATCH",
      body: {
        scheduled_for: input.scheduledFor,
        account_id: input.accountId,
        status: input.status,
        commentary: input.commentary,
        editor_delta: input.editorDelta,
        first_comment: input.firstComment,
        article_source: input.articleSource,
        article_title: input.articleTitle,
        article_description: input.articleDescription,
        content_type: input.contentType,
      },
      csrf: true,
    }),
  );
}

export function linkedInOAuthErrorMessage(code: string | null): string {
  const messages: Record<string, string> = {
    authorization_denied: "LinkedIn authorization was cancelled or denied.",
    user_cancelled_login: "LinkedIn login was cancelled.",
    user_cancelled: "LinkedIn login was cancelled.",
    unauthorized_scope_error:
      "LinkedIn rejected one of the requested scopes. Make sure the 'Share on LinkedIn' product is enabled on your app in LinkedIn Developer Portal.",
    redirect_uri_mismatch:
      "The LinkedIn redirect URL does not exactly match the URL configured in LinkedIn Developer Portal.",
    credentials_invalid: "LinkedIn rejected the configured Client ID or Client Secret.",
    code_exchange_failed:
      "LinkedIn rejected the authorization code. Check the redirect URL and try connecting again.",
    token_response_invalid: "LinkedIn returned an unexpected token response.",
    profile_permission_failed:
      "LinkedIn connected, but profile access failed. Enable the OpenID Connect product and its profile permission.",
    permission_missing:
      "LinkedIn connected, but post publishing permission (w_member_social) was not granted. Ensure the 'Share on LinkedIn' product is added in your LinkedIn Developer Portal app and grant all permissions.",
    profile_response_invalid: "LinkedIn returned an unexpected profile response.",
    linkedin_unavailable: "LinkedIn could not be reached. Please try again shortly.",
    token_encryption_failed: "The server token-encryption configuration is invalid.",
  };
  return messages[code ?? ""] ?? "LinkedIn could not be connected. Please try again.";
}

export async function getAgents(): Promise<{ agents: AgentRecord[] }> {
  return await request<{ agents: AgentRecord[] }>("/api/agents");
}

export async function createAgent(input: {
  name: string;
  agent_name: string;
  description?: string;
  needs?: string;
  persona?: "creator" | "hr" | "custom";
  mode?: "Draft only" | "Auto publish" | "Approval required";
  is_active?: boolean;
  auto_save_to_library?: boolean;
  notify_on_completion?: boolean;
  run_cadence_datetimes?: string[];
}): Promise<AgentRecord> {
  return await request<AgentRecord>("/api/agents", {
    method: "POST",
    body: input,
    csrf: true,
  });
}

export async function updateAgent(
  agentId: string,
  input: {
    name?: string;
    description?: string;
    needs?: string;
    mode?: "Draft only" | "Auto publish" | "Approval required";
    is_active?: boolean;
    auto_save_to_library?: boolean;
    notify_on_completion?: boolean;
    next_run?: string | null;
    run_cadence_datetimes?: string[];
  },
): Promise<AgentRecord> {
  return await request<AgentRecord>(`/api/agents/${encodeURIComponent(agentId)}`, {
    method: "PATCH",
    body: input,
    csrf: true,
  });
}

export async function deleteAgent(agentId: string): Promise<void> {
  await request<void>(`/api/agents/${encodeURIComponent(agentId)}`, {
    method: "DELETE",
    csrf: true,
  });
}

export type FollowUpQuestion = {
  field_key: string;
  question: string;
  placeholder?: string;
  suggestions?: string[];
  input_type?: "text" | "number";
};

export type FollowUpAnswer = {
  field_key: string;
  question: string;
  answer: string;
};

export async function runAgentApi(
  agentId: string,
  input:
    | string
    | {
        input: string;
        run_id?: string;
        answers?: FollowUpAnswer[];
        follow_up_round?: number;
      },
): Promise<AgentRunRecord> {
  const body = typeof input === "string" ? { input } : input;
  return await request<AgentRunRecord>(`/api/agents/${encodeURIComponent(agentId)}/run`, {
    method: "POST",
    body,
    csrf: true,
  });
}

export async function getLibraryRuns(): Promise<{ runs: LibraryRunItem[] }> {
  return await request<{ runs: LibraryRunItem[] }>("/api/agents/library");
}

export async function getAgentRuns(agentId: string): Promise<{ runs: AgentRunRecord[] }> {
  return await request<{ runs: AgentRunRecord[] }>(
    `/api/agents/${encodeURIComponent(agentId)}/runs`,
  );
}

export async function getAgentRun(agentId: string, runId: string): Promise<AgentRunRecord> {
  return await request<AgentRunRecord>(
    `/api/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}`,
  );
}

export async function scheduleAgentRunToCalendar(
  agentId: string,
  runId: string,
): Promise<{ posts: PostRecord[]; already_scheduled: boolean }> {
  const result = await request<{ posts: PostRecord[]; already_scheduled: boolean }>(
    `/api/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}/calendar`,
    { method: "POST", csrf: true },
  );
  return {
    posts: result.posts.map(normalizePost),
    already_scheduled: result.already_scheduled,
  };
}

export type NotificationRecord = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  kind: string;
  agent_id: string | null;
  run_id: string | null;
  read_at: string | null;
  created_at: string;
  read: boolean;
};

export async function getNotifications(): Promise<{
  notifications: NotificationRecord[];
  unread_count: number;
}> {
  return request("/api/notifications");
}

export async function getUnreadNotificationCount(): Promise<{ unread_count: number }> {
  return request("/api/notifications/unread-count");
}

export async function markNotificationRead(notificationId: string): Promise<NotificationRecord> {
  return request(`/api/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "POST",
    csrf: true,
  });
}

export async function markAllNotificationsRead(): Promise<{ unread_count: number }> {
  return request("/api/notifications/read-all", {
    method: "POST",
    csrf: true,
  });
}

export type LlmUsageSummary = {
  period: "today" | "month" | "all";
  period_start: string;
  period_end: string;
  request_count: number;
  requests_ok: number;
  requests_failed: number;
  requests_cancelled: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cached_tokens: number;
  avg_tokens_per_request: number;
  max_tokens_per_request: number;
  estimated_cost_usd: string | number;
  monthly_token_soft_limit: number;
  token_usage_pct: number;
  primary_model: string | null;
  primary_provider: string | null;
  selected_model: string | null;
  available_models: string[];
  by_feature: Record<string, number>;
  by_model: Record<string, number>;
};

export async function getLlmUsage(
  period: "today" | "month" | "all" = "month",
  model: string = "all",
): Promise<LlmUsageSummary> {
  const params = new URLSearchParams({ period });
  if (model && model !== "all") params.set("model", model);
  return request(`/api/usage/llm?${params.toString()}`);
}

export async function rewritePostWithAi(input: {
  commentary: string;
  articleSource?: string;
  creative?: boolean;
}): Promise<{
  rewritten_commentary: string;
  rewritten_editor_delta?: string | null;
  html?: string;
}> {
  return request("/api/posts/rewrite-ai", {
    method: "POST",
    csrf: true,
    cache: "no-store",
    body: {
      commentary: input.commentary,
      article_source: input.articleSource,
      creative: Boolean(input.creative),
    },
  });
}
