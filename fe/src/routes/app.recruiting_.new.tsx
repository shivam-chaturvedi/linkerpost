import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Bot, LockKeyhole } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/app/recruiting_/new")({ component: NewJobFlow });

function NewJobFlow() {
  const [role, setRole] = useState("");
  const [requirements, setRequirements] = useState("");

  return (
    <AppShell pageTitle="New Job Post">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-4">
          <Link
            to="/app/recruiting"
            aria-label="Back to recruiting"
            className="rounded-full p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Create a job post</h1>
            <p className="text-sm text-muted-foreground">
              Enter a role brief for the future job-description service.
            </p>
          </div>
        </div>

        <form
          className="space-y-6 rounded-3xl border bg-card p-6 shadow-soft"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800">
            <div className="flex items-center gap-2 font-medium">
              <LockKeyhole className="h-4 w-4" /> Generation is unavailable
            </div>
            <p className="mt-1 text-xs">
              No AI or recruiting backend is connected. This form does not upload, process, or save
              job information.
            </p>
          </div>

          <label className="block text-sm font-medium">
            Role title
            <input
              value={role}
              onChange={(event) => setRole(event.target.value)}
              maxLength={120}
              className="mt-2 w-full rounded-xl border bg-background px-4 py-3 text-sm"
              placeholder="Role title"
            />
          </label>

          <label className="block text-sm font-medium">
            Requirements and context
            <textarea
              value={requirements}
              onChange={(event) => setRequirements(event.target.value)}
              maxLength={10_000}
              className="mt-2 min-h-40 w-full resize-y rounded-xl border bg-background px-4 py-3 text-sm"
              placeholder="Responsibilities, required skills, location, and team context"
            />
          </label>

          <div className="flex justify-end">
            <button
              disabled
              title="AI backend is not configured"
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground opacity-50"
            >
              Generate job description <Bot className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
