import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Linkedin,
  PenSquare,
  CalendarDays,
  Bot,
  BarChart3,
  Settings,
  Search,
  Bell,
  Sun,
  Moon,
  Plus,
  CalendarPlus,
  Wand2 as Sparkles,
  Link2,
  PanelRightOpen,
  PanelLeftOpen,
  ChevronsLeft,
  ChevronUp,
  User,
  CreditCard,
  HelpCircle,
  Terminal,
  LogOut,
  ChevronRight,
  FlaskConical,
  MessageSquare,
  Menu,
  Library as LibraryIcon,
  Users2,
  X,
  Repeat2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getAccounts, getPosts, getUnreadNotificationCount, type LinkedInAccount, type PostRecord } from "@/lib/api";
import { NotificationDrawer } from "@/components/app/NotificationDrawer";
import { ComposerModal, preloadComposerEditor } from "@/routes/app.manage-posts";
import { FeedbackWidget } from "@/components/app/FeedbackWidget";
import { SmartAgent } from "@/components/app/SmartAgent";
import { Logo } from "@/components/site/Logo";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/lib/auth";
import { HR_FEATURE_ENABLED } from "@/lib/features";
import { PRICING_ENABLED } from "@/lib/pricing";
import {
  applyThemeClass,
  readThemePreference,
  resolveIsDark,
  THEME_CHANGE_EVENT,
  toggleResolvedTheme,
} from "@/lib/theme";

const CREATOR_NAV = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/accounts", label: "Accounts", icon: Linkedin },
  { to: "/app/manage-posts", label: "Manage Posts", icon: PenSquare },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/app/agents", label: "Agents", icon: Bot },
  { to: "/app/library", label: "Library", icon: LibraryIcon },
] as const;

const HR_NAV = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/recruiting", label: "Recruiting", icon: Users2 },
  { to: "/app/accounts", label: "Accounts", icon: Linkedin },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/app/agents", label: "Agents", icon: Bot },
  { to: "/app/library", label: "Library", icon: LibraryIcon },
] as const;

export function AppShell({
  rightPanel,
  pageTitle,
  children,
  hideQuickActionDock,
  hideTopChrome,
}: {
  rightPanel?: ReactNode;
  pageTitle?: string;
  children?: ReactNode;
  hideQuickActionDock?: boolean;
  hideTopChrome?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [showOrgPopup, setShowOrgPopup] = useState(false);
  const [dark, setDark] = useState<boolean>(() => resolveIsDark());
  const [collapsed, setCollapsed] = useState(false);
  const [rightOpen, setRightOpen] = useState(true);
  const [quickOpen, setQuickOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [persona, setPersona] = useState<"creator" | "hr">("creator");
  const [signOutError, setSignOutError] = useState("");
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void preloadComposerEditor();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refreshUnread = () => {
      void getUnreadNotificationCount()
        .then((result) => {
          if (!cancelled) setUnreadCount(result.unread_count);
        })
        .catch(() => {
          if (!cancelled) setUnreadCount(0);
        });
    };
    refreshUnread();
    const timer = window.setInterval(refreshUnread, 30000);
    const onAgentRan = () => refreshUnread();
    window.addEventListener("agent-ran", onAgentRan);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("agent-ran", onAgentRan);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (searchOpen && posts.length === 0) {
      void getPosts().then(setPosts).catch(() => {});
      if (accounts.length === 0) {
        void getAccounts().then(setAccounts).catch(() => {});
      }
    }
  }, [searchOpen, posts.length, accounts.length]);

  const matchingPosts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return posts.filter(
      (p) =>
        p.commentary?.toLowerCase().includes(q) ||
        p.article_title?.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q),
    ).slice(0, 4);
  }, [posts, searchQuery]);

  const matchingAccounts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return accounts.filter(
      (acc) =>
        acc.display_name.toLowerCase().includes(q) ||
        acc.email?.toLowerCase().includes(q),
    );
  }, [accounts, searchQuery]);

  useEffect(() => {
    if (quickOpen) {
      setAccountsLoading(true);
      void getAccounts()
        .then(setAccounts)
        .finally(() => setAccountsLoading(false));
    }
  }, [quickOpen]);

  useEffect(() => {
    applyThemeClass(dark);
  }, [dark]);

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

  useEffect(() => {
    const savedPersona = localStorage.getItem("linker-post-persona");
    if ((HR_FEATURE_ENABLED && savedPersona === "hr") || savedPersona === "creator") {
      setPersona(savedPersona);
    } else if (!HR_FEATURE_ENABLED) {
      localStorage.setItem("linker-post-persona", "creator");
    }
  }, []);

  const switchPersona = () => {
    const newPersona = persona === "creator" ? "hr" : "creator";
    setPersona(newPersona);
    localStorage.setItem("linker-post-persona", newPersona);
    setShowOrgPopup(false);
    navigate({ to: "/app/dashboard" });
  };

  const hrMode = HR_FEATURE_ENABLED && persona === "hr";
  const navItems = hrMode ? HR_NAV : CREATOR_NAV;
  const displayName = `${user.first_name} ${user.last_name}`.trim();
  const initials = `${user.first_name[0] ?? ""}${user.last_name[0] ?? ""}`.toUpperCase();

  const workspaceName = hrMode
    ? "Recruiting workspace"
    : accounts.length > 0 && accounts[0].display_name
      ? `${accounts[0].display_name}'s workspace`
      : user.first_name
        ? `${user.first_name}'s workspace`
        : "Creator workspace";

  return (
    <div className="flex h-screen overflow-hidden flex-col bg-background text-foreground">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/50 md:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-[100] h-screen shrink-0 border-r bg-sidebar transition-transform duration-300 md:sticky md:top-0 md:z-50 md:translate-x-0 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } ${collapsed ? "w-[78px]" : "w-[240px]"} flex flex-col`}
        >
          <div className="relative flex h-16 items-center justify-between border-b px-4">
            <Logo size="compact" markOnly={collapsed} />
            <button
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={`hidden p-1.5 text-muted-foreground hover:bg-muted md:block ${
                collapsed
                  ? "absolute -right-3 top-1/2 -translate-y-1/2 border bg-background shadow-sm"
                  : "rounded-none"
              }`}
            >
              <ChevronsLeft
                className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {!collapsed && (
            <div className="px-3 pt-4">
              <div className="flex items-center gap-2 border bg-card px-3 py-2 shadow-soft rounded">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs border border-primary/20">
                  {initials || "LP"}
                </div>
                <div className="flex-1 text-sm leading-tight min-w-0">
                  <div className="truncate font-medium">{displayName}</div>
                  <div className="text-xs text-muted-foreground">{workspaceName}</div>
                </div>
              </div>
            </div>
          )}

          <nav className="mt-4 flex-1 space-y-1 px-3">
            {navItems.map((n) => {
              // Ensure we highlight parent paths if we are on a nested route (e.g., /app/recruiting/new)
              const active =
                n.to === "/app/dashboard" ? pathname === n.to : pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors rounded-none ${
                    active ? "bg-brand-soft text-primary" : "text-foreground/80 hover:bg-muted"
                  } ${collapsed ? "justify-center" : ""}`}
                  title={collapsed ? n.label : undefined}
                >
                  <n.icon className={`h-[18px] w-[18px] ${active ? "text-primary" : ""}`} />
                  {!collapsed && <span>{n.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Redesigned My Organization bottom sidebar button & contextual popup */}
          {!collapsed && (
            <div className="border-t p-3 relative">
              {/* Click-away backdrop — inside same stacking context as popup so it doesn't block clicks */}
              {showOrgPopup && (
                <div className="fixed inset-0 z-[49]" onClick={() => setShowOrgPopup(false)} />
              )}
              {showOrgPopup && (
                <div className="absolute bottom-[64px] left-0 z-[50] w-[220px] border bg-card text-card-foreground p-3.5 shadow-soft-lg rounded-none select-none border-border">
                  {/* Header info */}
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
                    <div className="text-xs font-bold">{displayName}</div>
                    <div className="text-[10px] text-muted-foreground">{workspaceName}</div>
                  </div>

                  {PRICING_ENABLED && (
                    <Link
                      to="/pricing"
                      onClick={() => setShowOrgPopup(false)}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 border bg-muted/20 hover:bg-muted/40 py-1.5 text-[11px] font-bold transition rounded-none"
                    >
                      <Sparkles className="h-3 w-3 text-yellow-500" />
                      <span>Upgrade Plan</span>
                    </Link>
                  )}

                  {/* Switch Persona */}
                  {HR_FEATURE_ENABLED && (
                    <button
                      onClick={switchPersona}
                      className="mt-2 w-full flex items-center justify-center gap-1.5 border bg-primary/10 text-primary hover:bg-primary/20 py-1.5 text-[11px] font-bold transition rounded-none"
                    >
                      <Repeat2 className="h-3 w-3" />
                      <span>Switch to {persona === "creator" ? "HR Mode" : "Creator Mode"}</span>
                    </button>
                  )}

                  {/* Divider */}
                  <div className="my-2.5 border-t" />

                  {/* Filtered Menu Links */}
                  <div className="space-y-0.5">
                    <Link
                      to="/app/settings"
                      search={{ tab: "profile" }}
                      onClick={() => setShowOrgPopup(false)}
                      className="flex items-center gap-2.5 px-2 py-1 text-[15px] font-[450] text-muted-foreground hover:text-foreground hover:bg-muted/10 transition rounded-none"
                    >
                      <Settings className="h-3.5 w-3.5 opacity-80" />
                      <span>Settings</span>
                    </Link>
                    {PRICING_ENABLED && (
                      <Link
                        to="/app/settings"
                        search={{ tab: "billing" }}
                        onClick={() => setShowOrgPopup(false)}
                        className="flex items-center gap-2.5 px-2 py-1 text-[15px] font-[450] text-muted-foreground hover:text-foreground hover:bg-muted/10 transition rounded-none"
                      >
                        <CreditCard className="h-3.5 w-3.5 opacity-80" />
                        <span>Plans and Billing</span>
                      </Link>
                    )}
                    <Link
                      to="/app/settings"
                      search={{ tab: "help" }}
                      onClick={() => setShowOrgPopup(false)}
                      className="flex items-center justify-between px-2 py-1 text-[15px] font-[450] text-muted-foreground hover:text-foreground hover:bg-muted/10 transition rounded-none"
                    >
                      <span className="flex items-center gap-2.5">
                        <HelpCircle className="h-3.5 w-3.5 opacity-80" />
                        <span>Help & Support</span>
                      </span>
                      <ChevronRight className="h-3 w-3 opacity-60" />
                    </Link>
                    <Link
                      to="/app/settings"
                      search={{ tab: "refer" }}
                      onClick={() => setShowOrgPopup(false)}
                      className="flex items-center gap-2.5 px-2 py-1 text-[15px] font-[450] text-muted-foreground hover:text-foreground hover:bg-muted/10 transition rounded-none"
                    >
                      <MessageSquare className="h-3.5 w-3.5 opacity-80" />
                      <span>Refer a Friend</span>
                    </Link>
                  </div>

                  {/* Divider */}
                  <div className="my-2.5 border-t" />

                  {/* Log out */}
                  <button
                    type="button"
                    onClick={() => {
                      setSignOutError("");
                      setShowOrgPopup(false);
                      setLogoutConfirmOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 px-2 py-1 text-[15px] font-[450] text-red-500 hover:text-red-400 hover:bg-muted/10 transition rounded-none text-left"
                  >
                    <LogOut className="h-3.5 w-3.5 opacity-80" />
                    <span>Log out</span>
                  </button>
                  {signOutError && (
                    <p role="alert" className="mt-2 px-2 text-[11px] text-red-600">
                      {signOutError}
                    </p>
                  )}
                </div>
              )}

              <div
                onClick={() => setShowOrgPopup(!showOrgPopup)}
                className="flex items-center justify-between border bg-card p-2.5 shadow-soft hover:bg-muted/20 cursor-pointer rounded-none select-none transition"
              >
                <div className="flex items-center gap-3">
                  {/* User Profile Avatar */}
                  <div className="h-9 w-9 bg-[#0077B5]/10 text-[#0077B5] flex items-center justify-center rounded-full font-bold select-none text-sm border">
                    {initials || "LP"}
                  </div>
                  <div>
                    <div className="max-w-[120px] truncate text-xs font-bold text-foreground">
                      {displayName}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase">
                      {persona} Mode
                    </div>
                  </div>
                </div>
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          )}
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          {/* Top bar */}
          <div className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
            <div className="flex h-16 items-center gap-2 px-4 sm:px-6">
              <button
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                className="mr-2 flex items-center justify-center rounded-full border border-border p-2 hover:bg-muted md:hidden"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>

              <Logo markOnly className="mr-2 md:hidden" />

              <div className="font-display text-lg truncate min-w-0 hidden md:block">
                {pageTitle}
              </div>

              {!hideTopChrome && (
              <div className="relative ml-4 hidden flex-1 md:flex">
                <div className="flex w-full max-w-md items-center gap-2 rounded-full border bg-card px-4 py-2 shadow-soft focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                  <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    placeholder="Search posts, accounts, agents…"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <span className="rounded-md border px-1.5 py-0.5 text-[10px] text-muted-foreground select-none font-mono">
                      ⌘K
                    </span>
                  )}
                </div>

                {/* Search Results Dropdown Overlay */}
                {searchOpen && searchQuery.trim().length > 0 && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setSearchOpen(false)} />
                    <div className="absolute top-12 left-0 z-40 w-full max-w-lg border bg-card text-card-foreground shadow-2xl rounded-lg p-3 space-y-3 max-h-[70vh] overflow-y-auto">
                      {/* Posts Section */}
                      {matchingPosts.length > 0 && (
                        <div className="space-y-1">
                          <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Posts ({matchingPosts.length})
                          </div>
                          {matchingPosts.map((post) => (
                            <div
                              key={post.id}
                              onClick={() => {
                                setSearchOpen(false);
                                setSearchQuery("");
                                navigate({ to: "/app/manage-posts" });
                              }}
                              className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer text-xs transition"
                            >
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="font-medium truncate text-foreground">{post.commentary || post.article_title || "(No text)"}</div>
                                <div className="text-[10px] text-muted-foreground capitalize">
                                  {post.status} · {new Date(post.created_at).toLocaleDateString()}
                                </div>
                              </div>
                              <PenSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2" />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Accounts Section */}
                      {matchingAccounts.length > 0 && (
                        <div className="space-y-1 border-t pt-2">
                          <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            LinkedIn Accounts ({matchingAccounts.length})
                          </div>
                          {matchingAccounts.map((acc) => (
                            <div
                              key={acc.id}
                              onClick={() => {
                                setSearchOpen(false);
                                setSearchQuery("");
                                navigate({ to: "/app/accounts" });
                              }}
                              className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer text-xs transition"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Linkedin className="h-4 w-4 text-[#0077B5] shrink-0" />
                                <span className="font-medium text-foreground truncate">{acc.display_name}</span>
                              </div>
                              <span className="text-[10px] text-emerald-600 font-semibold">{acc.status}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {matchingPosts.length === 0 && matchingAccounts.length === 0 && (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                          No matching posts or accounts found for "{searchQuery}".
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              )}

              <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
                {!hideTopChrome && <FeedbackWidget inline />}
                <button
                  type="button"
                  aria-label="Notifications"
                  onClick={() => setNotificationsOpen(true)}
                  className="relative rounded-full border p-2 hover:bg-muted"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setDark(toggleResolvedTheme() === "dark")}
                  aria-label={dark ? "Use light theme" : "Use dark theme"}
                  className="rounded-full border p-2 hover:bg-muted"
                >
                  {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                {!hideTopChrome && (
                  <button
                    onClick={() => setQuickOpen(true)}
                    onMouseEnter={() => void preloadComposerEditor()}
                    onFocus={() => void preloadComposerEditor()}
                    className="hidden items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft hover:opacity-90 sm:inline-flex"
                  >
                    <Plus className="h-4 w-4" /> Add post
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content + right panel */}
          <div className="flex">
            <div className={`min-w-0 flex-1 p-6 ${hideQuickActionDock ? "pb-6" : "pb-32"}`}>
              {children}
            </div>
            {rightPanel && (
              <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[320px] shrink-0 overflow-y-auto border-l bg-background p-5 lg:block">
                {rightPanel}
              </aside>
            )}
          </div>
        </main>
      </div>

      {/* Bottom floating quick action dock */}
      {!hideQuickActionDock && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
          <div className="flex items-center gap-1 rounded-full border bg-card/95 p-1.5 shadow-soft-lg backdrop-blur">
            {!hrMode ? (
              <DockIconButton
                onClick={() => setQuickOpen(true)}
                onHover={() => void preloadComposerEditor()}
                icon={Plus}
                label="New Post"
                primary
              />
            ) : (
              <DockIconLink to="/app/recruiting/new" icon={Plus} label="New Job" primary />
            )}
            <DockIconLink to="/app/calendar" icon={CalendarPlus} label="Schedule" />
            <DockIconLink to="/app/agents" icon={Sparkles} label="Run Agent" />
            <DockIconLink to="/app/accounts" icon={Link2} label="Connect" />
          </div>
        </div>
      )}

      {quickOpen && (
        <ComposerModal
          accounts={accounts}
          accountsLoading={accountsLoading}
          onClose={() => setQuickOpen(false)}
          onSuccess={() => setQuickOpen(false)}
        />
      )}
      <NotificationDrawer
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        onUnreadChange={setUnreadCount}
      />
      {!hideQuickActionDock && <SmartAgent />}

      <ConfirmDialog
        open={logoutConfirmOpen}
        onOpenChange={setLogoutConfirmOpen}
        title="Log out of Linker Post?"
        description="You will need to sign in again to access your workspace, posts, and connected accounts."
        confirmLabel="Log out"
        cancelLabel="Stay signed in"
        destructive
        confirming={signingOut}
        onConfirm={async () => {
          setSigningOut(true);
          setSignOutError("");
          try {
            await signOut();
            setLogoutConfirmOpen(false);
            await navigate({ to: "/login", replace: true });
          } catch (requestError) {
            setSignOutError(
              requestError instanceof Error ? requestError.message : "Unable to sign out",
            );
            setLogoutConfirmOpen(false);
            setShowOrgPopup(true);
          } finally {
            setSigningOut(false);
          }
        }}
      />
    </div>
  );
}

function DockButton({
  icon: Icon,
  label,
  to,
  primary,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  to: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${
        primary ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-muted"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

function DockIconLink({
  icon: Icon,
  label,
  to,
  primary,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  to: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`group relative flex h-11 w-11 items-center justify-center rounded-full transition ${
        primary
          ? "bg-primary text-primary-foreground hover:opacity-90"
          : "text-foreground/80 hover:bg-muted"
      }`}
      aria-label={label}
    >
      <Icon className="h-[18px] w-[18px]" />
      <span className="pointer-events-none absolute -top-9 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-soft transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </Link>
  );
}

function DockIconButton({
  icon: Icon,
  label,
  onClick,
  onHover,
  primary,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  onHover?: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      onFocus={onHover}
      className={`group relative flex h-11 w-11 items-center justify-center rounded-full transition ${
        primary
          ? "bg-primary text-primary-foreground hover:opacity-90"
          : "text-foreground/80 hover:bg-muted"
      }`}
      aria-label={label}
    >
      <Icon className="h-[18px] w-[18px]" />
      <span className="pointer-events-none absolute -top-9 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-soft transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}
