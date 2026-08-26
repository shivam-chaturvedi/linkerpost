import { createFileRoute, Link } from "@tanstack/react-router";
import { PRICING_ENABLED } from "@/lib/pricing";
import {
  ArrowRight,
  CheckCircle2,
  Wand2 as Sparkles,
  CalendarDays,
  Send,
  Users2,
  BarChart3,
  Shield,
  Bot,
  Linkedin,
  ChevronDown,
  Zap,
  Layers,
} from "lucide-react";
import { PublicNav } from "@/components/site/PublicNav";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { ProductDemoVideo } from "@/components/site/ProductDemoVideo";
import { HR_FEATURE_ENABLED } from "@/lib/features";
import { DEMO_VIDEO_URL, HAS_DEMO_VIDEO } from "@/lib/demo-video";
import { useState } from "react";
import {
  absoluteUrl,
  demoVideoJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title:
          "Linker Post | AI LinkedIn Content Planner, Scheduler & Multi-Account Publisher",
      },
      {
        name: "description",
        content:
          "Turn today's trends into LinkedIn posts. Research topics like tech, cricket, business and current events with agentic AI, then draft, schedule and publish across multiple LinkedIn accounts.",
      },
      {
        name: "keywords",
        content:
          "LinkedIn content planner, LinkedIn scheduler, AI LinkedIn posts, LinkedIn multi account, LinkedIn calendar, LangGraph content agent, schedule LinkedIn posts, LinkedIn AI writing",
      },
      { name: "robots", content: "index,follow,max-image-preview:large" },
      { property: "og:url", content: absoluteUrl("/") },
      {
        property: "og:title",
        content: "Linker Post | Turn trends into LinkedIn posts with AI",
      },
      {
        property: "og:description",
        content:
          "Research trending topics, create days of LinkedIn content, schedule posts, and manage multiple LinkedIn accounts from one workspace.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Linker Post" },
      { property: "og:image", content: absoluteUrl("/og-image.png") },
      { property: "og:image:alt", content: "Linker Post | AI LinkedIn content planner & scheduler" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "Linker Post | AI LinkedIn content control center",
      },
      {
        name: "twitter:description",
        content:
          "From Dolly Parton to Meta stock and GTA 6, turn what people are talking about into LinkedIn posts you can schedule and publish.",
      },
      { name: "twitter:image", content: absoluteUrl("/twitter-card.png") },
    ],
    links: [
      { rel: "canonical", href: absoluteUrl("/") },
      ...(HAS_DEMO_VIDEO
        ? [
            {
              rel: "preload" as const,
              as: "video" as const,
              href: DEMO_VIDEO_URL,
              type: "video/mp4",
            },
          ]
        : []),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify([
          websiteJsonLd(),
          organizationJsonLd(),
          softwareApplicationJsonLd(),
          ...(HAS_DEMO_VIDEO ? [demoVideoJsonLd(DEMO_VIDEO_URL)] : []),
        ]),
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <Hero />
      <SocialProof />
      <TrendToPosts />
      <FeatureGrid />
      <DashboardPreview />
      <Agents />
      <HowItWorks />
      <WhyNotGeneric />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-16 text-center md:pb-24">
        <h1 className="font-display mx-auto max-w-4xl text-[44px] leading-[1.05] tracking-tight text-foreground md:text-7xl">
          Turn today's trends into
          <br />
          <span className="text-primary">your next LinkedIn posts.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Stop staring at a blank LinkedIn composer. Linker Post uses agentic AI to research what is
          trending, draft posts, and help you schedule a consistent calendar across LinkedIn
          accounts.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link to="/signup">
            <Button size="lg" className="rounded-full px-6">
              Create your account <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/app/dashboard">
            <Button size="lg" variant="outline" className="rounded-full px-6">
              Open dashboard
            </Button>
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Secure account sessions
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Focused content workflows
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Clean workspace organization
          </span>
        </div>

        <div className="mt-14">
          {HAS_DEMO_VIDEO && (
            <ProductDemoVideo
              src={DEMO_VIDEO_URL}
              title="Product demo · Linker Post AI workspace"
              caption="See Linker Post turn research into drafts, plans, and scheduled LinkedIn posts in one workspace. Hover to play. Use controls for pause, sound, and speed."
            />
          )}
        </div>
      </div>
    </section>
  );
}

function SocialProof() {
  return (
    <section className="border-y bg-muted/40 py-10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center text-sm text-muted-foreground">
          {HR_FEATURE_ENABLED
            ? "Built for individual creators, content teams, and recruiting workflows."
            : "Built for founders, creators, and teams who want consistent LinkedIn content without the grind."}
        </div>
      </div>
    </section>
  );
}

function TrendToPosts() {
  const trendGroups = [
    {
      title: "Entertainment & culture",
      topics: [
        "Dolly Parton",
        "Miley Cyrus",
        "Toxic movie review",
        "Witcher 3 Remastered",
        "GTA 6",
        "Endgame Encore",
        "Project Runway",
        "The Walking Dead",
        "Only Murders in the Building",
        "Star Wars Zero Company",
      ],
    },
    {
      title: "Sports",
      topics: [
        "Dodgers vs Braves",
        "Astros vs Yankees",
        "Ja'Marr Chase",
        "Tiger Woods",
        "John McEnroe",
        "Kyrie Irving",
        "Christian McCaffrey",
        "US Open",
        "Vietnam vs Thailand",
        "College Gameday",
      ],
    },
    {
      title: "Technology & business",
      topics: [
        "Meta stock",
        "Boston Scientific",
        "Altruist",
        "Humanoid robots",
        "LEGO Skylines",
        "PlayStation",
        "PCE",
        "Bill Gates",
        "GTA 6 Netflix",
        "NVIDIA",
      ],
    },
    {
      title: "News & current events",
      topics: [
        "Nepal",
        "South Carolina Senate race",
        "Oklahoma election results",
        "Secret Service investigation",
        "Solar flare",
        "Excessive heat",
        "FEMA",
        "Trump administration",
        "Mexico",
        "El Niño–Southern Oscillation",
      ],
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-28" aria-labelledby="trends-heading">
      <div className="mx-auto max-w-3xl text-center">
        <div className="text-xs font-medium uppercase tracking-widest text-primary">
          What&apos;s trending right now?
        </div>
        <h2 id="trends-heading" className="font-display mt-3 text-4xl tracking-tight md:text-5xl">
          From Dolly Parton to Meta stock: turn attention into LinkedIn posts
        </h2>
        <p className="mt-5 text-muted-foreground">
          From <strong className="font-medium text-foreground">Dolly Parton, Miley Cyrus and The Witcher 3</strong>{" "}
          to{" "}
          <strong className="font-medium text-foreground">
            GTA 6, Meta stock, humanoid robots and solar flares
          </strong>
          , there&apos;s always something happening. Linker Post helps you turn what&apos;s trending into
          your next LinkedIn content idea.
        </p>
      </div>

      <div className="mt-14">
        <h3 className="text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Trending topics people are talking about
        </h3>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {trendGroups.map((group) => (
            <article key={group.title} className="rounded-2xl border bg-card p-6 shadow-soft">
              <h4 className="font-display text-lg">{group.title}</h4>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {group.topics.join(" · ")}
              </p>
            </article>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted-foreground">
          Example angles only. Trends change fast. You choose what fits your audience. Linker Post
          researches context and drafts posts in your voice.
        </p>
      </div>

      <div className="mt-16 grid gap-6 lg:grid-cols-3">
        <article className="rounded-2xl border bg-card p-6 shadow-soft">
          <h3 className="font-display text-xl">Create days of LinkedIn content in one go</h3>
          <p className="mt-3 text-sm text-muted-foreground">
            Need a week of posts or a{" "}
            <strong className="font-medium text-foreground">30-day LinkedIn content plan</strong>? Ask
            for what you want. The AI can research trending topics, use web tools, generate ideas,
            draft posts, and organize them into a calendar.
          </p>
        </article>
        <article className="rounded-2xl border bg-card p-6 shadow-soft">
          <h3 className="font-display text-xl">Manage multiple LinkedIn accounts</h3>
          <p className="mt-3 text-sm text-muted-foreground">
            Connect multiple LinkedIn profiles and run content for each audience from one workspace.
            Different strategies, one dashboard, no tab chaos.
          </p>
        </article>
        <article className="rounded-2xl border bg-card p-6 shadow-soft">
          <h3 className="font-display text-xl">Research → create → schedule</h3>
          <p className="mt-3 text-sm text-muted-foreground">
            Find a topic. Turn it into a post. Pick a date and time. Schedule it. Trends change
            fast. Your content workflow doesn&apos;t have to.
          </p>
        </article>
      </div>

      <div className="mx-auto mt-14 max-w-3xl rounded-3xl border bg-muted/40 p-8 text-center md:p-10">
        <h3 className="font-display text-2xl md:text-3xl">
          Trends change fast. Your content doesn&apos;t have to.
        </h3>
        <p className="mt-4 text-muted-foreground">
          Use Linker Post to research what&apos;s getting attention, find relevant angles, and turn
          today&apos;s trends into content for your audience. Ask for your next 7, 14, or 30 days of
          LinkedIn posts.
        </p>
        <div className="mt-8">
          <Link to="/signup">
            <Button size="lg" className="rounded-full px-6">
              Try Linker Post <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: Users2,
    title: "Multi-account LinkedIn",
    desc: "Connect unlimited profiles & company pages. Switch destinations in one click.",
  },
  {
    icon: Send,
    title: "Smart composer",
    desc: "Tabs for text, image, video, document & article, with formatting, hashtags & mentions.",
  },
  {
    icon: CalendarDays,
    title: "Calendar & queue",
    desc: "Drag-drop scheduling, drafts, retries and per-account queues.",
  },
  {
    icon: Bot,
    title: "AI agents with guardrails",
    desc: "Idea, planner, draft, repurpose and auto-queue agents. Draft-only or auto-publish.",
  },
  {
    icon: Shield,
    title: "Approvals",
    desc: "Send drafts for review with a one-click approval workflow built for teams.",
  },
  {
    icon: BarChart3,
    title: "Lightweight analytics",
    desc: "Post status, publishing logs, and member analytics where the API allows.",
  },
];

function FeatureGrid() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-28">
      <div className="mx-auto max-w-2xl text-center">
        <div className="text-xs font-medium uppercase tracking-widest text-primary">
          What's inside
        </div>
        <h2 className="font-display mt-3 text-4xl tracking-tight md:text-5xl">
          A focused toolkit for LinkedIn, not yet-another social suite.
        </h2>
        <p className="mt-4 text-muted-foreground">
          Everything you need to run a serious LinkedIn presence, and nothing you don't.
        </p>
      </div>

      <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="group rounded-2xl border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-soft-lg"
          >
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-primary">
              <f.icon className="h-5 w-5" />
            </div>
            <div className="font-display mt-5 text-xl">{f.title}</div>
            <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <section className="bg-ink text-background">
      <div className="mx-auto max-w-7xl px-6 py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-accent">
              Built for posting
            </div>
            <h2 className="font-display mt-3 text-4xl tracking-tight md:text-5xl">
              A composer that respects LinkedIn's quirks.
            </h2>
            <p className="mt-5 max-w-md text-background/70">
              Switch tabs for text, image, video, document or article. Each content type uses the
              right upload, metadata, preview and limits, automatically.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Mentions, hashtags & rich formatter",
                "Per-destination character preview",
                "First-comment automation",
                "Save as draft, queue or publish now",
              ].map((x) => (
                <li key={x} className="flex items-start gap-3 text-[15px] text-background/85">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-accent" /> {x}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-background/10 bg-background/5 p-2">
            <div className="rounded-2xl bg-background text-foreground">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <Linkedin className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">New LinkedIn post</span>
              </div>
              <div className="grid grid-cols-[1fr,180px] gap-0">
                <div className="p-5">
                  <div className="flex gap-1.5">
                    {["Text", "Image", "Video", "Document", "Article"].map((t, i) => (
                      <span
                        key={t}
                        className={`rounded-full px-3 py-1 text-xs ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 rounded-xl border p-4 text-sm text-muted-foreground">
                    Start writing your LinkedIn post…
                  </div>
                </div>
                <div className="border-l p-4 text-xs">
                  <div className="font-display text-sm text-foreground">Preview</div>
                  <div className="mt-3 rounded-lg border p-2">
                    <div className="text-[11px] text-muted-foreground">linkedin.com</div>
                    <div className="mt-1 line-clamp-3 text-[11px] text-muted-foreground">
                      Your preview will appear here.
                    </div>
                  </div>
                  <div className="mt-3 rounded-full bg-primary px-3 py-2 text-center text-[11px] text-primary-foreground">
                    Queue post
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Agents() {
  const agents = [
    {
      name: "Idea Agent",
      desc: "Spots topic momentum and proposes weekly themes.",
      icon: Sparkles,
    },
    {
      name: "Planner Agent",
      desc: "Turns themes into a 7-day publishing plan.",
      icon: CalendarDays,
    },
    { name: "Draft Writer", desc: "Writes in your tone with hooks and CTAs.", icon: Layers },
    { name: "Auto-Queue", desc: "Fills your calendar based on approvals.", icon: Zap },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-28">
      <div className="grid items-end justify-between gap-6 md:flex">
        <div className="max-w-2xl">
          <div className="text-xs font-medium uppercase tracking-widest text-primary">Agents</div>
          <h2 className="font-display mt-3 text-4xl tracking-tight md:text-5xl">
            Set the tone. Pick a mode. Let agents handle the rest.
          </h2>
        </div>
        <p className="text-muted-foreground md:max-w-sm">
          Three safe modes: Draft Only, Approval Required, or Auto Publish. Every action is logged,
          every token is revocable.
        </p>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {agents.map((a) => (
          <div key={a.name} className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-background">
              <a.icon className="h-5 w-5" />
            </div>
            <div className="font-display mt-5 text-lg">{a.name}</div>
            <p className="mt-2 text-sm text-muted-foreground">{a.desc}</p>
            <div className="mt-5 flex items-center justify-between text-xs">
              <span className="rounded-full bg-muted px-2 py-1">Approval mode</span>
              <span className="text-muted-foreground">Next: 8:00 AM</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Connect LinkedIn",
      desc: "Authorize one or more profiles and company pages.",
    },
    {
      n: "02",
      title: "Set your voice",
      desc: "Pick tone, topics, audience, CTA preferences and banned themes.",
    },
    {
      n: "03",
      title: "Let agents draft",
      desc: "Choose Draft Only, Approval Required or Auto Publish.",
    },
    {
      n: "04",
      title: "Ship every day",
      desc: "Approve, schedule or let the queue run automatically.",
    },
  ];
  return (
    <section className="bg-muted/40 py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-medium uppercase tracking-widest text-primary">
            How it works
          </div>
          <h2 className="font-display mt-3 text-4xl tracking-tight md:text-5xl">
            From zero to consistent, in an afternoon.
          </h2>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border bg-card p-6">
              <div className="font-display text-3xl text-primary">{s.n}</div>
              <div className="font-display mt-2 text-lg">{s.title}</div>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyNotGeneric() {
  const points = [
    "Generic suites optimize for breadth. We optimize for one network done right.",
    "Native handling for documents, articles and multi-image posts.",
    "Agents that know LinkedIn voice, not 'social media' voice.",
    "Multi-account with role-aware org posting from day one.",
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <div className="text-xs font-medium uppercase tracking-widest text-primary">
            Why LinkedIn-first
          </div>
          <h2 className="font-display mt-3 text-4xl tracking-tight md:text-5xl">
            Don't bring a Swiss-army knife to a scalpel job.
          </h2>
        </div>
        <ul className="space-y-4">
          {points.map((p) => (
            <li
              key={p}
              className="flex items-start gap-3 rounded-2xl border bg-card p-5 shadow-soft"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
              <span className="text-[15px]">{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="bg-ink py-28 text-background">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="font-display max-w-2xl text-4xl tracking-tight md:text-5xl">
          Your workspace shows only your real connected data.
        </h2>
        <p className="mt-6 max-w-2xl text-background/70">
          {HR_FEATURE_ENABLED
            ? "New accounts begin with clean empty states. Posts, analytics, candidates, and agent outputs appear only after you create or import them."
            : "New accounts begin with clean empty states. Posts, analytics, and agent outputs appear only after you create or connect them."}
        </p>
      </div>
    </section>
  );
}

function FAQ() {
  const qs = [
    {
      q: "Can it turn trending topics into LinkedIn posts?",
      a: "Yes. Tell the AI Content Planner what you want to cover (technology, cricket, business, entertainment, or current events) and it can research context, draft posts, and help you build a multi-day calendar.",
    },
    {
      q: "Do I need a LinkedIn account to sign up?",
      a: "No. You create a Linker Post account with email or Google, then connect one or more LinkedIn accounts from inside the app.",
    },
    {
      q: "What is the difference between the post generator and the AI writer?",
      a: "The generator helps you create a first draft from a topic. The AI writer is for rewriting, tightening, or polishing copy you already have. Both live in the same Linker Post workspace.",
    },
    {
      q: "Can I schedule LinkedIn posts in advance?",
      a: "Yes. Save a draft in Manage Posts, pick a time, and Linker Post can publish to a connected LinkedIn account when that time arrives.",
    },
    {
      q: "Can I plan a week or a full month of LinkedIn content?",
      a: "Yes. The AI content planner can help you map 7, 14, or 30 days of topics and drafts, then you move posts into the calendar and scheduler.",
    },
    {
      q: "Can I manage more than one LinkedIn account?",
      a: "Yes. Connect multiple LinkedIn destinations in one workspace, then choose which account each post goes to when you draft or schedule.",
    },
    {
      q: "Can I post to company pages?",
      a: "Yes, as long as your member account has the required admin or poster role on the page.",
    },
    {
      q: "How safe is the auto-publish mode?",
      a: "Every agent action is logged. You can require approvals, restrict topics, or fall back to draft-only at any time.",
    },
    {
      q: "Do you support image, video and document posts?",
      a: "Yes. The composer switches uploads and metadata per content type, including articles and multi-image carousels.",
    },
    {
      q: "Where do I get help if something breaks?",
      a: "Use Help & Support in the site footer or app, or email us from the contact link. We cover account, LinkedIn connection, and publishing questions.",
    },
    {
      q: "Is there a free plan?",
      a: "Yes. The Creator plan is free for one LinkedIn account and a light agent quota.",
    },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="mx-auto max-w-3xl px-6 py-28">
      <div className="text-center">
        <div className="text-xs font-medium uppercase tracking-widest text-primary">FAQ</div>
        <h2 className="font-display mt-3 text-4xl tracking-tight md:text-5xl">
          Questions, answered.
        </h2>
      </div>
      <div className="mt-10 space-y-3">
        {qs.map((x, i) => (
          <button
            key={x.q}
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full rounded-2xl border bg-card p-5 text-left shadow-soft"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="font-display text-[17px]">{x.q}</span>
              <ChevronDown
                className={`h-5 w-5 transition-transform ${open === i ? "rotate-180" : ""}`}
              />
            </div>
            {open === i && <p className="mt-3 text-sm text-muted-foreground">{x.a}</p>}
          </button>
        ))}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-28">
      <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-20 text-center text-primary-foreground">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative">
          <h2 className="font-display mx-auto max-w-3xl text-4xl tracking-tight md:text-6xl">
            Build your next LinkedIn content calendar today.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-primary-foreground/80">
            Research trends, draft with AI, schedule posts, and publish across LinkedIn accounts from
            one focused workspace.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/signup">
              <Button size="lg" variant="secondary" className="rounded-full px-6">
                Create your account <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            {PRICING_ENABLED && (
              <Link to="/pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-primary-foreground/40 bg-transparent px-6 text-primary-foreground hover:bg-primary-foreground hover:text-primary"
                >
                  See pricing
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
