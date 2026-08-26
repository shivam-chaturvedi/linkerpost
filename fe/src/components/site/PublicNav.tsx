import { Link } from "@tanstack/react-router";
import { PRICING_ENABLED } from "@/lib/pricing";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  LayoutGrid,
  Send,
  CalendarDays,
  Wand2 as Sparkles,
  Users2,
  Shield,
  Plug,
  HelpCircle,
  Briefcase,
  Rocket,
  PenLine,
  Building2,
  Moon,
  Sun,
} from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/api";
import { readThemePreference, resolveIsDark, THEME_CHANGE_EVENT, toggleResolvedTheme } from "@/lib/theme";

type Item = {
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
};

const FEATURES: Item[] = [
  {
    title: "Post generator",
    desc: "Create LinkedIn drafts from a topic with AI",
    icon: LayoutGrid,
    to: "/linkedin-post-generator",
  },
  {
    title: "Post scheduler",
    desc: "Schedule LinkedIn posts and publish later",
    icon: Send,
    to: "/linkedin-post-scheduler",
  },
  {
    title: "Content calendar",
    desc: "See drafts and scheduled posts in one view",
    icon: CalendarDays,
    to: "/linkedin-content-calendar",
  },
  {
    title: "AI content planner",
    desc: "Build 7, 14, or 30 day LinkedIn plans",
    icon: Sparkles,
    to: "/ai-linkedin-content-planner",
  },
  {
    title: "AI writer",
    desc: "Rewrite and polish LinkedIn posts faster",
    icon: PenLine,
    to: "/linkedin-ai-writer",
  },
  {
    title: "Multi-account",
    desc: "Manage multiple LinkedIn accounts in one place",
    icon: Users2,
    to: "/multiple-linkedin-account-manager",
  },
];

const INTEGRATIONS: Item[] = [
  {
    title: "LinkedIn Profiles",
    desc: "Connect personal member accounts with OAuth",
    icon: Users2,
    to: "/multiple-linkedin-account-manager",
  },
  {
    title: "Company pages",
    desc: "Publish when your member account has poster access",
    icon: Building2,
    to: "/help",
  },
];

const MADE_FOR: Item[] = [
  { title: "Founders", desc: "Build in public with a steady calendar", icon: Rocket, to: "/ai-linkedin-content-planner" },
  { title: "Creators", desc: "Draft faster and stay consistent", icon: Sparkles, to: "/linkedin-post-generator" },
  { title: "Agencies", desc: "Manage many LinkedIn destinations cleanly", icon: Briefcase, to: "/multiple-linkedin-account-manager" },
];

const RESOURCES: Item[] = [
  { title: "Help & Support", desc: "Guides, common issues, and how to reach us", icon: HelpCircle, to: "/help" },
  { title: "Privacy Policy", desc: "How we handle account and LinkedIn data", icon: Shield, to: "/privacy-policy" },
  { title: "Terms of Service", desc: "Rules for using Linker Post", icon: Plug, to: "/terms-of-service" },
];

function MegaMenu({ label, items, cols = 2 }: { label: string; items: Item[]; cols?: 1 | 2 }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const cancelClose = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const openMenu = () => {
    cancelClose();
    setOpen(true);
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 180);
  };

  useEffect(() => () => cancelClose(), []);

  return (
    <div className="relative" onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
      <button
        type="button"
        onClick={() => {
          cancelClose();
          setOpen((value) => !value);
        }}
        onFocus={openMenu}
        aria-expanded={open}
        className={`flex items-center gap-1 rounded-full px-3 py-2 text-[15px] transition-colors hover:bg-muted ${
          open ? "bg-muted" : ""
        }`}
      >
        {label}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          className={`absolute left-0 top-full z-50 pt-2 ${cols === 2 ? "w-[560px]" : "w-[320px]"}`}
        >
          <div className="rounded-2xl border bg-popover p-3 shadow-soft-lg">
          <div className={`grid gap-1 ${cols === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
            {items.map((it) => {
              const content = (
                <>
                  <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground/70 group-hover:bg-brand-soft group-hover:text-primary">
                    <it.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="font-display text-[15px] font-medium leading-tight">
                      {it.title}
                    </div>
                    <div className="mt-1 text-[13px] leading-snug text-muted-foreground">
                      {it.desc}
                    </div>
                  </div>
                </>
              );
              return it.to ? (
                <Link
                  key={it.title}
                  to={it.to}
                  onClick={() => setOpen(false)}
                  className="group flex items-start gap-3 rounded-xl p-3 hover:bg-muted/60"
                >
                  {content}
                </Link>
              ) : (
                <div key={it.title} className="group flex items-start gap-3 rounded-xl p-3">
                  {content}
                </div>
              );
            })}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PublicNav() {
  const [sessionState, setSessionState] = useState<"loading" | "authenticated" | "anonymous">(
    "loading",
  );
  const [dark, setDark] = useState(() => resolveIsDark());

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then(() => {
        if (active) setSessionState("authenticated");
      })
      .catch(() => {
        if (active) setSessionState("anonymous");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setDark(resolveIsDark());
    const onMedia = () => {
      if (readThemePreference() === "system") sync();
    };
    media.addEventListener("change", onMedia);
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => {
      media.removeEventListener("change", onMedia);
      window.removeEventListener(THEME_CHANGE_EVENT, sync);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Logo size="compact" />
          <nav className="hidden items-center gap-1 md:flex">
            <MegaMenu label="Features" items={FEATURES} cols={2} />
            <MegaMenu label="Integrations" items={INTEGRATIONS} cols={1} />
            <MegaMenu label="Made for" items={MADE_FOR} cols={1} />
            <MegaMenu label="Resources" items={RESOURCES} cols={1} />
            {PRICING_ENABLED && (
              <Link
                to="/pricing"
                className="rounded-full px-3 py-2 text-[15px] transition-colors hover:bg-muted"
              >
                Pricing
              </Link>
            )}
          </nav>
        </div>
        <div className="flex min-w-[116px] items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setDark(toggleResolvedTheme() === "dark")}
            aria-label={dark ? "Use light theme" : "Use dark theme"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-background text-foreground transition hover:bg-muted"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {sessionState === "loading" && (
            <span
              aria-hidden="true"
              className="h-10 w-[116px] animate-pulse rounded-full bg-muted"
            />
          )}
          {sessionState === "anonymous" && (
            <Link to="/login" search={{ google: undefined, error: undefined }}>
              <Button
                variant="outline"
                className="h-10 rounded-full border-slate-200 bg-white px-6 font-semibold text-slate-900 shadow-[0_5px_0_#cbd5e1,0_10px_24px_rgba(15,23,42,0.16)] transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-900 focus-visible:text-slate-900 active:translate-y-[3px] active:text-slate-900 active:shadow-[0_2px_0_#cbd5e1,0_5px_12px_rgba(15,23,42,0.12)] dark:border-border dark:bg-card dark:text-foreground dark:shadow-none dark:hover:bg-muted"
              >
                Sign in
              </Button>
            </Link>
          )}
          {sessionState === "authenticated" && (
            <Link to="/app/dashboard">
              <Button className="h-10 rounded-full px-6 shadow-md">Dashboard</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
