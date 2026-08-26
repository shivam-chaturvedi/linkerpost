import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { AgentRunDetail } from "@/components/app/AgentRunDetail";
import {
  getAgents,
  getAgentRun,
  getLibraryRuns,
  type AgentRecord,
  type AgentRunRecord,
  type LibraryRunItem,
} from "@/lib/api";
import { Bot, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/library")({
  component: () => (
    <AppShell pageTitle="Library" hideQuickActionDock hideTopChrome>
      <Library />
    </AppShell>
  ),
});

type AgentGroup = {
  agent_id: string;
  agent_name: string;
  name: string;
  description: string;
  needs: string;
  runs: LibraryRunItem[];
};

function previewText(run: LibraryRunItem): string {
  if (run.title) return run.title;
  const brief = run.input.trim().split("\n")[0] || "";
  return brief.length > 80 ? `${brief.slice(0, 80)}…` : brief || "Untitled run";
}

function Library() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [runs, setRuns] = useState<LibraryRunItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [detail, setDetail] = useState<AgentRunRecord | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getAgents(), getLibraryRuns()])
      .then(([agentsResult, libraryResult]) => {
        if (cancelled) return;
        setAgents(agentsResult.agents);
        setRuns(libraryResult.runs);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not load library history.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo<AgentGroup[]>(() => {
    const byId = new Map<string, AgentGroup>();
    for (const agent of agents) {
      byId.set(agent.id, {
        agent_id: agent.id,
        agent_name: agent.agent_name,
        name: agent.name,
        description: agent.description,
        needs: agent.needs,
        runs: [],
      });
    }
    for (const run of runs) {
      const existing = byId.get(run.agent_id);
      if (existing) {
        existing.runs.push(run);
      } else {
        byId.set(run.agent_id, {
          agent_id: run.agent_id,
          agent_name: run.agent_name,
          name: run.agent_display_name,
          description: run.agent_description,
          needs: run.agent_needs,
          runs: [run],
        });
      }
    }
    return [...byId.values()].sort((a, b) => {
      if (a.runs.length && !b.runs.length) return -1;
      if (!a.runs.length && b.runs.length) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [agents, runs]);

  const selectedMeta = useMemo(
    () => runs.find((run) => `${run.agent_id}:${run.run_id}` === selectedKey) ?? null,
    [runs, selectedKey],
  );
  const selectedGroup = groups.find((group) => group.agent_id === selectedMeta?.agent_id);

  const openRun = async (run: LibraryRunItem) => {
    const key = `${run.agent_id}:${run.run_id}`;
    setSelectedKey(key);
    setLoadingDetail(true);
    setError(null);
    try {
      const full = await getAgentRun(run.agent_id, run.run_id);
      setDetail(full);
    } catch (caught) {
      setDetail(null);
      setError(caught instanceof Error ? caught.message : "Could not load that run.");
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col gap-6 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-[300px]">
        <div className="mb-4">
          <h1 className="font-display text-3xl tracking-tight">Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every agent conversation, grouped by agent and run ID.
          </p>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/40 p-6 text-sm text-muted-foreground">
            No agents yet. Run one from the Agents page and it will appear here.
          </div>
        ) : (
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1 lg:max-h-[calc(100vh-10rem)]">
            {groups.map((group) => (
              <section key={group.agent_id} className="overflow-hidden rounded-xl border bg-card">
                <div className="border-b px-3 py-2.5">
                  <div className="text-sm font-semibold">{group.name}</div>
                  <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{group.agent_name}</div>
                </div>
                {group.runs.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-muted-foreground">No runs yet.</div>
                ) : (
                  group.runs.map((run) => {
                    const key = `${run.agent_id}:${run.run_id}`;
                    const active = selectedKey === key;
                    return (
                      <button
                        key={run.run_id}
                        type="button"
                        onClick={() => void openRun(run)}
                        className={`block w-full border-b px-3 py-2.5 text-left last:border-b-0 ${
                          active ? "bg-muted" : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="truncate text-sm font-medium">{previewText(run)}</div>
                        <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {run.run_id}
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {new Date(run.created_at).toLocaleString()} · {run.status}
                          {run.post_count ? ` · ${run.post_count} posts` : ""}
                        </div>
                      </button>
                    );
                  })
                )}
              </section>
            ))}
          </div>
        )}
      </aside>

      <main className="min-w-0 flex-1 rounded-2xl border bg-card p-4 sm:p-6">
        {error && <div className="mb-3 text-sm text-destructive">{error}</div>}
        {loadingDetail ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading run…
          </div>
        ) : detail && selectedMeta ? (
          <AgentRunDetail
            agentId={selectedMeta.agent_id}
            run={detail}
            detail="full"
            agent={{
              name: selectedGroup?.name || selectedMeta.agent_display_name,
              agent_name: selectedGroup?.agent_name || selectedMeta.agent_name,
              description: selectedGroup?.description || selectedMeta.agent_description,
              needs: selectedGroup?.needs || selectedMeta.agent_needs,
            }}
          />
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
            <Bot className="h-9 w-9 text-muted-foreground" />
            <h2 className="mt-4 font-display text-lg font-semibold">Select a run</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Open any conversation to see the brief, model, plan, sources, and generated posts.
            </p>
            <Link
              to="/app/agents"
              className="mt-4 inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Run an agent
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
