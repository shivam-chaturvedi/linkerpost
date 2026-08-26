import { createFileRoute, Navigate } from "@tanstack/react-router";
export { ComposerModal } from "./app.manage-posts";

export const Route = createFileRoute("/app/create")({
  component: () => <Navigate to="/app/manage-posts" replace />,
});
