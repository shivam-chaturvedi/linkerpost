import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { trackFeatureView, trackPageView } from "@/lib/analytics";

/** Maps app paths to feature labels for Google Analytics. */
function featureFromPath(pathname: string): string | null {
  if (pathname.startsWith("/app/dashboard")) return "dashboard";
  if (pathname.startsWith("/app/accounts")) return "accounts";
  if (pathname.startsWith("/app/manage-posts")) return "manage_posts";
  if (pathname.startsWith("/app/calendar")) return "calendar";
  if (pathname.startsWith("/app/agents")) return "agents";
  if (pathname.startsWith("/app/library")) return "library";
  if (pathname.startsWith("/app/settings")) return "settings";
  if (pathname.startsWith("/app/support")) return "support";
  if (pathname.startsWith("/app/recruiting")) return "recruiting";
  if (pathname.startsWith("/login")) return "login";
  if (pathname.startsWith("/signup")) return "signup";
  if (pathname.startsWith("/onboarding")) return "onboarding";
  if (pathname.startsWith("/pricing")) return "pricing";
  if (pathname.startsWith("/help")) return "help";
  if (pathname.startsWith("/privacy-policy") || pathname === "/privacy") return "privacy_policy";
  if (pathname.startsWith("/terms-of-service") || pathname === "/terms") return "terms_of_service";
  if (pathname.startsWith("/linkedin-post-generator")) return "seo_post_generator";
  if (pathname.startsWith("/linkedin-post-scheduler")) return "seo_post_scheduler";
  if (pathname.startsWith("/ai-linkedin-content-planner")) return "seo_content_planner";
  if (pathname.startsWith("/linkedin-content-calendar")) return "seo_content_calendar";
  if (pathname.startsWith("/linkedin-ai-writer")) return "seo_ai_writer";
  if (pathname.startsWith("/multiple-linkedin-account-manager")) return "seo_multi_account";
  if (pathname === "/") return "home";
  if (pathname.startsWith("/app")) return "app";
  return null;
}

/** Sends gtag page_view + feature_view on every client-side route change. */
export function AnalyticsListener() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.searchStr });
  const href = useRouterState({ select: (s) => s.location.href });

  useEffect(() => {
    const path = `${pathname}${search || ""}`;
    trackPageView(path, document.title);
    const feature = featureFromPath(pathname);
    if (feature) trackFeatureView(feature, path);
  }, [pathname, search, href]);

  return null;
}
