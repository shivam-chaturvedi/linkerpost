import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { AgentRunDetail } from "@/components/app/AgentRunDetail";
import { HR_FEATURE_ENABLED } from "@/lib/features";
import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import {
  AgentRecord,
  AgentRunRecord,
  FollowUpQuestion,
  getAgents,
  updateAgent,
  runAgentApi,
  getAgentRuns,
  getAgentRun,
} from "@/lib/api";
import {
  Bot,
  Wand2 as Sparkles,
  CalendarDays,
  Layers,
  Zap,
  Recycle,
  Play,
  Pause,
  Settings,
  FileText,
  Users2,
  MessageSquare,
  History,
  Loader2,
  Plus,
  Trash2,
  X,
  Clock,
  Activity,
} from "lucide-react";

export const Route = createFileRoute("/app/agents")({
  component: () => (
    <AppShell pageTitle="Agents" rightPanel={<RightPanel />}>
      <Agents />
    </AppShell>
  ),
});

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  ai_content_planner: CalendarDays,
  idea: Sparkles,
  writer: Layers,
  planner: CalendarDays,
  repurpose: Recycle,
  autoqueue: Zap,
  resume: FileText,
  screener: Users2,
  interviewer: CalendarDays,
  jd: MessageSquare,
};

const COLOR_MAP: Record<string, string> = {
  ai_content_planner: "text-primary bg-brand-soft",
  idea: "text-primary bg-brand-soft",
  writer: "text-emerald-700 bg-emerald-500/10",
  planner: "text-amber-700 bg-amber-500/10",
  repurpose: "text-purple-700 bg-purple-500/10",
  autoqueue: "text-rose-700 bg-rose-500/10",
  resume: "text-primary bg-brand-soft",
  screener: "text-emerald-700 bg-emerald-500/10",
  interviewer: "text-amber-700 bg-amber-500/10",
  jd: "text-purple-700 bg-purple-500/10",
};

/** Human-in-the-loop agents: no automatic run cadence / scheduler UI. */
const INTERACTIVE_AGENT_NAMES = new Set(["ai_content_planner"]);

function agentSupportsCadence(agent: AgentRecord): boolean {
  return !INTERACTIVE_AGENT_NAMES.has(agent.agent_name || agent.key);
}

function getAgentIcon(key: string): ComponentType<{ className?: string }> {
  return ICON_MAP[key] || Bot;
}

function getAgentColor(key: string): string {
  return COLOR_MAP[key] || "text-primary bg-brand-soft";
}

function Agents() {
  const [persona, setPersona] = useState<"creator" | "hr">("creator");
  const [agentsList, setAgentsList] = useState<AgentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [configAgent, setConfigAgent] = useState<AgentRecord | null>(null);
  const [runAgent, setRunAgent] = useState<AgentRecord | null>(null);
  const [runsAgent, setRunsAgent] = useState<AgentRecord | null>(null);

  const fetchAgentsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAgents();
      setAgentsList(res.agents);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not load agents";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const p = localStorage.getItem("linker-post-persona");
    if ((HR_FEATURE_ENABLED && p === "hr") || p === "creator") {
      setPersona(p as "creator" | "hr");
    }
    fetchAgentsData();
  }, []);

  const agents = agentsList;

  const handleToggleActive = async (agent: AgentRecord) => {
    try {
      const updated = await updateAgent(agent.id, { is_active: !agent.is_active });
      setAgentsList((prev) => prev.map((a) => (a.id === agent.id ? updated : a)));
      window.dispatchEvent(
        new CustomEvent("agent-updated", { detail: { agent: updated } }),
      );
    } catch (err: unknown) {
      console.error("Failed to toggle agent state:", err);
    }
  };

  const handleRunAgent = (agent: AgentRecord) => {
    setRunAgent(agent);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Agents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {persona === "hr"
              ? "AI recruiters that read JDs, tune resumes and rank candidates."
              : "AI teammates that ideate, draft, plan and publish for you."}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Loading agents...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
          {error}
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-soft">
          <Bot className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <h3 className="mt-3 font-display text-lg font-semibold">No agents found</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            No agents are available yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {agents.map((a) => {
            const AgentIcon = getAgentIcon(a.agent_name || a.key);
            const colorClass = getAgentColor(a.agent_name || a.key);
            const supportsCadence = agentSupportsCadence(a);
            const nextRunFormatted =
              a.run_cadence_datetimes && a.run_cadence_datetimes.length > 0
                ? `${a.run_cadence_datetimes.length} scheduled`
                : "Not scheduled";

            return (
              <div
                key={a.id}
                className={`rounded-2xl border bg-card p-5 shadow-soft transition ${!a.is_active ? "opacity-75" : ""
                  }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${colorClass}`}
                  >
                    <AgentIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-display text-lg">{a.name}</div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${a.is_active
                            ? "bg-emerald-500/10 text-emerald-700"
                            : "bg-muted text-muted-foreground"
                          }`}
                      >
                        {a.is_active ? "Active" : "Paused"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>
                  </div>
                  <button
                    onClick={() => handleToggleActive(a)}
                    aria-label={a.is_active ? "Pause agent" : "Activate agent"}
                    className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${a.is_active ? "bg-primary border-primary" : "bg-muted border-border/80"
                      }`}
                  >
                    <span
                      className={`absolute top-0.5 h-[18px] w-[18px] rounded-full transition-all shadow-sm ${a.is_active
                          ? "left-[21px] bg-white"
                          : "left-0.5 bg-background border border-border/80"
                        }`}
                    />
                  </button>
                </div>

                <div className="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-[11px]">
                  <span className="uppercase tracking-wider text-muted-foreground">Needs:</span>{" "}
                  <span className="font-medium text-foreground">{a.needs || "None specified"}</span>
                </div>

                <div
                  className={`mt-3 grid gap-2 text-xs ${supportsCadence ? "grid-cols-2" : "grid-cols-1"}`}
                >
                  {supportsCadence ? (
                    <Cell label="Next run" value={nextRunFormatted} />
                  ) : null}
                  <Cell label="Total runs" value={String(a.total_runs)} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRunAgent(a)}
                    disabled={!a.is_active}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Play className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Run now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRunsAgent(a)}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 text-xs font-medium text-foreground transition hover:bg-muted"
                  >
                    <History className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Previous runs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(a)}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 text-xs font-medium text-foreground transition hover:bg-muted"
                  >
                    {a.is_active ? (
                      <>
                        <Pause className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Resume</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfigAgent(a)}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 text-xs font-medium text-foreground transition hover:bg-muted"
                  >
                    <Settings className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Configure</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {runAgent && (
        <RunAgentModal
          agent={runAgent}
          onClose={() => setRunAgent(null)}
          onFinished={(updatedRuns) => {
            if (updatedRuns.status === "awaiting_input") return;
            void fetchAgentsData();
            window.dispatchEvent(new CustomEvent("agent-ran", { detail: { agent: runAgent, run: updatedRuns } }));
          }}
        />
      )}

      {runsAgent && (
        <PreviousRunsModal agent={runsAgent} onClose={() => setRunsAgent(null)} />
      )}

      {configAgent && (
        <ConfigureModal
          agent={configAgent}
          onClose={() => setConfigAgent(null)}
          onSaved={(updated) => {
            setAgentsList((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
            setConfigAgent(null);
          }}
        />
      )}
    </div>
  );
}

function followUpQuestionsFrom(run: AgentRunRecord): FollowUpQuestion[] {
  if (!run.output || typeof run.output !== "object") return [];
  const output = run.output as { status?: string; follow_up_questions?: FollowUpQuestion[] };
  if ((run.status === "awaiting_input" || output.status === "awaiting_input") && Array.isArray(output.follow_up_questions)) {
    return output.follow_up_questions.filter((item) => item?.field_key && item?.question);
  }
  return [];
}

function RunAgentModal({
  agent,
  onClose,
  onFinished,
}: {
  agent: AgentRecord;
  onClose: () => void;
  onFinished: (run: AgentRunRecord) => void;
}) {
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgentRunRecord | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [followUpRound, setFollowUpRound] = useState(0);
  const [questions, setQuestions] = useState<FollowUpQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const awaiting = questions.length > 0;
  const answersReady = !awaiting || questions.every((item) => (answers[item.field_key] || "").trim());
  const canSubmit = running ? false : awaiting ? answersReady : Boolean(input.trim());

  const handleRun = async () => {
    if (!canSubmit) return;
    setRunning(true);
    setError(null);
    try {
      const run = await runAgentApi(agent.id, {
        input: input.trim(),
        run_id: runId ?? undefined,
        follow_up_round: followUpRound,
        answers: awaiting
          ? questions.map((item) => ({
              field_key: item.field_key,
              question: item.question,
              answer: (answers[item.field_key] || "").trim(),
            }))
          : [],
      });
      setResult(run);
      setRunId(run.run_id);
      const nextQuestions = followUpQuestionsFrom(run);
      const output = run.output as { follow_up_round?: number; combined_input?: string } | null;
      if (typeof output?.combined_input === "string" && output.combined_input.trim()) {
        setInput(output.combined_input);
      }
      if (nextQuestions.length > 0) {
        setQuestions(nextQuestions);
        setAnswers({});
        setFollowUpRound(Number(output?.follow_up_round) || followUpRound + 1);
        return;
      }
      setQuestions([]);
      onFinished(run);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The agent could not complete this run.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-2xl overflow-hidden border bg-background shadow-soft-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b bg-card p-4">
          <div>
            <div className="font-display text-base font-bold">Run {agent.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {awaiting ? "Answer the follow-up questions so the planner can start." : agent.needs}
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[75vh] space-y-4 overflow-y-auto p-5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={awaiting ? 4 : 5}
            placeholder="Create LinkedIn content about AI agents for the next 15 days. Make every post different but related."
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            disabled={running || awaiting}
          />
          {awaiting && (
            <div className="space-y-4">
              {questions.map((item) => {
                const chips = (item.suggestions?.length
                  ? item.suggestions
                  : item.placeholder
                    ? [item.placeholder.replace(/^\s*(e\.g\.|eg\.|example:|ex:)\s*/i, "").trim()]
                    : []
                ).filter(Boolean);
                const selected = (answers[item.field_key] || "").trim();
                return (
                  <div key={item.field_key} className="space-y-2">
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium">{item.question}</span>
                      <input
                        type={item.input_type === "number" ? "number" : "text"}
                        value={answers[item.field_key] || ""}
                        placeholder={item.placeholder || "Type an answer, or pick a suggestion"}
                        onChange={(e) =>
                          setAnswers((prev) => ({ ...prev, [item.field_key]: e.target.value }))
                        }
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                        disabled={running}
                      />
                    </label>
                    {chips.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="w-full text-[10px] uppercase tracking-wider text-muted-foreground">
                          Suggestions — click to fill
                        </span>
                        {chips.map((chip) => {
                          const active = selected === chip;
                          return (
                            <button
                              key={`${item.field_key}-${chip}`}
                              type="button"
                              disabled={running}
                              onClick={() =>
                                setAnswers((prev) => ({ ...prev, [item.field_key]: chip }))
                              }
                              className={`max-w-full rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${
                                active
                                  ? "border-primary bg-primary/10 text-foreground"
                                  : "border-border/80 bg-muted/40 text-foreground hover:bg-muted"
                              }`}
                            >
                              <span className="line-clamp-2">{chip}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
          {result && !awaiting && (
            <AgentRunDetail agentId={agent.id} run={result} />
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t bg-muted/20 p-3">
          <button onClick={onClose} className="rounded-full border px-4 py-2 text-xs hover:bg-muted">
            Close
          </button>
          <button
            onClick={() => void handleRun()}
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {running ? (awaiting ? "Checking…" : "Running…") : awaiting ? "Continue" : "Run agent"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviousRunsModal({ agent, onClose }: { agent: AgentRecord; onClose: () => void }) {
  const [runs, setRuns] = useState<AgentRunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AgentRunRecord | null>(null);
  const [loadingRun, setLoadingRun] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getAgentRuns(agent.id)
      .then((res) => {
        if (!cancelled) setRuns(res.runs);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not load previous runs.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [agent.id]);

  const openRun = async (run: AgentRunRecord) => {
    setLoadingRun(true);
    setError(null);
    try {
      const full = await getAgentRun(agent.id, run.run_id);
      setSelected(full);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load that run.");
    } finally {
      setLoadingRun(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-4xl overflow-hidden border bg-background shadow-soft-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b bg-card p-4">
          <div>
            <div className="font-display text-base font-bold">Previous runs</div>
            <div className="text-[11px] text-muted-foreground">{agent.name}</div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid max-h-[75vh] gap-0 sm:grid-cols-[220px_1fr]">
          <div className="max-h-[75vh] overflow-y-auto border-b sm:border-b-0 sm:border-r">
            {loading ? (
              <div className="p-4 text-xs text-muted-foreground">Loading runs…</div>
            ) : runs.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground">No runs saved yet.</div>
            ) : (
              runs.map((run) => (
                <button
                  key={run.run_id}
                  type="button"
                  onClick={() => void openRun(run)}
                  className={`block w-full truncate border-b px-3 py-2.5 text-left text-xs hover:bg-muted ${
                    selected?.run_id === run.run_id ? "bg-muted font-medium" : ""
                  }`}
                >
                  <div className="truncate font-mono">{run.run_id}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {new Date(run.created_at).toLocaleString()} · {run.status}
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="max-h-[75vh] overflow-y-auto p-4">
            {error && <div className="mb-3 text-xs text-destructive">{error}</div>}
            {loadingRun ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading run…
              </div>
            ) : selected ? (
              <AgentRunDetail agentId={agent.id} run={selected} />
            ) : (
              <div className="text-xs text-muted-foreground">Select a run to view the generated posts.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigureModal({
  agent,
  onClose,
  onSaved,
}: {
  agent: AgentRecord;
  onClose: () => void;
  onSaved: (updated: AgentRecord) => void;
}) {
  const supportsCadence = agentSupportsCadence(agent);
  const [autoSave, setAutoSave] = useState(agent.auto_save_to_library !== false);
  const [notify, setNotify] = useState(agent.notify_on_completion !== false);
  const [cadenceTimes, setCadenceTimes] = useState<string[]>(
    supportsCadence ? agent.run_cadence_datetimes || [] : [],
  );
  const [pickerInput, setPickerInput] = useState("");
  const [saving, setSaving] = useState(false);

  const AgentIcon = getAgentIcon(agent.agent_name || agent.key);
  const colorClass = getAgentColor(agent.agent_name || agent.key);

  const addCadenceTime = () => {
    if (!pickerInput) return;
    const isoString = new Date(pickerInput).toISOString();
    if (!cadenceTimes.includes(isoString)) {
      setCadenceTimes([...cadenceTimes, isoString]);
    }
    setPickerInput("");
  };

  const removeCadenceTime = (iso: string) => {
    setCadenceTimes(cadenceTimes.filter((t) => t !== iso));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await updateAgent(agent.id, {
        auto_save_to_library: autoSave,
        notify_on_completion: notify,
        run_cadence_datetimes: supportsCadence ? cadenceTimes : [],
      });
      onSaved(updated);
    } catch (err: unknown) {
      console.error("Failed to update agent:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg overflow-hidden border bg-background shadow-soft-lg sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="configure-agent-title"
      >
        <div className="flex items-center justify-between border-b bg-card p-4">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${colorClass}`}
            >
              <AgentIcon className="h-5 w-5" />
            </span>
            <div>
              <div id="configure-agent-title" className="font-display text-base font-bold">
                Configure {agent.name}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Settings apply directly to this agent in the database.
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto space-y-5 p-5">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Needs</div>
            <p className="mt-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-foreground">
              {agent.needs || "Natural-language brief (topic, days, tone, cadence)"}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              This requirement is set for the agent and cannot be edited.
            </p>
          </div>

          {supportsCadence ? (
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Run Cadence Schedule (Date & Time Picker)
              </label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={pickerInput}
                  onChange={(e) => setPickerInput(e.target.value)}
                  className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={addCadenceTime}
                  disabled={!pickerInput}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
              <div className="mt-3 space-y-1.5">
                {cadenceTimes.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic">
                    No run date & times scheduled. Pick date & time above to schedule runs.
                  </div>
                ) : (
                  cadenceTimes.map((iso) => (
                    <div
                      key={iso}
                      className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-1.5 text-xs"
                    >
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {new Date(iso).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCadenceTime(iso)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              This agent runs when you provide input. Scheduled cadence is not available for it yet.
            </p>
          )}

          <div className="space-y-2">
            <Row label="Auto-save outputs to Library" checked={autoSave} onChange={setAutoSave} />
            <Row label="Notify me on completion" checked={notify} onChange={setNotify} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t bg-muted/20 p-3">
          <button
            onClick={onClose}
            className="rounded-full border px-4 py-2 text-xs hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full border transition-colors ${checked ? "bg-primary border-primary" : "bg-muted border-border/80"
          }`}
      >
        <span
          className={`absolute top-0.5 h-[14px] w-[14px] rounded-full shadow-sm transition-all ${checked ? "left-[19px] bg-white" : "left-0.5 bg-background border"
            }`}
        />
      </button>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/60 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate font-medium">{value}</div>
    </div>
  );
}

function Pref({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}

function RightPanel() {
  const [agentsList, setAgentsList] = useState<AgentRecord[]>([]);

  useEffect(() => {
    getAgents()
      .then((res) => setAgentsList(res.agents))
      .catch(() => { });

    const updateHandler = () => {
      getAgents()
        .then((res) => setAgentsList(res.agents))
        .catch(() => { });
    };

    window.addEventListener("agent-updated", updateHandler);
    window.addEventListener("agent-ran", updateHandler);
    return () => {
      window.removeEventListener("agent-updated", updateHandler);
      window.removeEventListener("agent-ran", updateHandler);
    };
  }, []);

  const totalAgents = agentsList.length;
  const activeAgents = agentsList.filter((a) => a.is_active).length;
  const totalRuns = agentsList.reduce((sum, a) => sum + (a.total_runs || 0), 0);
  const scheduledCount = agentsList.reduce(
    (sum, a) =>
      agentSupportsCadence(a) ? sum + (a.run_cadence_datetimes?.length || 0) : sum,
    0,
  );

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Agent Overview
        </div>
        <div className="font-display mt-1 text-lg">System Metrics</div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border bg-card p-3 shadow-soft">
          <div className="text-[10px] uppercase text-muted-foreground">Total Agents</div>
          <div className="mt-1 text-xl font-bold font-display">{totalAgents}</div>
        </div>
        <div className="rounded-xl border bg-card p-3 shadow-soft">
          <div className="text-[10px] uppercase text-muted-foreground">Active</div>
          <div className="mt-1 text-xl font-bold font-display text-emerald-600">{activeAgents}</div>
        </div>
        <div className="rounded-xl border bg-card p-3 shadow-soft">
          <div className="text-[10px] uppercase text-muted-foreground">Total Runs</div>
          <div className="mt-1 text-xl font-bold font-display">{totalRuns}</div>
        </div>
        <div className="rounded-xl border bg-card p-3 shadow-soft">
          <div className="text-[10px] uppercase text-muted-foreground">Scheduled</div>
          <div className="mt-1 text-xl font-bold font-display text-primary">{scheduledCount}</div>
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Active Agents Status
        </div>
        {agentsList.filter((a) => a.is_active).length === 0 ? (
          <div className="rounded-xl border bg-card p-4 text-center text-xs text-muted-foreground shadow-soft">
            No agents currently active.
          </div>
        ) : (
          <div className="space-y-2">
            {agentsList
              .filter((a) => a.is_active)
              .map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-xl border bg-card p-3 text-xs shadow-soft"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="font-medium truncate">{a.name}</span>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-700 font-medium shrink-0">
                    Active
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
