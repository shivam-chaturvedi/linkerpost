import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { PRICING_ENABLED } from "@/lib/pricing";
import {
  createSupportTicket,
  getUserSettings,
  updateProfile,
  updateUserSettings,
  type NotificationPrefs,
  type UserSettingsRecord,
} from "@/lib/api";
import { readThemePreference, setThemePreference, type ThemePreference } from "@/lib/theme";
import { SUPPORT_EMAIL, supportMailto } from "@/lib/support";
import {
  User,
  Settings as SettingsIcon,
  Bell,
  CreditCard,
  Tag,
  FolderKanban,
  MessageSquare,
  Heart,
  AlertTriangle,
  Info,
  ArrowLeft,
  HelpCircle,
  Lightbulb,
  ChevronRight,
  Copy,
  Share2,
  Check,
  X,
  Send,
  Mail,
} from "lucide-react";

type SettingsSearch = {
  tab?: string;
};

export const Route = createFileRoute("/app/settings")({
  validateSearch: (search: Record<string, unknown>): SettingsSearch => {
    return {
      tab: search.tab as string | undefined,
    };
  },
  component: () => <SettingsLayout />,
});

const MENU_GROUPS = [
  {
    title: "Account",
    items: [
      { id: "profile", label: "Profile", icon: User },
      { id: "preferences", label: "Preferences", icon: SettingsIcon },
      { id: "notifications", label: "Notifications", icon: Bell },
    ],
  },
  ...(PRICING_ENABLED
    ? [
        {
          title: "Organization",
          items: [{ id: "billing", label: "Billing", icon: CreditCard }],
        },
      ]
    : []),
  {
    title: "Other",
    items: [
      { id: "refer", label: "Refer a Friend", icon: Heart },
      { id: "help", label: "Help & Support", icon: HelpCircle },
    ],
  },
];

function SettingsLayout() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const allowedTabs = new Set([
    "profile",
    "preferences",
    "notifications",
    "refer",
    "help",
    ...(PRICING_ENABLED ? ["billing"] : []),
  ]);
  const initialTab = tab && allowedTabs.has(tab) ? tab : "profile";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const next = tab && allowedTabs.has(tab) ? tab : "profile";
    setActiveTab(next);
    if (tab && !allowedTabs.has(tab)) {
      void navigate({ to: "/app/settings", search: { tab: "profile" }, replace: true });
    }
  }, [tab, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Left Settings Sidebar (Customized, Bolder fonts & Dynamic themes) */}
      <aside className="w-[260px] border-r border-border bg-card flex flex-col shrink-0 p-4 select-none">
        {/* Back to dashboard button */}
        <div className="mb-6">
          <Link
            to="/app/dashboard"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#0077B5] hover:text-[#00A0DC] transition py-2"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
            <span>Settings</span>
          </Link>
        </div>

        {/* Setting Groups Menu */}
        <div className="flex-1 space-y-4 overflow-y-auto">
          {MENU_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        void navigate({ to: "/app/settings", search: { tab: item.id } });
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-[15px] font-[450] transition rounded-none ${
                        active
                          ? "bg-[#0077B5]/10 text-[#0077B5] border-l-2 border-[#0077B5]"
                          : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Right Settings Form Area */}
      <main className="flex-1 p-8 overflow-y-auto relative">
        <div className="max-w-3xl mx-auto space-y-6">
          {activeTab === "profile" && <ProfileView />}
          {activeTab === "preferences" && <PreferencesView />}
          {activeTab === "notifications" && <NotificationsView />}
          {activeTab === "billing" && PRICING_ENABLED && (
            <div className="border bg-card p-6 rounded-none space-y-2">
              <h2 className="font-display text-lg font-bold uppercase tracking-wider">Billing</h2>
              <p className="text-xs text-muted-foreground">
                Manage payment methods, billing history, and plan details.
              </p>
            </div>
          )}
          {activeTab === "refer" && <ReferAFriendView />}
          {activeTab === "help" && <HelpSupportView />}
        </div>

        {/* Global Question mark icon at bottom right */}
        <div className="fixed bottom-6 right-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab("help");
              void navigate({ to: "/app/settings", search: { tab: "help" } });
            }}
            className="flex h-10 w-10 items-center justify-center bg-[#0077B5] hover:bg-[#0077B5]/90 text-white rounded-full shadow-lg transition"
            aria-label="Open help and support"
          >
            <HelpCircle className="h-5.5 w-5.5" />
          </button>
        </div>
      </main>
    </div>
  );
}

function fieldClass() {
  return "mt-1.5 w-full border bg-background px-3 py-2 text-sm outline-none focus:border-[#0077B5] select-text";
}

function ProfileView() {
  const { user, setUser } = useAuth();
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [headline, setHeadline] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const initials = `${firstName[0] || "L"}${lastName[0] || "P"}`.toUpperCase();

  useEffect(() => {
    void getUserSettings()
      .then((settings) => {
        setHeadline(settings.headline || "");
        setCompany(settings.company || "");
        setBio(settings.bio || "");
      })
      .catch(() => undefined);
  }, []);

  const saveProfile = async () => {
    if (!firstName.trim()) return;
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const updated = await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim() || firstName.trim(),
        headline: headline.trim(),
        company: company.trim(),
        bio: bio.trim(),
      });
      setUser(updated);
      setStatus("Profile saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (password.length < 8) return;
    setSaving(true);
    setError("");
    setStatus("");
    try {
      await updateProfile({ password });
      setPassword("");
      setStatus("Password updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 select-text">
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This is how you appear across Linker Post.
        </p>
      </div>
      {status && <p className="text-sm text-emerald-700">{status}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-4 rounded-xl border bg-card p-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0077B5] text-lg font-semibold text-white">
          {initials}
        </div>
        <div>
          <div className="text-base font-semibold">
            {firstName} {lastName}
          </div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
          {headline && <div className="mt-1 text-sm text-foreground/80">{headline}</div>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          First name
          <input className={fieldClass()} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </label>
        <label className="text-sm font-medium">
          Last name
          <input className={fieldClass()} value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Headline
          <input
            className={fieldClass()}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Founder, creator, or the work you do"
            maxLength={160}
          />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Company
          <input
            className={fieldClass()}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company or workspace name"
            maxLength={120}
          />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Bio
          <textarea
            className={`${fieldClass()} min-h-24 resize-y`}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short note about how you use LinkedIn"
            maxLength={500}
          />
          <span className="mt-1 block text-xs text-muted-foreground">{bio.length}/500</span>
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Account email
          <input className={`${fieldClass()} bg-muted/40`} value={user.email} readOnly />
        </label>
      </div>
      <button
        type="button"
        disabled={saving || !firstName.trim()}
        onClick={() => void saveProfile()}
        className="rounded-lg bg-[#0077B5] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        Save profile
      </button>

      <div className="border-t pt-6">
        <h3 className="text-sm font-semibold">Password</h3>
        <p className="mt-1 text-xs text-muted-foreground">Use at least 8 characters.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            className={fieldClass()}
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            disabled={saving || password.length < 8}
            onClick={() => void savePassword()}
            className="shrink-0 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            Update password
          </button>
        </div>
      </div>
    </div>
  );
}

// 2. PREFERENCES VIEW
function PreferencesView() {
  const [appearance, setAppearance] = useState<ThemePreference>(() => readThemePreference());
  const [timezone, setTimezone] = useState("Kolkata");
  const [timeFormat, setTimeFormat] = useState("12-hour");
  const [startOfWeek, setStartOfWeek] = useState("Sunday");
  const [landingPage, setLandingPage] = useState("Dashboard");
  const [status, setStatus] = useState("");

  useEffect(() => {
    void getUserSettings().then((settings) => {
      const localPref = readThemePreference();
      // Prefer device theme preference (includes System); fall back to saved API value.
      if (localPref === "system" || localPref === "light" || localPref === "dark") {
        setAppearance(localPref);
      } else {
        setAppearance(settings.appearance === "Light" ? "light" : "dark");
      }
      setTimezone(settings.timezone);
      setTimeFormat(settings.time_format);
      setStartOfWeek(settings.week_start);
      setLandingPage(settings.landing_page);
    });
  }, []);

  const persist = async (patch: Partial<UserSettingsRecord>) => {
    const saved = await updateUserSettings(patch);
    setTimezone(saved.timezone);
    setTimeFormat(saved.time_format);
    setStartOfWeek(saved.week_start);
    setLandingPage(saved.landing_page);
    setStatus("Saved.");
  };

  const onAppearanceChange = (value: ThemePreference) => {
    setAppearance(value);
    setThemePreference(value);
    if (value === "system") {
      setStatus("Saved.");
      return;
    }
    void persist({ appearance: value === "dark" ? "Dark" : "Light" });
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold uppercase tracking-wide">Preferences</h2>
      {status && <p className="text-xs text-emerald-700">{status}</p>}

      <div className="space-y-5 border-t pt-4">
        {/* Appearance */}
        <div className="flex items-start justify-between gap-4 py-2">
          <div className="space-y-1">
            <div className="text-xs font-bold">Appearance</div>
            <div className="text-[11px] text-muted-foreground leading-normal">
              Customize the look and feel of Linker Post on this device. System follows your OS
              setting.
            </div>
          </div>
          <select
            value={appearance}
            onChange={(e) => onAppearanceChange(e.target.value as ThemePreference)}
            className="border bg-card text-foreground px-3 py-1.5 text-xs outline-none focus:border-[#0077B5] rounded-none min-w-[120px] border-border"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        {/* Timezone */}
        <div className="flex items-start justify-between gap-4 py-2 border-t pt-4">
          <div className="space-y-1">
            <div className="text-xs font-bold">Timezone</div>
            <div className="text-[11px] text-muted-foreground leading-normal">
              Used as the default timezone for new connected channels and for sending email
              notifications. Also used for calculating your posting streaks.
            </div>
          </div>
          <select
            value={timezone}
            onChange={(e) => {
              setTimezone(e.target.value);
              void persist({ timezone: e.target.value });
            }}
            className="border bg-card text-foreground px-3 py-1.5 text-xs outline-none focus:border-[#0077B5] rounded-none min-w-[120px] border-border"
          >
            <option>Kolkata</option>
            <option>London</option>
            <option>New York</option>
            <option>Tokyo</option>
          </select>
        </div>

        {/* Time Format */}
        <div className="flex items-start justify-between gap-4 py-2 border-t pt-4">
          <div className="space-y-1">
            <div className="text-xs font-bold">Time Format</div>
            <div className="text-[11px] text-muted-foreground leading-normal">
              Set the time format for the Calendar and Queue.
            </div>
          </div>
          <select
            value={timeFormat}
            onChange={(e) => {
              const value = e.target.value as "12-hour" | "24-hour";
              setTimeFormat(value);
              void persist({ time_format: value });
            }}
            className="border bg-card text-foreground px-3 py-1.5 text-xs outline-none focus:border-[#0077B5] rounded-none min-w-[120px] border-border"
          >
            <option>12-hour</option>
            <option>24-hour</option>
          </select>
        </div>

        {/* Start of Week */}
        <div className="flex items-start justify-between gap-4 py-2 border-t pt-4">
          <div className="space-y-1">
            <div className="text-xs font-bold">Start of Week</div>
            <div className="text-[11px] text-muted-foreground leading-normal">
              Set the first day of the week for the Calendar, date picker, and your posting streaks.
            </div>
          </div>
          <select
            value={startOfWeek}
            onChange={(e) => {
              const value = e.target.value as "Sunday" | "Monday";
              setStartOfWeek(value);
              void persist({ week_start: value });
            }}
            className="border bg-card text-foreground px-3 py-1.5 text-xs outline-none focus:border-[#0077B5] rounded-none min-w-[120px] border-border"
          >
            <option>Sunday</option>
            <option>Monday</option>
          </select>
        </div>

        {/* Landing Page */}
        <div className="flex items-start justify-between gap-4 py-2 border-t pt-4">
          <div className="space-y-1">
            <div className="text-xs font-bold">Landing Page</div>
            <div className="text-[11px] text-muted-foreground leading-normal">
              Choose where you land after logging in.
            </div>
          </div>
          <select
            value={landingPage}
            onChange={(e) => {
              const value = e.target.value as "Dashboard" | "Calendar" | "Create";
              setLandingPage(value);
              void persist({ landing_page: value });
            }}
            className="border bg-card text-foreground px-3 py-1.5 text-xs outline-none focus:border-[#0077B5] rounded-none min-w-[120px] border-border"
          >
            <option>Dashboard</option>
            <option>Create</option>
            <option>Calendar</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// 3. NOTIFICATIONS VIEW
function NotificationsView() {
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    post_failures: true,
    channel_updates: true,
    collaboration: true,
    publish_confirmations: false,
    empty_queue: false,
    billing: true,
    daily_recap: true,
    weekly_report: true,
  });

  useEffect(() => {
    void getUserSettings().then((settings) => setPrefs(settings.notification_prefs));
  }, []);

  const toggle = (key: keyof NotificationPrefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    void updateUserSettings({ notification_prefs: next });
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold uppercase tracking-wide">Notifications</h2>

      {/* Activity & Alerts Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#86888A]">
          Activity & Alerts
        </h3>

        <div className="space-y-4 border-t pt-4">
          {/* Post Failures */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-xs font-bold">Post Failures</div>
              <div className="text-[11px] text-muted-foreground leading-normal">
                Sends an alert when a scheduled post fails to publish.
              </div>
            </div>
            <Toggle active={prefs.post_failures} onToggle={() => toggle("post_failures")} />
          </div>

          {/* Channel Connection Updates */}
          <div className="flex items-center justify-between gap-4 border-t pt-4">
            <div className="space-y-0.5">
              <div className="text-xs font-bold">Channel Connection Updates</div>
              <div className="text-[11px] text-muted-foreground leading-normal">
                Sends an alert when a channel is disconnected or when permissions expire.
              </div>
            </div>
            <Toggle active={prefs.channel_updates} onToggle={() => toggle("channel_updates")} />
          </div>

          {/* Collaboration */}
          <div className="flex items-center justify-between gap-4 border-t pt-4">
            <div className="space-y-0.5">
              <div className="text-xs font-bold">Collaboration</div>
              <div className="text-[11px] text-muted-foreground leading-normal">
                Sends updates about team activity like contributions and approval requests.
              </div>
            </div>
            <Toggle active={prefs.collaboration} onToggle={() => toggle("collaboration")} />
          </div>

          {/* Published Post Confirmations */}
          <div className="flex items-center justify-between gap-4 border-t pt-4">
            <div className="space-y-0.5">
              <div className="text-xs font-bold">Published Post Confirmations</div>
              <div className="text-[11px] text-muted-foreground leading-normal">
                Sends an alert whenever a post is successfully published.
              </div>
            </div>
            <Toggle active={prefs.publish_confirmations} onToggle={() => toggle("publish_confirmations")} />
          </div>

          {/* Empty Queue Alerts */}
          <div className="flex items-center justify-between gap-4 border-t pt-4">
            <div className="space-y-0.5">
              <div className="text-xs font-bold">Empty Queue Alerts</div>
              <div className="text-[11px] text-muted-foreground leading-normal">
                Sends an alert when a channel has no posts scheduled.
              </div>
            </div>
            <Toggle active={prefs.empty_queue} onToggle={() => toggle("empty_queue")} />
          </div>

          {PRICING_ENABLED && (
          <div className="flex items-center justify-between gap-4 border-t pt-4">
            <div className="space-y-0.5">
              <div className="text-xs font-bold">Billing and Payment Reminders</div>
              <div className="text-[11px] text-muted-foreground leading-normal">
                Sends payment reminders and other billing related notices.
              </div>
            </div>
            <Toggle active={prefs.billing} onToggle={() => toggle("billing")} />
          </div>
          )}
        </div>
      </div>

      {/* Insights & Performance Section */}
      <div className="space-y-4 pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#86888A]">
          Insights & Performance
        </h3>

        <div className="space-y-4 border-t pt-4">
          {/* Daily Post Recap */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-xs font-bold">Daily Post Recap</div>
              <div className="text-[11px] text-muted-foreground leading-normal">
                Sends a daily summary of performance, comments, and upcoming scheduled posts.
              </div>
            </div>
            <Toggle active={prefs.daily_recap} onToggle={() => toggle("daily_recap")} />
          </div>

          {/* Weekly Report Card */}
          <div className="flex items-center justify-between gap-4 border-t pt-4">
            <div className="space-y-0.5">
              <div className="text-xs font-bold">Weekly Report Card</div>
              <div className="text-[11px] text-muted-foreground leading-normal">
                Sends a weekly report on channel and post performance.
              </div>
            </div>
            <Toggle active={prefs.weekly_report} onToggle={() => toggle("weekly_report")} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom Switch/Toggle Component (Squared UI)
function Toggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative h-6 w-11 transition-colors border outline-none rounded-full shrink-0 ${
        active ? "bg-[#0077B5] border-[#0077B5]" : "bg-muted border-border/80"
      }`}
    >
      <span
        className={`absolute top-0.5 h-[18px] w-[18px] transition-all rounded-full shadow-sm ${
          active ? "bg-white" : "bg-background border border-border/80"
        } ${active ? "left-[21px]" : "left-0.5"}`}
      />
    </button>
  );
}

// REFER A FRIEND VIEW — matches design image
function ReferAFriendView() {
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    void getUserSettings().then((settings) => setReferralCode(settings.referral_code));
  }, []);

  const referralLink = useMemo(() => {
    if (!referralCode) return "";
    return `${window.location.origin}/signup?ref=${encodeURIComponent(referralCode)}`;
  }, [referralCode]);

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    "Copy your full signup link above.",
    "Share it publicly or with someone who would enjoy using Linker Post.",
    "Your friend signs up for their free Linker Post account.",
    "You and your friend can grow on LinkedIn and beyond.",
  ];

  return (
    <div className="space-y-7">
      <div>
        <h2 className="font-display text-xl font-bold tracking-wide mb-3">Refer a Friend</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Enjoying Linker Post?
          <br />
          Your friends will too! Share Linker Post to help them grow an audience with a totally free
          account.
          <br />
          You'll also support Linker Post's growth, allowing us to continue improving the service.
        </p>
      </div>

      {/* Referral link section */}
      <div className="space-y-2">
        <div className="text-sm font-medium">Your referral signup link:</div>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            readOnly
            value={referralLink}
            className="flex-1 border bg-card text-foreground px-3.5 py-2 text-xs outline-none rounded-none border-border truncate font-mono"
          />
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 border border-border bg-card hover:bg-muted text-foreground px-4 py-2 text-xs font-medium rounded-none transition shrink-0"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-[#128C7E]" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <button
            type="button"
            onClick={() => {
              const payload = {
                title: "Join me on Linker Post",
                text: "I'm using Linker Post to plan and publish LinkedIn content.",
                url: referralLink,
              };
              if (navigator.share) {
                void navigator.share(payload).catch(() => undefined);
                return;
              }
              handleCopy();
            }}
            className="flex items-center gap-1.5 bg-[#0077B5] hover:bg-[#00A0DC] text-white px-4 py-2 text-xs font-medium rounded-none transition shrink-0"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share Now
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* How it works */}
      <div className="space-y-3">
        <div className="text-sm font-semibold">How it works:</div>
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 h-5 w-5 rounded-full border-2 border-[#128C7E]/40 bg-[#DCF8C6] text-[#075E54] flex items-center justify-center text-[10px] font-bold">
                {i + 1}
              </span>
              <span className="text-sm text-muted-foreground leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function HelpSupportView() {
  const [showSuggest, setShowSuggest] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (title.trim().length < 3 || body.trim().length < 8) return;
    setSaving(true);
    setStatus("");
    try {
      await createSupportTicket({
        kind: "support",
        title: title.trim(),
        body: body.trim(),
      });
      setTitle("");
      setBody("");
      setStatus("Message sent. We’ll follow up at your account email.");
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : "Could not send the message.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {showSuggest && <SuggestFeatureModal onClose={() => setShowSuggest(false)} />}

      <div>
        <h2 className="font-display text-xl font-bold tracking-wide mb-1">Help & Support</h2>
        <p className="text-sm text-muted-foreground">
          Send a message or email us directly. We’ll get back to you as soon as we can.
        </p>
      </div>

      <div className="border bg-card px-5 py-4 flex items-start gap-3">
        <Mail className="h-5 w-5 text-[#0077B5] shrink-0 mt-0.5" />
        <div className="text-sm">
          <div className="font-medium">Email support</div>
          <a href={supportMailto()} className="text-[#0077B5] hover:underline">
            {SUPPORT_EMAIL}
          </a>
          <p className="mt-1 text-xs text-muted-foreground">Available Mon–Fri, 9am–6pm IST</p>
        </div>
      </div>

      <div className="border bg-card px-5 py-4 space-y-3">
        <div className="font-medium text-sm">Send a support message</div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Subject"
          className="w-full border bg-background px-3 py-2 text-sm outline-none focus:border-[#0077B5]"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="How can we help?"
          rows={5}
          className="w-full border bg-background px-3 py-2 text-sm resize-none outline-none focus:border-[#0077B5]"
        />
        {status && <p className="text-xs text-muted-foreground">{status}</p>}
        <button
          type="button"
          disabled={saving || title.trim().length < 3 || body.trim().length < 8}
          onClick={() => void submit()}
          className="inline-flex items-center gap-2 bg-[#0077B5] hover:bg-[#00A0DC] text-white px-4 py-2 text-sm disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
          Send message
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowSuggest(true)}
        className="w-full border bg-card px-5 py-4 hover:bg-muted/10 transition text-left flex items-center gap-4"
      >
        <Lightbulb className="h-5 w-5 text-[#0077B5] shrink-0" />
        <div className="flex-1">
          <div className="text-sm font-medium">Suggest a feature</div>
          <div className="text-xs text-muted-foreground">Share a product idea with the team</div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}

// SUGGEST FEATURE MODAL
function SuggestFeatureModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("scheduling");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    void createSupportTicket({
      kind: "feature",
      category,
      title: title.trim(),
      body: description.trim(),
    })
      .then(() => setSubmitted(true))
      .catch(() => setSubmitted(true));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-border rounded-none shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Lightbulb className="h-5 w-5 text-[#0077B5]" />
            <h2 className="text-base font-semibold">Suggest a Feature</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-none transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          <div className="px-6 py-12 flex flex-col items-center gap-4 text-center">
            <div className="h-14 w-14 rounded-full bg-[#0077B5]/10 flex items-center justify-center">
              <Check className="h-7 w-7 text-[#0077B5]" />
            </div>
            <div>
              <h3 className="text-base font-semibold mb-1">Email application opened</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Your suggestion has not been received yet. Review and send the message from your
                email application.
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-2 bg-[#0077B5] hover:bg-[#00A0DC] text-white px-6 py-2 text-sm font-medium rounded-none transition"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Have an idea that would make Linker Post better? Share your suggestion and help shape
              the product roadmap.
            </p>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border bg-background text-foreground px-3 py-2 text-sm outline-none focus:border-[#0077B5] rounded-none border-border"
              >
                <option value="scheduling">Scheduling & Calendar</option>
                <option value="analytics">Analytics & Insights</option>
                <option value="ai">AI Agents</option>
                <option value="accounts">Account Management</option>
                <option value="billing">Billing & Plans</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Feature Title */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                Feature Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Bulk schedule posts from CSV"
                className="w-full border bg-background text-foreground px-3 py-2 text-sm outline-none focus:border-[#0077B5] rounded-none border-border placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the feature and how it would help you..."
                rows={4}
                className="w-full border bg-background text-foreground px-3 py-2 text-sm outline-none focus:border-[#0077B5] rounded-none border-border placeholder:text-muted-foreground/50 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-border bg-card hover:bg-muted text-foreground py-2 text-sm font-medium rounded-none transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim() || !description.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-[#0077B5] hover:bg-[#00A0DC] disabled:opacity-40 disabled:cursor-not-allowed text-white py-2 text-sm font-medium rounded-none transition"
              >
                <Send className="h-3.5 w-3.5" />
                Submit Suggestion
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
