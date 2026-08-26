import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  CalendarDays,
  Check,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  emitSavedPost,
  scheduleAgentRunToCalendar,
  type AgentRecord,
  type AgentRunRecord,
} from "@/lib/api";

type PlannerPostPreview = {
  day?: number;
  title?: string;
  content?: string;
  first_comment?: string | null;
  scheduled_at?: string | null;
  articles?: string[];
  images?: string[];
  angle?: string;
};

type RankedSourcePreview = {
  source_key?: string;
  url?: string;
  title?: string;
  source_name?: string;
  final_score?: number;
};

type StrategyItemPreview = {
  day?: number;
  angle?: string;
  media_focus?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

export function outputRecord(run: AgentRunRecord): Record<string, unknown> | null {
  return asRecord(run.output);
}

export function plannerPostsFrom(run: AgentRunRecord): PlannerPostPreview[] {
  const posts = outputRecord(run)?.posts;
  return Array.isArray(posts) ? (posts as PlannerPostPreview[]) : [];
}

function labelFromKey(key: string): string {
  return key.replaceAll("_", " ");
}

function formatValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  return String(value);
}

function DefinitionList({
  items,
}: {
  items: { label: string; value: unknown }[];
}) {
  const visible = items.filter((item) => item.value != null && item.value !== "");
  if (!visible.length) return null;
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {visible.map((item) => (
        <div key={item.label} className="rounded-lg border bg-background p-3">
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {item.label}
          </dt>
          <dd className="mt-1 text-sm">{formatValue(item.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function NestedPlan({ title, data }: { title: string; data: unknown }) {
  const record = asRecord(data);
  if (!record) return null;
  const items = Object.entries(record).map(([key, value]) => ({
    label: labelFromKey(key),
    value: Array.isArray(value) ? value.join(", ") : value,
  }));
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <DefinitionList items={items} />
    </section>
  );
}

export function AgentRunDetail({
  agentId,
  run,
  agent,
  detail = "posts",
}: {
  agentId: string;
  run: AgentRunRecord;
  agent?: Pick<AgentRecord, "name" | "agent_name" | "description" | "needs">;
  detail?: "posts" | "full";
}) {
  const output = outputRecord(run);
  const posts = plannerPostsFrom(run);
  const plan = asRecord(output?.content_plan);
  const style = asRecord(plan?.content_style);
  const schedule = asRecord(plan?.schedule);
  const sources = asRecord(plan?.source_requirements);
  const media = asRecord(plan?.media);
  const variation = asRecord(plan?.variation);
  const alreadyOnCalendar = Boolean(output?.calendar_scheduled);
  const queries = asStringList(output?.search_queries);
  const strategy = Array.isArray(output?.content_strategy)
    ? (output.content_strategy as StrategyItemPreview[])
    : [];
  const ranked = Array.isArray(output?.ranked_sources)
    ? (output.ranked_sources as RankedSourcePreview[])
    : [];
  const followUps = Array.isArray(output?.follow_up_questions) ? output.follow_up_questions : [];
  const model = typeof output?.model === "string" ? output.model : null;
  const brief = String(output?.combined_input || output?.user_input || run.input || "").trim();

  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(alreadyOnCalendar ? posts.length : 0);
  const [already, setAlready] = useState(alreadyOnCalendar);
  const [error, setError] = useState<string | null>(null);

  const handleSchedule = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await scheduleAgentRunToCalendar(agentId, run.run_id);
      result.posts.forEach((post) => emitSavedPost(post));
      setSavedCount(result.posts.length);
      setAlready(result.already_scheduled);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add these posts to the calendar.");
    } finally {
      setSaving(false);
    }
  };

  if (run.status === "awaiting_input") {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">This run is waiting for follow-up answers.</p>
        {Array.isArray(followUps) && followUps.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {followUps.map((item, index) => {
              const question = asRecord(item);
              return (
                <li key={index}>{String(question?.question || JSON.stringify(item))}</li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }
  if (run.status === "failed") {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        {run.error_message || "This run failed."}
      </div>
    );
  }

  const scheduleActions = posts.length > 0 && (
    savedCount > 0 ? (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700">
          <Check className="h-3.5 w-3.5" />
          {already ? "Already on your calendar" : `${savedCount} added to calendar`}
        </span>
        <Link
          to="/app/calendar"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          Open calendar
        </Link>
      </div>
    ) : (
      <button
        type="button"
        onClick={() => void handleSchedule()}
        disabled={saving}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarDays className="h-3.5 w-3.5" />}
        {saving ? "Adding…" : "Yes, schedule it in my calendar"}
      </button>
    )
  );

  const postsSection = posts.length ? (
    <section className="space-y-3">
      {detail === "full" && (
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Generated posts
        </h3>
      )}
      {posts.map((post, index) => (
        <article key={`${post.day ?? index}-${post.title ?? index}`} className="rounded-xl border bg-card p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Day {post.day ?? index + 1}</span>
            {post.scheduled_at && <span>{new Date(post.scheduled_at).toLocaleString()}</span>}
          </div>
          <h3 className="mt-1 text-sm font-semibold">{post.title || "Untitled post"}</h3>
          {post.angle && <p className="mt-1 text-xs text-muted-foreground">{post.angle}</p>}
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>
          {post.first_comment && (
            <p className="mt-2 text-xs text-muted-foreground">First comment: {post.first_comment}</p>
          )}
          {post.articles && post.articles.length > 0 && (
            <div className="mt-2 space-y-1">
              {post.articles.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 break-all text-xs text-primary hover:underline"
                >
                  {url} <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ))}
            </div>
          )}
        </article>
      ))}
    </section>
  ) : detail === "posts" ? (
    <div className="text-xs text-muted-foreground">No generated posts in this run yet.</div>
  ) : null;

  if (detail === "posts") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {String(plan?.topic || "Content plan")} · {run.status}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {posts.length} post{posts.length === 1 ? "" : "s"}
              {plan?.duration_days ? ` over ${String(plan.duration_days)} days` : ""}.
            </p>
          </div>
          {scheduleActions}
        </div>
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
        {postsSection}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {agent?.name || "Agent run"} · {run.status}
          </div>
          <h2 className="font-display text-xl font-semibold">
            {String(plan?.topic || "Conversation")}
          </h2>
          {agent?.description && (
            <p className="text-sm text-muted-foreground">{agent.description}</p>
          )}
        </div>
        {scheduleActions}
      </div>
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <DefinitionList
        items={[
          { label: "Agent key", value: agent?.agent_name },
          { label: "What it needs", value: agent?.needs },
          { label: "Model", value: model },
          { label: "Run ID", value: run.run_id },
          { label: "Created", value: new Date(run.created_at).toLocaleString() },
          { label: "Posts", value: posts.length || null },
        ]}
      />

      {brief && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Conversation / brief
          </h3>
          <p className="whitespace-pre-wrap rounded-xl border bg-card p-3 text-sm leading-relaxed">
            {brief}
          </p>
        </section>
      )}

      {plan && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Content plan
          </h3>
          <DefinitionList
            items={[
              { label: "Topic", value: plan.topic },
              { label: "Niche", value: plan.niche },
              { label: "Description", value: plan.description },
              { label: "Duration", value: plan.duration_days != null ? `${String(plan.duration_days)} days` : null },
              { label: "Posts per day", value: plan.posts_per_day },
              {
                label: "Constraints",
                value: Array.isArray(plan.user_constraints)
                  ? (plan.user_constraints as unknown[]).join(", ")
                  : plan.user_constraints,
              },
            ]}
          />
          <NestedPlan title="Voice & audience" data={style} />
          <NestedPlan title="Schedule" data={schedule} />
          <NestedPlan title="Sources requested" data={sources} />
          <NestedPlan title="Media" data={media} />
          <NestedPlan title="Variation" data={variation} />
        </section>
      )}

      {queries.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Search queries
          </h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {queries.map((query) => (
              <li key={query}>{query}</li>
            ))}
          </ol>
        </section>
      )}

      {ranked.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ranked sources
          </h3>
          <div className="space-y-2">
            {ranked.map((source, index) => (
              <div key={source.source_key || source.url || index} className="rounded-xl border bg-card p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 font-medium">{source.title || source.url || "Source"}</div>
                  {source.final_score != null && (
                    <span className="text-[11px] text-muted-foreground">Score {source.final_score}</span>
                  )}
                </div>
                {source.source_name && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{source.source_name}</div>
                )}
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 break-all text-xs text-primary hover:underline"
                  >
                    {source.url} <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {strategy.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Day-by-day strategy
          </h3>
          <div className="space-y-2">
            {strategy.map((item, index) => (
              <div key={`${item.day ?? index}`} className="rounded-xl border bg-card p-3 text-sm">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Day {item.day ?? index + 1}
                  {item.media_focus ? ` · ${item.media_focus}` : ""}
                </div>
                <p className="mt-1">{item.angle}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {postsSection}
    </div>
  );
}
