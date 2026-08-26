import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Logo } from "@/components/site/Logo";
import { HR_FEATURE_ENABLED } from "@/lib/features";
import { SUPPORT_EMAIL, supportMailto } from "@/lib/support";
import { absoluteUrl } from "@/lib/seo";

export const Route = createFileRoute("/terms-of-service")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Linker Post" },
      {
        name: "description",
        content:
          "Terms governing your use of Linker Post, LinkedIn connections, content publishing, and AI features.",
      },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/terms-of-service") }],
  }),
  component: TermsOfService,
});

const LAST_UPDATED = "August 26, 2026";

function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Logo />
          <Link to="/" className="text-sm text-primary hover:underline">
            Back home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-10 px-6 py-16">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Service agreement
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Terms of Service</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>
          <p className="mt-4 text-slate-600">
            {HR_FEATURE_ENABLED
              ? "These Terms of Service (“Terms”) govern your access to and use of Linker Post, including LinkedIn content and any recruiting-related workflows we may offer."
              : "These Terms of Service (“Terms”) govern your access to and use of Linker Post, including LinkedIn content planning, scheduling, publishing, and AI-assisted workflows."}{" "}
            By creating an account or using the Service, you agree to these Terms and our{" "}
            <Link to="/privacy-policy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <TermsSection title="1. The Service">
          <p>
            Linker Post provides tools to manage LinkedIn content from a workspace: connecting
            LinkedIn accounts you authorize, composing and storing drafts, scheduling and publishing
            posts, viewing calendars and related analytics where available, running AI-assisted
            planning or rewriting, and managing account settings. Features may change as we improve
            the product.
          </p>
        </TermsSection>

        <TermsSection title="2. Eligibility and accounts">
          <p>
            You must be legally able to enter a contract and meet any minimum age required in your
            region. You are responsible for the accuracy of registration information, keeping
            credentials confidential, and all activity under your account. Notify us promptly if you
            suspect unauthorized access.
          </p>
          <p className="mt-3">
            One person or organization should control each account. You may not share login access
            in a way that bypasses security or these Terms.
          </p>
        </TermsSection>

        <TermsSection title="3. Your profile and workspace">
          <p>
            Your Linker Post profile and workspace settings identify you in the product and control
            preferences such as appearance and notifications. You agree to keep profile information
            reasonably accurate and not to impersonate others. We may suspend accounts that provide
            false information or abuse the Service.
          </p>
        </TermsSection>

        <TermsSection title="4. LinkedIn accounts, permissions, and publishing">
          <p>
            To publish or sync with LinkedIn, you must connect a LinkedIn account through LinkedIn’s
            OAuth flow and grant the permissions Linker Post requests. You represent that you are
            authorized to connect that LinkedIn profile (or page, if supported) and to post content
            through it.
          </p>
          <p className="mt-3">
            Linker Post stores encrypted tokens from LinkedIn so the Service can perform actions you
            request, including scheduled publishing when you are not actively signed in. You can
            disconnect LinkedIn in the product or revoke access in LinkedIn. If tokens expire or
            permissions are missing, publishing may fail until you reconnect and re-grant access.
          </p>
          <p className="mt-3">
            LinkedIn is a third-party service. LinkedIn’s terms, policies, rate limits, and API
            changes apply. We are not responsible for LinkedIn outages, policy enforcement, account
            restrictions, or changes that affect publishing.
          </p>
        </TermsSection>

        <TermsSection title="5. Content you create and AI features">
          <p>
            You retain ownership of content you submit. You grant us a limited license to host,
            process, transmit, and display that content as needed to operate the Service (including
            sending it to LinkedIn when you publish, and to AI providers when you use AI features).
          </p>
          <p className="mt-3">
            You are solely responsible for content published through Linker Post, including
            compliance with law, LinkedIn policies, intellectual property, privacy, and publicity
            rights. Review AI-generated drafts before approving or scheduling. Automated or
            scheduled actions run according to your configuration; you remain responsible for their
            results.
          </p>
        </TermsSection>

        <TermsSection title="6. Acceptable use">
          <p>You agree not to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Violate law, LinkedIn rules, or third-party rights</li>
            <li>Post deceptive, harmful, harassing, or unauthorized content</li>
            <li>Attempt to access others’ accounts or data without permission</li>
            <li>Probe, overload, or disrupt the Service or related infrastructure</li>
            <li>Reverse engineer the Service except where allowed by law</li>
            <li>Use the Service to spam, scrape at scale in violation of law or platform rules, or automate abuse</li>
            <li>Misrepresent that AI-generated content was human-written where disclosure is required</li>
          </ul>
        </TermsSection>

        <TermsSection title="7. Analytics">
          <p>
            We use analytics (including Google Analytics) to understand how the product is used,
            which pages and features are visited most, and how to improve the Service. See our
            Privacy Policy for details.
          </p>
        </TermsSection>

        <TermsSection title="8. Fees">
          <p>
            Some features may be free or paid in the future. If we introduce paid plans, pricing and
            billing terms will be shown before you purchase. Unless stated otherwise, fees are
            non-refundable except where required by law.
          </p>
        </TermsSection>

        <TermsSection title="9. Suspension and termination">
          <p>
            You may stop using the Service at any time. To delete your account and associated
            personal data we hold in Linker Post, contact{" "}
            <a className="text-primary hover:underline" href={supportMailto("Account deletion request")}>
              {SUPPORT_EMAIL}
            </a>{" "}
            from your account email. We may suspend or terminate access if you breach these Terms,
            create risk for us or others, or if required for security or legal reasons.
          </p>
          <p className="mt-3">
            Deleting your Linker Post account does not automatically delete content already posted
            on LinkedIn. Disconnecting LinkedIn stops new actions through that connection.
          </p>
        </TermsSection>

        <TermsSection title="10. Disclaimers">
          <p>
            THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY
            LAW, WE DISCLAIM WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
            NON-INFRINGEMENT. We do not warrant uninterrupted publishing, accurate AI output, or
            that LinkedIn will accept every post.
          </p>
        </TermsSection>

        <TermsSection title="11. Limitation of liability">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, LINKER POST AND ITS OPERATORS WILL NOT BE LIABLE
            FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOST
            PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE OR LINKEDIN. OUR TOTAL
            LIABILITY FOR CLAIMS RELATING TO THE SERVICE IS LIMITED TO THE GREATER OF THE AMOUNTS
            YOU PAID US IN THE THREE MONTHS BEFORE THE CLAIM OR ONE HUNDRED US DOLLARS (US $100),
            EXCEPT WHERE LIABILITY CANNOT BE LIMITED BY LAW.
          </p>
        </TermsSection>

        <TermsSection title="12. Indemnity">
          <p>
            You agree to defend and indemnify Linker Post against claims arising from your content,
            your LinkedIn use, your breach of these Terms, or your violation of law or third-party
            rights, except to the extent caused by our willful misconduct.
          </p>
        </TermsSection>

        <TermsSection title="13. Changes">
          <p>
            We may update these Terms by posting a revised version with a new “Last updated” date.
            Material changes may also be communicated in-product or by email when appropriate.
            Continued use after changes become effective constitutes acceptance.
          </p>
        </TermsSection>

        <TermsSection title="14. Contact">
          <p>
            Questions about these Terms, account issues, or deletion requests:{" "}
            <a className="text-primary hover:underline" href={supportMailto("Terms of Service question")}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Related:{" "}
            <Link to="/privacy-policy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </p>
        </TermsSection>
      </main>
    </div>
  );
}

function TermsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-t pt-8">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <div className="space-y-3 leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}
