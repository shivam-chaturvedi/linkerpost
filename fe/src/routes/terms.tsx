import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy slug → canonical terms of service URL. */
export const Route = createFileRoute("/terms")({
  beforeLoad: () => {
    throw redirect({ to: "/terms-of-service", replace: true });
  },
});
