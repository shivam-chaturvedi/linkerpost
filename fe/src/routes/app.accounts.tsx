import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import {
  ApiError,
  connectLinkedIn,
  disconnectAccount,
  getAccounts,
  linkedInOAuthErrorMessage,
  type LinkedInAccount,
} from "@/lib/api";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Linkedin,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
} from "lucide-react";

export const Route = createFileRoute("/app/accounts")({
  component: () => (
    <AppShell pageTitle="Accounts">
      <Accounts />
    </AppShell>
  ),
});

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatLocale(locale: LinkedInAccount["locale"]): string | null {
  if (typeof locale === "string") return locale;
  if (!locale) return null;
  const language = locale.language;
  const country = locale.country;
  return [language, country].filter(Boolean).join("-") || null;
}

function parseScopes(scopes: string[]): string[] {
  return Array.from(
    new Set(
      scopes.flatMap((s) => s.split(/[\s,]+/).map((item) => item.trim())).filter(Boolean),
    ),
  );
}

function hasPublishingPermission(account: LinkedInAccount): boolean {
  const parsed = parseScopes(account.scopes);
  return parsed.some((scope) =>
    ["w_member_social", "w_member_social_feed", "w_organization_social"].includes(scope),
  );
}

function Accounts() {
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkedinStatus = params.get("linkedin");
    const oauthError = params.get("error");
    if (params.has("linkedin")) window.history.replaceState({}, "", window.location.pathname);

    void getAccounts()
      .then((list) => {
        setAccounts(list);
        const anyPublishing = list.some(hasPublishingPermission);
        if (linkedinStatus === "connected" || (linkedinStatus === "connected_warning" && anyPublishing)) {
          // Prefer success when scopes actually include publishing (LinkedIn may return
          // comma-separated scopes that previously triggered a false warning).
          setMessage("LinkedIn account connected successfully.");
          setError(null);
        } else if (linkedinStatus === "connected_warning") {
          setError(
            "LinkedIn account connected, but post publishing permission (w_member_social) was not granted.",
          );
        } else if (linkedinStatus === "error") {
          setError(linkedInOAuthErrorMessage(oauthError));
        }
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Could not load accounts.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!message && !error) return;
    const timer = window.setTimeout(() => {
      setMessage(null);
      setError(null);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [message, error]);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      await connectLinkedIn("/app/accounts");
    } catch (caught) {
      setConnecting(false);
      setError(
        caught instanceof ApiError ? caught.message : "Could not start the LinkedIn connection.",
      );
    }
  };

  const handleDisconnect = async (account: LinkedInAccount) => {
    if (!window.confirm(`Disconnect ${account.display_name} from Linker Post?`)) return;
    setRemovingId(account.id);
    setError(null);
    try {
      await disconnectAccount(account.id);
      setAccounts((current) => current.filter((item) => item.id !== account.id));
      setMessage("LinkedIn account disconnected.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not disconnect the account.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">LinkedIn Accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the LinkedIn profiles connected to your workspace.
          </p>
        </div>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="inline-flex items-center gap-2 bg-[#0077B5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#00669c] disabled:opacity-60"
        >
          {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Connect LinkedIn
        </button>
      </div>

      {message && (
        <div className="flex items-center gap-2 border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {message}
        </div>
      )}
      {error && (
        <div className="border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[280px] items-center justify-center border bg-card/40">
          <Loader2 className="h-6 w-6 animate-spin text-[#0077B5]" />
        </div>
      ) : accounts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((account) => {
            const isPublishingPermitted = hasPublishingPermission(account);
            return (
              <article key={account.id} className="overflow-hidden border bg-card shadow-sm">
                <div className="h-1.5 bg-[#0077B5]" />
                <div className="flex items-start gap-4 p-5">
                  {account.profile_image_url ? (
                    <img
                      src={account.profile_image_url}
                      alt={`${account.display_name}'s LinkedIn profile`}
                      referrerPolicy="no-referrer"
                      className="h-16 w-16 rounded-full border-2 border-background object-cover shadow-sm"
                    />
                  ) : (
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0077B5]/10 text-[#0077B5]">
                      <Linkedin className="h-7 w-7" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-display text-lg font-semibold">
                        {account.display_name}
                      </h2>
                      <Linkedin className="h-4 w-4 shrink-0 text-[#0077B5]" />
                    </div>
                    {isPublishingPermitted ? (
                      <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Publishing Enabled
                      </div>
                    ) : (
                      <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="h-3.5 w-3.5" /> Missing Publishing Permission
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => void handleDisconnect(account)}
                    disabled={removingId === account.id}
                    className="rounded-lg border border-border/80 p-2 text-muted-foreground transition hover:bg-muted hover:text-destructive disabled:opacity-50"
                    aria-label={`Disconnect ${account.display_name}`}
                  >
                    {removingId === account.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="space-y-3 border-t px-5 py-4 text-sm">
                  {!isPublishingPermitted && (
                    <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-2 text-amber-900 dark:text-amber-200">
                      <div className="flex items-center gap-2 font-semibold">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                        Publishing Permission (w_member_social) Required
                      </div>
                      <p>
                        LinkedIn did not grant the{" "}
                        <code className="font-mono bg-background px-1 py-0.5 rounded text-[11px]">
                          w_member_social
                        </code>{" "}
                        permission. Posts cannot be published to this account until granted.
                      </p>
                    </div>
                  )}
                  <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    {account.email && (
                      <div className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" /> {account.email}
                      </div>
                    )}
                    <div className="inline-flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5" /> Connected {formatDate(account.created_at)}
                    </div>
                    {formatLocale(account.locale) && (
                      <div className="inline-flex items-center gap-1.5">
                        <UserRoundCheck className="h-3.5 w-3.5" /> {formatLocale(account.locale)}
                      </div>
                    )}
                    <div className="inline-flex items-center gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5" /> Synced{" "}
                      {account.last_synced_at ? formatDate(account.last_synced_at) : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5" /> Scopes
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {parseScopes(account.scopes).map((scope) => (
                        <span
                          key={scope}
                          className={`rounded border px-2 py-0.5 text-[11px] ${
                            ["w_member_social", "w_member_social_feed", "w_organization_social"].includes(
                              scope,
                            )
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 border border-dashed bg-card/30 px-6 text-center">
          <Linkedin className="h-8 w-8 text-[#0077B5]" />
          <div className="font-medium">No LinkedIn accounts connected</div>
          <p className="max-w-sm text-sm text-muted-foreground">
            Connect a LinkedIn profile to compose, schedule, and publish from Linker Post.
          </p>
        </div>
      )}
    </div>
  );
}
