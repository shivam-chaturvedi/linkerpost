import { Link } from "@tanstack/react-router";
import { PRICING_ENABLED } from "@/lib/pricing";
import { Logo } from "./Logo";
import { SUPPORT_EMAIL, supportMailto } from "@/lib/support";

type FooterLink = { label: string; to?: string; href?: string };

const productLinks: FooterLink[] = [
  { label: "LinkedIn Post Generator", to: "/linkedin-post-generator" },
  { label: "LinkedIn Post Scheduler", to: "/linkedin-post-scheduler" },
  { label: "AI Content Planner", to: "/ai-linkedin-content-planner" },
  { label: "Content Calendar", to: "/linkedin-content-calendar" },
  { label: "LinkedIn AI Writer", to: "/linkedin-ai-writer" },
  { label: "Multi-account Manager", to: "/multiple-linkedin-account-manager" },
];

const resourceLinks: FooterLink[] = [
  { label: "Help & Support", to: "/help" },
  { label: "Privacy Policy", to: "/privacy-policy" },
  { label: "Terms of Service", to: "/terms-of-service" },
  { label: "Contact", href: supportMailto() },
];

const companyLinks: FooterLink[] = [
  { label: "Home", to: "/" },
  { label: "Sign up", to: "/signup" },
  { label: "Sign in", to: "/login" },
  ...(PRICING_ENABLED ? [{ label: "Pricing", to: "/pricing" } as FooterLink] : []),
];

function FooterLinkItem({ item }: { item: FooterLink }) {
  const className = "text-[15px] text-background/60 transition hover:text-background";
  if (item.to) {
    return (
      <Link to={item.to} className={className}>
        {item.label}
      </Link>
    );
  }
  return (
    <a href={item.href} className={className}>
      {item.label}
    </a>
  );
}

export function Footer() {
  return (
    <footer className="mt-32 bg-ink text-background">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr,3fr]">
          <div>
            <Logo size="large" lightSurface />
            <p className="mt-6 max-w-sm text-[15px] text-background/70">
              LinkedIn-first content tools for drafting, planning, scheduling, and managing multiple
              accounts in one workspace.
            </p>
            <a
              href={supportMailto()}
              className="mt-4 inline-block text-sm text-background/60 hover:text-background"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>

          <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
            <div>
              <div className="font-display text-sm uppercase tracking-widest text-background/50">
                Product
              </div>
              <ul className="mt-4 space-y-3">
                {productLinks.map((item) => (
                  <li key={item.label}>
                    <FooterLinkItem item={item} />
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-display text-sm uppercase tracking-widest text-background/50">
                Resources
              </div>
              <ul className="mt-4 space-y-3">
                {resourceLinks.map((item) => (
                  <li key={item.label}>
                    <FooterLinkItem item={item} />
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-display text-sm uppercase tracking-widest text-background/50">
                Company
              </div>
              <ul className="mt-4 space-y-3">
                {companyLinks.map((item) => (
                  <li key={item.label}>
                    <FooterLinkItem item={item} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-background/10 pt-8 text-sm text-background/50 md:flex-row md:items-center">
          <div>© {new Date().getFullYear()} Linker Post. All rights reserved.</div>
          <div className="flex flex-wrap items-center gap-6">
            <Link to="/privacy-policy" className="hover:text-background">
              Privacy
            </Link>
            <Link to="/terms-of-service" className="hover:text-background">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
