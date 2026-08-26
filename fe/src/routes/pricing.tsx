import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { PRICING_ENABLED } from "@/lib/pricing";
import { SUPPORT_EMAIL } from "@/lib/support";
import { useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import { PublicNav } from "@/components/site/PublicNav";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Planned Pricing — Linker Post" },
      {
        name: "description",
        content: "Simple pricing for creators, founders and teams running LinkedIn-first content.",
      },
    ],
  }),
  component: PricingPage,
});

const plans = (yearly: boolean) => [
  {
    name: "Creator",
    price: yearly ? 0 : 0,
    period: "Free forever",
    desc: "For solo creators getting started.",
    cta: "Start free",
    highlight: false,
    features: [
      "1 LinkedIn account",
      "Unlimited drafts",
      "10 scheduled posts / month",
      "Basic AI agent (draft only)",
      "Lightweight analytics",
    ],
  },
  {
    name: "Pro",
    price: yearly ? 19 : 24,
    period: yearly ? "/mo, billed yearly" : "/month",
    desc: "For serious creators & founders.",
    cta: "Start 14-day trial",
    highlight: true,
    features: [
      "5 LinkedIn accounts",
      "Unlimited scheduled posts",
      "All 5 AI agents",
      "Approval workflows",
      "Auto-queue mode",
      "Advanced analytics",
    ],
  },
  {
    name: "Team",
    price: yearly ? 49 : 59,
    period: yearly ? "/seat / mo, billed yearly" : "/seat / month",
    desc: "For agencies & in-house teams.",
    cta: "Talk to sales",
    highlight: false,
    features: [
      "Unlimited LinkedIn accounts",
      "Unlimited seats",
      "Roles & permissions",
      "Team approval queue",
      "Audit log & SSO",
      "Priority support",
    ],
  },
];

function PricingPage() {
  if (!PRICING_ENABLED) {
    return <Navigate to="/" replace />;
  }
  const [yearly, setYearly] = useState(true);
  const list = plans(yearly);

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <section className="mx-auto max-w-7xl px-6 pt-20 text-center">
        <div className="text-xs font-medium uppercase tracking-widest text-primary">
          Proposed pricing
        </div>
        <h1 className="font-display mt-3 text-5xl tracking-tight md:text-6xl">
          Planned packages for Linker Post.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Billing, entitlements, trials, and subscriptions are not implemented. These packages are
          product proposals, not currently purchasable plans.
        </p>

        <div className="mt-8 inline-flex items-center gap-1 rounded-full border bg-card p-1 shadow-soft">
          <button
            onClick={() => setYearly(false)}
            className={`rounded-full px-4 py-2 text-sm transition ${!yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`rounded-full px-4 py-2 text-sm transition ${yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Yearly · save 20%
          </button>
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-7xl px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {list.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-3xl border p-8 shadow-soft ${p.highlight ? "border-primary bg-card ring-2 ring-primary/15" : "bg-card"}`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">
                  Most popular
                </div>
              )}
              <div className="font-display text-2xl">{p.name}</div>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              <div className="mt-6 flex items-end gap-1">
                <div className="font-display text-5xl tracking-tight">${p.price}</div>
                <div className="mb-1.5 text-sm text-muted-foreground">{p.period}</div>
              </div>
              <Link to="/signup">
                <Button
                  className={`mt-6 w-full rounded-full ${p.highlight ? "" : ""}`}
                  variant={p.highlight ? "default" : "outline"}
                >
                  {p.cta} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <ul className="mt-8 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-3xl px-6">
        <h2 className="font-display text-center text-3xl tracking-tight md:text-4xl">
          Pricing FAQ
        </h2>
        <div className="mt-10 space-y-3">
          {[
            {
              q: "Can I switch plans later?",
              a: "Yes, upgrade or downgrade any time. Pro-rated invoices.",
            },
            {
              q: "Do I need a credit card to start?",
              a: "Only for paid plans. The Creator plan is free forever.",
            },
            {
              q: "What counts as a LinkedIn account?",
              a: "Each personal profile or company page connection counts as one account.",
            },
            {
              q: "Do you offer non-profit or student pricing?",
              a: `Contact ${SUPPORT_EMAIL} to ask about available discounts.`,
            },
          ].map((x) => (
            <div key={x.q} className="rounded-2xl border bg-card p-5 shadow-soft">
              <div className="font-display">{x.q}</div>
              <p className="mt-2 text-sm text-muted-foreground">{x.a}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
