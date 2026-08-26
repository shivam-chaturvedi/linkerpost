import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageCircle, BookOpen, Shield, CalendarDays, Users2, Bot, ArrowRight } from "lucide-react";
import { PublicNav } from "@/components/site/PublicNav";
import { Footer } from "@/components/site/Footer";
import { SUPPORT_EMAIL, supportMailto } from "@/lib/support";
import { absoluteUrl } from "@/lib/seo";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & Support — Linker Post" },
      {
        name: "description",
        content:
          "Get help with Linker Post LinkedIn accounts, scheduling, AI agents, publishing, and workspace setup.",
      },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/help") }],
  }),
  component: HelpPage,
});

const TOPICS = [
  {
    icon: Users2,
    title: "Accounts",
    body: "Connect a LinkedIn profile from Accounts, approve the requested permissions, and you can post from that destination.",
  },
  {
    icon: CalendarDays,
    title: "Create and schedule",
    body: "Write a post in Create, then save a draft, schedule it, or publish. Scheduled posts appear on Calendar.",
  },
  {
    icon: Bot,
    title: "Agents",
    body: "Run the content planner from Agents. Previous runs stay in history. Library only stores runs when auto-save is on.",
  },
  {
    icon: Shield,
    title: "Access and security",
    body: "Sessions last one week. If you are signed out, sign in again. Change your password from Settings → Profile.",
  },
];

const ISSUES = [
  {
    q: "I cannot connect LinkedIn",
    a: "Confirm the LinkedIn app has the same redirect URL as this environment, then retry Connect LinkedIn from Accounts.",
  },
  {
    q: "A scheduled post did not publish",
    a: "Open Manage Posts, check the post status, and reconnect LinkedIn if the account shows expired access.",
  },
  {
    q: "An agent run failed",
    a: "Open Agents → previous runs for the error. Rate-limit messages mean you should wait and try again.",
  },
  {
    q: "I need to change my name or password",
    a: "Go to Settings → Profile. Email stays on the account and cannot be edited from that screen.",
  },
];

function HelpPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm font-medium text-primary">Support</p>
        <h1 className="font-display mt-3 text-4xl tracking-tight md:text-5xl">Help & Support</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Use this page for product help, common issues, and how to reach the Linker Post team.
        </p>

        <section className="mt-10 rounded-2xl border bg-card p-6 shadow-soft">
          <div className="flex items-start gap-4">
            <Mail className="mt-1 h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Email us</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                The fastest way to reach support is email. Include your account email and a short
                description of what you were doing.
              </p>
              <a
                href={supportMailto()}
                className="mt-4 inline-flex items-center gap-2 text-primary hover:underline"
              >
                {SUPPORT_EMAIL}
                <ArrowRight className="h-4 w-4" />
              </a>
              <p className="mt-2 text-xs text-muted-foreground">Monday–Friday, 9am–6pm IST</p>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl">How to get support</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {TOPICS.map((topic) => (
              <article key={topic.title} className="rounded-2xl border bg-card p-5">
                <topic.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-semibold">{topic.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{topic.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl">Common issues</h2>
          <div className="mt-6 space-y-4">
            {ISSUES.map((item) => (
              <article key={item.q} className="rounded-2xl border bg-card p-5">
                <h3 className="flex items-center gap-2 font-semibold">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  {item.q}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-2xl border bg-muted/30 p-6">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="mt-3 text-xl font-semibold">Already have an account?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Signed-in users can also send a support message from Settings → Help & Support.
          </p>
          <Link to="/app/settings" search={{ tab: "help" }} className="mt-4 inline-flex text-sm text-primary hover:underline">
            Open in-app support
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
