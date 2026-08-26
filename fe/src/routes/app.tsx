import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { RequireAuth } from "@/lib/auth";
import { HR_FEATURE_ENABLED } from "@/lib/features";

export const Route = createFileRoute("/app")({
  beforeLoad: ({ location }) => {
    if (!HR_FEATURE_ENABLED && location.pathname.startsWith("/app/recruiting")) {
      throw redirect({ to: "/app/dashboard" });
    }
  },
  component: () => (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  ),
});
