import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";
import { AuthSidePanel } from "@/components/site/AuthSidePanel";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { login as loginUser, startGoogleAuth } from "@/lib/api";
import { GuestOnly } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    google: typeof search.google === "string" ? search.google : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in | Linker Post" },
      { name: "description", content: "Sign in to your Linker Post workspace." },
    ],
  }),
  component: () => (
    <GuestOnly>
      <Login />
    </GuestOnly>
  ),
});

function Login() {
  const navigate = useNavigate();
  const { google, error: googleError } = Route.useSearch();
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const oauthError = useMemo(() => {
    if (google !== "error") return "";
    if (googleError === "email_unverified") {
      return "Your Google account email must be verified to continue.";
    }
    if (googleError === "account_disabled") {
      return "This account is disabled. Contact support.";
    }
    return "Google sign-in failed. Try again or use email.";
  }, [google, googleError]);
  return (
    <div className="grid min-h-screen grid-cols-1 bg-background sm:grid-cols-2">
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Logo className="mb-10" />

          <h1 className="font-display text-3xl tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your Linker Post workspace.
          </p>

          <button
            type="button"
            onClick={() => startGoogleAuth()}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-full border bg-card px-4 py-2.5 text-sm font-medium shadow-soft transition hover:bg-muted"
          >
            <GoogleIcon /> Continue with Google
          </button>

          <div className="my-6 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or with email{" "}
            <div className="h-px flex-1 bg-border" />
          </div>

          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              setSubmitting(true);
              const form = new FormData(event.currentTarget);
              try {
                await loginUser({
                  email: String(form.get("email") ?? ""),
                  password: String(form.get("password") ?? ""),
                });
                await navigate({ to: "/app/dashboard", replace: true });
              } catch (requestError) {
                setError(
                  requestError instanceof Error ? requestError.message : "Unable to sign in",
                );
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <Field label="Email">
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                className="input-base"
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  name="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input-base pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <Button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-full bg-black text-white hover:bg-black/90 h-11 text-base"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
            {(error || oauthError) && (
              <p
                role="alert"
                aria-live="polite"
                className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700"
              >
                {error || oauthError}
              </p>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to Linker Post?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
          <div className="mt-10 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Session tokens are stored in secure, HttpOnly cookies.
          </div>

          <div className="mt-6 flex justify-center gap-4 text-xs text-muted-foreground">
            <Link to="/terms-of-service" className="hover:underline">
              Terms of Service
            </Link>
            <span>·</span>
            <Link to="/privacy-policy" className="hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
      <AuthSidePanel />
      <style>{`
        .input-base{
          width:100%; border-radius:14px; border:1px solid var(--border);
          background: var(--card); padding: 10px 14px; font-size:14px;
          outline:none; transition: box-shadow .15s, border-color .15s;
        }
        .input-base:focus{ border-color: var(--primary); box-shadow: 0 0 0 4px color-mix(in oklab, var(--primary) 15%, transparent); }
      `}</style>
    </div>
  );
}

function Field({
  label,
  right,
  children,
}: {
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {right}
      </div>
      {children}
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.05-3.72 1.05-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.83z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
