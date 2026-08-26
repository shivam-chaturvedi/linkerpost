import { WorkspaceLoadError } from "@/components/site/WorkspaceLoadError";
import { useNavigate } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { ApiError, getCurrentUser, logout as logoutRequest, type AuthUser } from "@/lib/api";
import { Logo } from "@/components/site/Logo";

type AuthContextValue = {
  user: AuthUser;
  refreshUser: () => Promise<void>;
  setUser: (user: AuthUser) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function RequireAuth({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        if (requestError instanceof ApiError && requestError.status === 401) {
          void navigate({
            to: "/login",
            replace: true,
            search: { google: undefined, error: undefined },
          });
          return;
        }
        setError(requestError instanceof Error ? requestError.message : "Unable to verify session");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [navigate, retryKey]);

  const value = useMemo<AuthContextValue | null>(
    () =>
      user
        ? {
            user,
            setUser,
            refreshUser: async () => {
              setUser(await getCurrentUser());
            },
            signOut: async () => {
              await logoutRequest();
              setUser(null);
            },
          }
        : null,
    [user],
  );

  if (loading || (!user && !error)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Logo />
          <span className="text-sm text-muted-foreground">Loading your workspace…</span>
        </div>
      </div>
    );
  }

  if (error || value === null) {
    return (
      <WorkspaceLoadError
        error={error || "Unable to verify session"}
        onRetry={() => {
          setUser(null);
          setRetryKey((key) => key + 1);
        }}
      />
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside RequireAuth");
  return context;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then(() => {
        if (active) void navigate({ to: "/app/dashboard", replace: true });
      })
      .catch(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Logo />
          <span className="text-sm text-muted-foreground">Checking your session…</span>
        </div>
      </div>
    );
  }

  return children;
}
