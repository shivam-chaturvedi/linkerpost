import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/site/Logo";
import { ApiError, exchangeGoogleSession } from "@/lib/api";

export const Route = createFileRoute("/auth/complete")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : undefined,
  }),
  head: () => ({
    meta: [{ title: "Signing in — Linker Post" }],
  }),
  component: AuthComplete,
});

function AuthComplete() {
  const navigate = useNavigate();
  const { code } = Route.useSearch();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!code) {
      void navigate({ to: "/login", replace: true, search: { google: "error", error: "missing_code" } });
      return;
    }

    exchangeGoogleSession(code)
      .then(() => {
        if (active) void navigate({ to: "/app/dashboard", replace: true });
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        const message =
          requestError instanceof ApiError
            ? requestError.message
            : "Google sign-in failed. Please try again.";
        setError(message);
      });

    return () => {
      active = false;
    };
  }, [code, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <Logo className="mx-auto mb-6" />
          <h1 className="font-display text-2xl">Sign-in could not finish</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() =>
              void navigate({ to: "/login", replace: true, search: { google: "error" } })
            }
            className="mt-6 rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Logo />
        <span className="text-sm text-muted-foreground">Finishing Google sign-in…</span>
      </div>
    </div>
  );
}
