import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PublicNav } from "@/components/site/PublicNav";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function MarketingSeoPage({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-3xl px-6 py-16 md:py-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
        <h1 className="font-display mt-3 text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
        <p className="mt-5 text-lg text-muted-foreground">{lead}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/signup">
            <Button className="rounded-full px-6">
              Create free account <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/login" search={{ google: undefined, error: undefined }}>
            <Button variant="outline" className="rounded-full px-6">
              Sign in
            </Button>
          </Link>
        </div>
        <div className="prose-seo mt-14 space-y-10 text-[15px] leading-relaxed text-foreground/90">
          {children}
        </div>
        <div className="mt-16 rounded-2xl border bg-card p-8 text-center shadow-soft">
          <h2 className="font-display text-2xl">Ready to try it in Linker Post?</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Connect LinkedIn, draft or plan with AI, then schedule posts from one workspace.
          </p>
          <div className="mt-6">
            <Link to="/signup">
              <Button className="rounded-full px-6">
                Get started <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function SeoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t pt-10">
      <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-4 text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

export function SeoSteps({ steps }: { steps: Array<{ title: string; body: string }> }) {
  return (
    <ol className="space-y-4">
      {steps.map((step, index) => (
        <li key={step.title} className="rounded-xl border bg-card p-4">
          <div className="font-medium text-foreground">
            {index + 1}. {step.title}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}

export function SeoFaq({ items }: { items: Array<{ q: string; a: string }> }) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.q} className="rounded-xl border bg-card p-4">
          <h3 className="font-medium text-foreground">{item.q}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
        </div>
      ))}
    </div>
  );
}

export function TopicExamples({ label, topics }: { label: string; topics: string[] }) {
  return (
    <p>
      <strong>{label}</strong> {topics.join(" · ")}
    </p>
  );
}
