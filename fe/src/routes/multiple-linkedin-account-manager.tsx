import { createFileRoute, Link } from "@tanstack/react-router";
import {
  MarketingSeoPage,
  SeoFaq,
  SeoSection,
  SeoSteps,
  TopicExamples,
} from "@/components/site/MarketingSeoPage";
import { absoluteUrl } from "@/lib/seo";

export const Route = createFileRoute("/multiple-linkedin-account-manager")({
  head: () => ({
    meta: [
      {
        title: "Multiple LinkedIn Account Manager | One Workspace | Linker Post",
      },
      {
        name: "description",
        content:
          "Manage multiple LinkedIn accounts from one workspace. Connect profiles with OAuth, draft per destination, and schedule posts without tab switching.",
      },
      { name: "robots", content: "index,follow" },
      {
        property: "og:title",
        content: "Multiple LinkedIn Account Manager | Linker Post",
      },
      {
        property: "og:description",
        content:
          "Run personal brands, founder profiles, and client accounts in one LinkedIn-first workspace.",
      },
      { property: "og:url", content: absoluteUrl("/multiple-linkedin-account-manager") },
      { property: "og:image", content: absoluteUrl("/og-image.png") },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/multiple-linkedin-account-manager") }],
  }),
  component: MultipleLinkedInAccountManagerPage,
});

function MultipleLinkedInAccountManagerPage() {
  return (
    <MarketingSeoPage
      eyebrow="Accounts"
      title="Multiple LinkedIn Account Manager"
      lead="One browser tab per LinkedIn account does not scale. Linker Post lets you connect multiple LinkedIn profiles, keep drafts organized by destination, and schedule publishing from a single workspace."
    >
      <SeoSection title="Multi-account is an operations problem">
        <p>
          Agencies, founders with personal plus company presence, and creators who manage partners
          all hit the same wall: context switching. A multiple LinkedIn account manager should make
          destination selection boringly easy. That is the Accounts plus composer model in Linker
          Post.
        </p>
        <p>
          You connect LinkedIn through OAuth. Linker Post does not ask for LinkedIn passwords.
          Tokens are stored encrypted and used for publishing actions you request, including
          scheduled posts.
        </p>
      </SeoSection>

      <SeoSection title="How multi-account management works">
        <SeoSteps
          steps={[
            {
              title: "Connect each LinkedIn profile",
              body: "From Accounts, start OAuth, approve permissions, and land back in Linker Post with an active connection.",
            },
            {
              title: "Choose a destination per post",
              body: "When drafting or scheduling, pick which connected account the post belongs to.",
            },
            {
              title: "Keep strategies separate",
              body: "Personal brand posts, company updates, and client work can coexist without mixing queues blindly.",
            },
            {
              title: "Schedule independently",
              body: "Each post carries its own account and time. The scheduler publishes with that account’s token.",
            },
            {
              title: "Disconnect when needed",
              body: "Remove an account in the product or revoke access in LinkedIn when a client engagement ends.",
            },
          ]}
        />
      </SeoSection>

      <SeoSection title="Who this is for">
        <p>
          <strong>Founders</strong> who post as themselves and also support a company page workflow
          when permissions allow. <strong>Creators</strong> running more than one brand presence.{" "}
          <strong>Agencies and teams</strong> who need cleaner handoffs than shared logins.
        </p>
        <p>
          Pair accounts with the{" "}
          <Link to="/linkedin-content-calendar" className="text-primary hover:underline">
            content calendar
          </Link>{" "}
          so you can see which destination is light on posts next week.
        </p>
      </SeoSection>

      <SeoSection title="Different accounts, different content mixes">
        <p>
          A founder profile might lean into narrative and lessons. A product presence might lean
          into updates and proof. A client in sports media might want timely commentary. Multi-account
          management only works if you can assign the right draft to the right place.
        </p>
        <TopicExamples
          label="Example content lanes across accounts:"
          topics={[
            "Personal lessons after a launch week",
            "Product changelog posts",
            "Hiring and culture notes",
            "Industry takes on Meta stock or AI tools",
            "Event-week commentary around US Open or College Gameday",
            "Evergreen frameworks your audience saves",
          ]}
        />
        <p>
          You can still research broad trends once, then rewrite per account with the{" "}
          <Link to="/linkedin-ai-writer" className="text-primary hover:underline">
            AI writer
          </Link>{" "}
          so each destination keeps a distinct voice.
        </p>
      </SeoSection>

      <SeoSection title="Security and permissions basics">
        <p>
          Publishing needs the right LinkedIn permissions. If a connection is missing posting
          scopes, reconnect and grant them. If tokens expire, refresh or reconnect. Disconnecting an
          account stops new publishes through that destination. Content already on LinkedIn stays on
          LinkedIn unless you remove it there.
        </p>
        <p>
          Shared LinkedIn passwords are a bad habit. OAuth keeps credentials with LinkedIn and
          gives Linker Post only the access you approve. When a client engagement ends, disconnect
          that destination and clean up leftover scheduled posts for that account.
        </p>
      </SeoSection>

      <SeoSection title="Daily workflow with many accounts">
        <p>
          Morning: check which destinations have posts due today and which are empty later in the
          week. Midday: draft or generate for the lightest account. Afternoon: rewrite for voice,
          then schedule. End of week: scan the{" "}
          <Link to="/linkedin-content-calendar" className="text-primary hover:underline">
            calendar
          </Link>{" "}
          for collisions and gaps.
        </p>
        <p>
          Agencies often batch by client day. Founders often batch personal posts on one day and
          company updates on another. The manager does not force a style. It removes tab chaos so
          you can pick a style and stick to it.
        </p>
      </SeoSection>

      <SeoSection title="What not to do with multi-account posting">
        <p>
          Do not paste the same post to every profile without adaptation. Do not leave expired
          connections sitting in the workspace. Do not schedule client posts from memory without
          checking the calendar. Do not treat LinkedIn OAuth reconnect prompts as optional if
          publishing starts failing.
        </p>
        <p>
          Clean account hygiene is part of content quality. People notice when the wrong brand
          voice shows up on the wrong profile.
        </p>
        <p>
          Also avoid giving every teammate the same LinkedIn login. Connect accounts through OAuth
          in Linker Post, keep ownership clear, and disconnect destinations when a project ends.
        </p>
      </SeoSection>

      <SeoSection title="Related tools">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <Link to="/linkedin-post-generator" className="text-primary hover:underline">
              Post generator
            </Link>{" "}
            for first drafts per destination
          </li>
          <li>
            <Link to="/linkedin-post-scheduler" className="text-primary hover:underline">
              Post scheduler
            </Link>{" "}
            for timed publishing per account
          </li>
          <li>
            <Link to="/ai-linkedin-content-planner" className="text-primary hover:underline">
              AI content planner
            </Link>{" "}
            for multi-day plans you can split across profiles
          </li>
        </ul>
      </SeoSection>

      <SeoSection title="FAQ">
        <SeoFaq
          items={[
            {
              q: "Is there a limit to how many LinkedIn accounts I can connect?",
              a: "You can connect multiple accounts in the workspace. Practical limits depend on your plan and LinkedIn’s own rules.",
            },
            {
              q: "Can two people share one Linker Post login for many accounts?",
              a: "Use shared workspace practices carefully. Prefer clear ownership and avoid sharing LinkedIn passwords. OAuth connections belong to the authorizing user flow.",
            },
            {
              q: "What happens if one account fails to publish?",
              a: "That post fails independently. Other scheduled posts for other accounts are not automatically canceled.",
            },
            {
              q: "Can I draft without picking an account yet?",
              a: "You can draft early, then assign a destination before scheduling or publishing.",
            },
            {
              q: "Do I need a separate tool for AI drafting?",
              a: "No. Generator, writer, planner, calendar, and scheduling all live in Linker Post next to your connected accounts.",
            },
          ]}
        />
      </SeoSection>
    </MarketingSeoPage>
  );
}
