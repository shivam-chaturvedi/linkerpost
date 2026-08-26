import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Logo } from "@/components/site/Logo";
import { SUPPORT_EMAIL, supportMailto } from "@/lib/support";
import { absoluteUrl } from "@/lib/seo";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Linker Post" },
      {
        name: "description",
        content:
          "How Linker Post collects, uses, stores, and deletes account, profile, and LinkedIn data.",
      },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/privacy-policy") }],
  }),
  component: PrivacyPolicy,
});

const LAST_UPDATED = "August 26, 2026";

function PrivacyPolicy() {
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
            Data protection
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>
          <p className="mt-4 text-slate-600">
            This Privacy Policy explains how Linker Post (“we”, “us”, or “our”) collects, uses,
            stores, shares, and deletes information when you use our website, app, and related
            services (the “Service”). It covers your Linker Post account and profile, LinkedIn
            connections and permissions, content you create, and product analytics we use to
            operate and improve the Service.
          </p>
        </div>

        <PolicySection title="1. Who this policy applies to">
          <p>
            This policy applies to anyone who visits our marketing pages, creates a Linker Post
            account, signs in with email or Google, connects a LinkedIn account, creates or
            schedules posts, uses AI features, or contacts support.
          </p>
        </PolicySection>

        <PolicySection title="2. Information we collect">
          <p className="font-medium text-slate-800">Account and profile information</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Name, email address, and password (if you use email sign-in)</li>
            <li>Google account identifiers if you sign in with Google</li>
            <li>
              Optional profile details you provide in Settings (for example headline, bio, or
              company)
            </li>
            <li>Workspace preferences such as appearance, timezone, and notification settings</li>
          </ul>
          <p className="mt-4 font-medium text-slate-800">LinkedIn connection and permissions</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              When you connect LinkedIn, we receive OAuth tokens and profile details LinkedIn
              returns for the permissions you approve (such as name, email, profile photo, locale,
              and member identifiers)
            </li>
            <li>
              We store encrypted access and refresh tokens so we can publish, schedule, sync, or
              fetch engagement data on your behalf
            </li>
            <li>
              We record the scopes (permissions) LinkedIn grants, connection status, and sync
              timestamps
            </li>
            <li>
              We do not ask for or store your LinkedIn password. Access is limited to permissions
              you grant in LinkedIn’s consent screen and that you can revoke
            </li>
          </ul>
          <p className="mt-4 font-medium text-slate-800">Content and workspace data</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Drafts, scheduled posts, published posts, media you upload, and first comments</li>
            <li>Scheduling times, publish status, and failure reasons</li>
            <li>AI agent inputs, outputs, run history, and related library items</li>
            <li>In-app notifications and support or feature-request messages you send us</li>
          </ul>
          <p className="mt-4 font-medium text-slate-800">Usage and technical data</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Pages and features you visit in the product (for example dashboard, accounts, manage
              posts, calendar, agents), collected with Google Analytics so we can understand which
              parts of the product are used most
            </li>
            <li>Device, browser, approximate location derived from IP, and referral information</li>
            <li>Security logs such as authentication events and request identifiers</li>
            <li>LLM usage metrics (for example model, tokens, and feature name) to operate AI tools</li>
          </ul>
        </PolicySection>

        <PolicySection title="3. How we use your information">
          <p>We use your information to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Create and secure your Linker Post account and workspace</li>
            <li>
              Connect and manage LinkedIn profiles you authorize, including refreshing tokens when
              needed
            </li>
            <li>
              Compose, schedule, publish, sync, analyze, and comment on LinkedIn posts you request
            </li>
            <li>Run AI planning, rewriting, and in-app assistance features you choose to use</li>
            <li>Show calendars, dashboards, notifications, and settings</li>
            <li>
              Operate, secure, troubleshoot, and improve Linker Post (including understanding which
              pages and features are used most via analytics)
            </li>
            <li>Respond to support requests and account deletion requests</li>
            <li>Meet legal obligations and prevent abuse</li>
          </ul>
          <p className="mt-4">
            We use your data to provide Linker Post itself. We do not sell your personal information.
            We do not use your LinkedIn credentials to access LinkedIn outside the permissions and
            actions you authorize in the product.
          </p>
        </PolicySection>

        <PolicySection title="4. How LinkedIn permissions and account data are managed">
          <p>
            LinkedIn access is granted through LinkedIn’s OAuth process. You choose which LinkedIn
            account to connect and which permissions to allow. Typical publishing workflows need
            permissions such as posting on your behalf (for example member social scopes LinkedIn
            defines).
          </p>
          <p className="mt-3">
            Tokens are encrypted at rest in our database and used only by Linker Post systems that
            need them (for example publishing a scheduled post or loading analytics). A background
            publisher may use the stored LinkedIn token for a post’s selected account so scheduled
            posts can go out without you being signed into the website at that moment.
          </p>
          <p className="mt-3">
            You can disconnect a LinkedIn account in Linker Post (Accounts). You can also revoke
            Linker Post’s access from LinkedIn’s own app or permission settings. After disconnect or
            revoke, we stop using that connection for new publishing. You remain responsible for
            content already published on LinkedIn.
          </p>
        </PolicySection>

        <PolicySection title="5. How your Linker Post profile is managed">
          <p>
            Your profile is the information tied to your Linker Post user account: name, email,
            optional profile fields, preferences, and security settings (such as password or Google
            sign-in). You can update many of these fields in Settings. Sign-in sessions use secure
            cookies. Logging out invalidates your current session token version.
          </p>
          <p className="mt-3">
            Profile data is used to identify you in the product, personalize workspace defaults, and
            associate content, LinkedIn connections, agent runs, and support tickets with your
            account.
          </p>
        </PolicySection>

        <PolicySection title="6. Analytics and cookies">
          <p>
            We use cookies and similar technologies for authentication, security (including CSRF
            protection), preferences (such as theme), and analytics. We use Google Analytics
            (gtag.js) to measure page views, sessions, and which product areas are used most. Google
            may process analytics data under its own terms and privacy policy.
          </p>
          <p className="mt-3">
            You can control cookies through your browser settings. Disabling certain cookies may
            prevent sign-in or other core features from working.
          </p>
        </PolicySection>

        <PolicySection title="7. Sharing of information">
          <p>We share information only as needed to run the Service, including with:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>LinkedIn, when you connect an account or we perform actions you request</li>
            <li>Google, when you use Google sign-in or Google Analytics</li>
            <li>AI model providers when you use AI features (prompts and related inputs you submit)</li>
            <li>Hosting and infrastructure providers that store or process data on our behalf</li>
            <li>Authorities when required by law or to protect rights, safety, or security</li>
          </ul>
          <p className="mt-3">
            Service providers are expected to process data only to provide services to us and to
            protect it appropriately.
          </p>
        </PolicySection>

        <PolicySection title="8. Retention">
          <p>
            We keep account, profile, LinkedIn connection metadata, posts, agent history, and
            support records for as long as your account is active and as needed to provide the
            Service, resolve disputes, enforce agreements, and meet legal requirements. Encrypted
            LinkedIn tokens are retained while the connection remains active and may be removed or
            invalidated when you disconnect or when tokens expire and cannot be refreshed.
          </p>
        </PolicySection>

        <PolicySection title="9. Security">
          <p>
            We use technical and organizational measures designed to protect your information,
            including encrypted LinkedIn tokens, hashed passwords, HTTPS in production, and access
            controls. No method of transmission or storage is completely secure, and we cannot
            guarantee absolute security.
          </p>
        </PolicySection>

        <PolicySection title="10. Your choices and account deletion">
          <p>You may:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Update profile and preference information in Settings</li>
            <li>Disconnect LinkedIn accounts in Accounts</li>
            <li>Revoke LinkedIn permissions in your LinkedIn settings</li>
            <li>Request access, correction, or export of personal information we hold</li>
            <li>Request deletion of your Linker Post account and associated personal data</li>
          </ul>
          <p className="mt-4">
            To delete your account, email us at{" "}
            <a className="text-primary hover:underline" href={supportMailto("Account deletion request")}>
              {SUPPORT_EMAIL}
            </a>{" "}
            from the email address on your account and include “Account deletion request” in the
            subject. We will verify the request and delete or anonymize personal data associated
            with your account except where we must retain limited information for legal, security,
            or fraud-prevention reasons. Content already published on LinkedIn remains under
            LinkedIn’s control and is not removed by deleting your Linker Post account unless you
            delete it on LinkedIn separately.
          </p>
        </PolicySection>

        <PolicySection title="11. Children’s privacy">
          <p>
            The Service is not directed to children under 16 (or the minimum age required in your
            jurisdiction). We do not knowingly collect personal information from children. If you
            believe a child has provided us information, contact us and we will take appropriate
            steps.
          </p>
        </PolicySection>

        <PolicySection title="12. International processing">
          <p>
            We may process and store information in countries where we or our providers operate.
            Those countries may have different data-protection laws than your own.
          </p>
        </PolicySection>

        <PolicySection title="13. Changes to this policy">
          <p>
            We may update this Privacy Policy from time to time. We will post the updated version
            on this page and revise the “Last updated” date. Continued use of the Service after
            changes means you accept the updated policy.
          </p>
        </PolicySection>

        <PolicySection title="14. Contact">
          <p>
            For privacy questions, data requests, or account deletion, contact us at{" "}
            <a className="text-primary hover:underline" href={supportMailto("Privacy request")}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Related:{" "}
            <Link to="/terms-of-service" className="text-primary hover:underline">
              Terms of Service
            </Link>
          </p>
        </PolicySection>
      </main>
    </div>
  );
}

function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-t pt-8">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <div className="space-y-3 leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}
