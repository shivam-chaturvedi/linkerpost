import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/site/Logo";
import { connectLinkedIn, getAccounts, linkedInOAuthErrorMessage } from "@/lib/api";
import { HR_FEATURE_ENABLED } from "@/lib/features";
import { useEffect, useState } from "react";
import {
  Linkedin,
  Users2,
  Wand2 as Sparkles,
  CalendarDays,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  Megaphone,
  Rocket,
  PenSquare,
  Mail,
} from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome to Linker Post — set up your workspace" },
      {
        name: "description",
        content: "Tell us about your goals so Linker Post can tailor your LinkedIn workflow.",
      },
    ],
  }),
  component: Onboarding,
});

type Step = {
  title: string;
  subtitle: string;
  body: React.ReactNode;
};

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [persona, setPersona] = useState<"creator" | "hr" | null>(
    HR_FEATURE_ENABLED ? null : "creator",
  );
  const [role, setRole] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [cadence, setCadence] = useState<string | null>("3-5");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const hrEmailConnected = false;

  useEffect(() => {
    if (!HR_FEATURE_ENABLED) localStorage.setItem("linker-post-persona", "creator");
    const params = new URLSearchParams(window.location.search);
    if (params.get("linkedin") === "error") {
      setConnectionError(linkedInOAuthErrorMessage(params.get("error")));
    }
    if (params.has("linkedin")) window.history.replaceState({}, "", window.location.pathname);
    void getAccounts()
      .then((accounts) => setConnected(accounts.some((account) => account.provider === "linkedin")))
      .catch(() => undefined);
  }, []);

  const handleLinkedInConnect = async () => {
    setConnecting(true);
    setConnectionError(null);
    try {
      await connectLinkedIn("/onboarding");
    } catch (caught) {
      setConnecting(false);
      setConnectionError(
        caught instanceof Error ? caught.message : "Could not start the LinkedIn connection.",
      );
    }
  };

  const handleFinish = () => {
    if (persona) {
      localStorage.setItem("linker-post-persona", persona);
    }
    navigate({ to: "/app/dashboard" });
  };

  const personaStep: Step = {
    title: "How will you use Linker Post?",
    subtitle: "We'll tailor your workspace to your primary use case.",
    body: (
      <div className={`grid grid-cols-1 gap-4 ${HR_FEATURE_ENABLED ? "sm:grid-cols-2" : ""}`}>
        <button
          onClick={() => {
            setPersona("creator");
            setStep((s) => s + 1);
          }}
          className={`flex flex-col items-center justify-center gap-4 rounded-2xl border p-6 text-center transition ${
            persona === "creator"
              ? "border-primary bg-brand-soft ring-2 ring-primary/20"
              : "bg-card hover:bg-muted"
          }`}
        >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Rocket className="h-6 w-6" />
          </span>
          <div>
            <div className="font-display text-lg">Grow my Reach</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Automate posts, increase engagement, and build a personal or company brand.
            </div>
          </div>
        </button>

        {HR_FEATURE_ENABLED && (
          <button
            onClick={() => {
              setPersona("hr");
              setStep((s) => s + 1);
            }}
            className={`flex flex-col items-center justify-center gap-4 rounded-2xl border p-6 text-center transition ${
              persona === "hr"
                ? "border-primary bg-brand-soft ring-2 ring-primary/20"
                : "bg-card hover:bg-muted"
            }`}
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <Users2 className="h-6 w-6" />
            </span>
            <div>
              <div className="font-display text-lg">Hire Candidates</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Create job posts, auto-filter applicants via email, and schedule interviews.
              </div>
            </div>
          </button>
        )}
      </div>
    ),
  };

  const creatorSteps: Step[] = [
    {
      title: "What best describes you?",
      subtitle: "We'll tailor templates, agents and analytics to your role.",
      body: (
        <div className="grid grid-cols-2 gap-3">
          {[
            { v: "founder", l: "Founder / Operator", i: Rocket },
            { v: "creator", l: "Solo Creator", i: PenSquare },
            { v: "marketer", l: "Marketing team", i: Megaphone },
            { v: "agency", l: "Agency", i: Briefcase },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => setRole(o.v)}
              className={`rounded-2xl border p-5 text-left transition ${
                role === o.v ? "border-primary bg-brand-soft" : "bg-card hover:bg-muted"
              }`}
            >
              <o.i
                className={`h-5 w-5 ${role === o.v ? "text-primary" : "text-muted-foreground"}`}
              />
              <div className="font-display mt-3 text-base">{o.l}</div>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "What's your main goal?",
      subtitle: "We'll wire the right agent recipes to match.",
      body: (
        <div className="space-y-2.5">
          {[
            { v: "leads", l: "Generate inbound leads", d: "Hooks, CTAs and case studies." },
            { v: "brand", l: "Build personal brand", d: "Daily reflections, founder stories." },
            { v: "thought", l: "Thought leadership", d: "Long-form articles & opinions." },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => setGoal(o.v)}
              className={`flex w-full items-center justify-between rounded-2xl border bg-card p-4 text-left transition ${
                goal === o.v ? "border-primary ring-2 ring-primary/20" : "hover:bg-muted"
              }`}
            >
              <div>
                <div className="font-display text-base">{o.l}</div>
                <div className="text-sm text-muted-foreground">{o.d}</div>
              </div>
              {goal === o.v && <CheckCircle2 className="h-5 w-5 text-primary" />}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "How often do you want to post?",
      subtitle: "We'll generate a calendar template to match.",
      body: (
        <div className="grid grid-cols-3 gap-3">
          {[
            { v: "1-2", l: "1–2 / week", d: "Light cadence" },
            { v: "3-5", l: "3–5 / week", d: "Most popular" },
            { v: "daily", l: "Daily", d: "Power mode" },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => setCadence(o.v)}
              className={`rounded-2xl border p-5 text-center transition ${
                cadence === o.v ? "border-primary bg-brand-soft" : "bg-card hover:bg-muted"
              }`}
            >
              <CalendarDays
                className={`mx-auto h-5 w-5 ${cadence === o.v ? "text-primary" : "text-muted-foreground"}`}
              />
              <div className="font-display mt-3 text-base">{o.l}</div>
              <div className="text-xs text-muted-foreground">{o.d}</div>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Connect your first LinkedIn",
      subtitle: "You can add more accounts and company pages later.",
      body: (
        <div className="space-y-4">
          <button
            onClick={() => void handleLinkedInConnect()}
            disabled={connected || connecting}
            className={`flex w-full items-center justify-between rounded-2xl border p-5 text-left transition ${
              connected
                ? "border-emerald-400 bg-emerald-50"
                : "bg-card hover:bg-muted disabled:opacity-60"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-primary">
                <Linkedin className="h-5 w-5" />
              </span>
              <div>
                <div className="font-display text-base">
                  {connected ? "LinkedIn connected" : "Connect LinkedIn"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {connected
                    ? "LinkedIn profile connected"
                    : "Authorize Linker Post to publish on your behalf"}
                </div>
              </div>
            </div>
            {connected ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <span className="rounded-full bg-primary px-4 py-1.5 text-xs text-primary-foreground">
                {connecting ? "Connecting…" : "Connect"}
              </span>
            )}
          </button>
          {connectionError && <p className="text-xs text-destructive">{connectionError}</p>}
        </div>
      ),
    },
  ];

  const hrSteps: Step[] = [
    {
      title: "Connect your HR Email",
      subtitle: "We'll monitor incoming applications to this address.",
      body: (
        <div className="space-y-4">
          <button
            disabled
            title="Email OAuth is not configured"
            className={`flex w-full items-center justify-between rounded-2xl border p-5 text-left transition ${
              hrEmailConnected
                ? "border-emerald-400 bg-emerald-50"
                : "cursor-not-allowed bg-card opacity-60"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${hrEmailConnected ? "bg-emerald-500/10 text-emerald-600" : "bg-brand-soft text-primary"}`}
              >
                <Mail className="h-5 w-5" />
              </span>
              <div>
                <div className="font-display text-base">
                  {hrEmailConnected ? "Google Workspace connected" : "Connect Work Email"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {hrEmailConnected
                    ? "Work email connected · Monitoring on"
                    : "Authorize Linker Post to read applicant emails"}
                </div>
              </div>
            </div>
            {hrEmailConnected ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <span className="rounded-full bg-primary px-4 py-1.5 text-xs text-primary-foreground">
                Connect Google
              </span>
            )}
          </button>
        </div>
      ),
    },
    {
      title: "Connect your LinkedIn profile",
      subtitle: "Choose the identity Linker Post can publish from.",
      body: (
        <div className="space-y-4">
          <button
            onClick={() => void handleLinkedInConnect()}
            disabled={connected || connecting}
            className={`flex w-full items-center justify-between rounded-2xl border p-5 text-left transition ${
              connected
                ? "border-emerald-400 bg-emerald-50"
                : "bg-card hover:bg-muted disabled:opacity-60"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-primary">
                <Briefcase className="h-5 w-5" />
              </span>
              <div>
                <div className="font-display text-base">
                  {connected ? "LinkedIn connected" : "Connect LinkedIn"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {connected
                    ? "Publishing identity connected"
                    : "Authorize Linker Post to publish on your behalf"}
                </div>
              </div>
            </div>
            {connected ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <span className="rounded-full bg-primary px-4 py-1.5 text-xs text-primary-foreground">
                {connecting ? "Connecting…" : "Connect"}
              </span>
            )}
          </button>
          {connectionError && <p className="text-xs text-destructive">{connectionError}</p>}
        </div>
      ),
    },
  ];

  const steps = HR_FEATURE_ENABLED
    ? [personaStep, ...(persona === "hr" ? hrSteps : creatorSteps)]
    : creatorSteps;

  const total = steps.length;
  const current = steps[step];
  const isLast = step === total - 1;
  const progressStep = HR_FEATURE_ENABLED ? step : step + 1;
  const progressTotal = HR_FEATURE_ENABLED ? total - 1 : total;
  const progressSteps = HR_FEATURE_ENABLED ? steps.slice(1) : steps;
  const showStepNavigation = !HR_FEATURE_ENABLED || step > 0;

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col">
      {/* Top brand bar */}
      <header className="flex items-center justify-between border-b bg-background px-6 py-4">
        <Logo />
        <button onClick={handleFinish} className="text-xs text-muted-foreground hover:underline">
          Skip onboarding
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col px-6 pb-16 pt-10">
          {/* Progress */}
          {showStepNavigation && (
            <div className="mb-8">
              <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Step {progressStep} of {progressTotal}
                </span>
                <span>{Math.round((progressStep / progressTotal) * 100)}% complete</span>
              </div>
              <div className="flex gap-1.5">
                {progressSteps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition ${
                      i < progressStep ? "bg-primary" : "bg-border"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Card */}
          <div className="rounded-3xl border bg-card p-8 shadow-soft">
            <h1 className="font-display text-3xl tracking-tight">{current.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{current.subtitle}</p>
            <div className="mt-8">{current.body}</div>
          </div>

          {/* Footer nav */}
          {showStepNavigation && (
            <div
              className={`mt-6 flex items-center ${
                !HR_FEATURE_ENABLED && step === 0 ? "justify-end" : "justify-between"
              }`}
            >
              {(HR_FEATURE_ENABLED || step > 0) && (
                <button
                  onClick={() => {
                    if (HR_FEATURE_ENABLED && step === 1) {
                      setPersona(null);
                      setStep(0);
                    } else {
                      setStep((s) => s - 1);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm shadow-soft transition disabled:opacity-40"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              )}
              <button
                onClick={() => {
                  if (isLast) handleFinish();
                  else setStep((s) => s + 1);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-soft hover:opacity-90"
              >
                {isLast ? "Enter Linker Post" : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
