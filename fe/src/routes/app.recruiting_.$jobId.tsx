import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { ArrowLeft, Mail, Users2 } from "lucide-react";

export const Route = createFileRoute("/app/recruiting_/$jobId")({ component: JobPipeline });

function JobPipeline() {
  const { jobId } = Route.useParams();

  return (
    <AppShell pageTitle="Candidate Pipeline" hideQuickActionDock>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/app/recruiting" className="rounded-full p-2 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Candidate pipeline</h1>
            <p className="text-sm text-muted-foreground">Role ID: {jobId}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {["Candidates", "Shortlisted", "Interviews"].map((label) => (
            <div key={label} className="rounded-2xl border bg-card p-5 shadow-soft">
              <div className="text-sm text-muted-foreground">{label}</div>
              <div className="font-display mt-3 text-3xl">0</div>
            </div>
          ))}
        </div>

        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed bg-card/40 p-8 text-center">
          <Users2 className="h-10 w-10 text-muted-foreground" />
          <h2 className="mt-5 font-display text-xl font-semibold">No candidate data imported</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Connect a recruiting inbox to import applications for this role. Linker Post will only
            show candidates received from your connected source.
          </p>
          <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
            <Mail className="h-4 w-4" /> Connect recruiting inbox
          </button>
        </div>
      </div>
    </AppShell>
  );
}
