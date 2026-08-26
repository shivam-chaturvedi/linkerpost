import { Logo } from "@/components/site/Logo";

function friendlyOfflineMessage(raw: string): { title: string; body: string } {
  const lower = raw.toLowerCase();
  const looksLikeNetwork =
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("network request failed") ||
    lower.includes("fetch");

  if (looksLikeNetwork) {
    return {
      title: "The workspace is momentarily unreachable",
      body: "Our servers appear to be out for a brief stroll. Your account is not gone. We simply cannot shake hands with it right now. Give it a moment, then try again.",
    };
  }

  return {
    title: "Unable to open your workspace",
    body: raw || "Something unexpected interrupted the handshake with your account. A refresh usually sorts it out.",
  };
}

export function WorkspaceLoadError({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  const copy = friendlyOfflineMessage(error);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl workspace-offline-glow" />

      <div className="relative w-full max-w-md text-center workspace-offline-enter">
        <div className="relative mx-auto mb-8 flex h-24 items-center justify-center">
          <span className="absolute h-24 w-24 rounded-full border border-primary/20 workspace-offline-ring" />
          <span className="absolute h-16 w-16 rounded-full border border-primary/30 workspace-offline-ring-delay" />
          <div className="relative workspace-offline-float">
            <Logo size="compact" />
          </div>
        </div>

        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Connection pause
        </p>
        <h1 className="font-display mt-3 text-2xl tracking-tight md:text-3xl">{copy.title}</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{copy.body}</p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full border px-6 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Back to home
          </a>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          If this keeps happening, the API may be offline. Start the backend, then refresh.
        </p>
      </div>
    </div>
  );
}
