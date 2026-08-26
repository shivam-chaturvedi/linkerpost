import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Briefcase, Plus } from "lucide-react";

export const Route = createFileRoute("/app/recruiting")({ component: RecruitingDashboard });

function RecruitingDashboard() {
  return (
    <AppShell pageTitle="Recruiting Dashboard">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Active Roles</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage open roles and candidate pipelines.
            </p>
          </div>
          <Link
            to="/app/recruiting/new"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> New Job
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {["Open roles", "Total candidates", "Agent matches"].map((label) => (
            <div key={label} className="rounded-2xl border bg-card p-5 shadow-soft">
              <div className="text-sm text-muted-foreground">{label}</div>
              <div className="font-display mt-3 text-3xl">0</div>
            </div>
          ))}
        </div>

        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed bg-card/40 p-8 text-center">
          <Briefcase className="h-9 w-9 text-muted-foreground" />
          <h2 className="mt-4 font-display text-xl font-semibold">No roles created</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Create a job to begin collecting and reviewing candidates.
          </p>
          <Link
            to="/app/recruiting/new"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Create your first job
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
