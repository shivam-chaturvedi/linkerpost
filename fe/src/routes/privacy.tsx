import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy slug → canonical privacy policy URL. */
export const Route = createFileRoute("/privacy")({
  beforeLoad: () => {
    throw redirect({ to: "/privacy-policy", replace: true });
  },
});
