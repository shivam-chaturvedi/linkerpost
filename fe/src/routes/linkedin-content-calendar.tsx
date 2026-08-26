import { createFileRoute, Link } from "@tanstack/react-router";
import {
  MarketingSeoPage,
  SeoFaq,
  SeoSection,
  SeoSteps,
  TopicExamples,
} from "@/components/site/MarketingSeoPage";
import { absoluteUrl } from "@/lib/seo";

export const Route = createFileRoute("/linkedin-content-calendar")({
  head: () => ({
    meta: [
      {
        title: "LinkedIn Content Calendar | Organize Your Queue | Linker Post",
      },
      {
        name: "description",
        content:
          "Organize LinkedIn posts on a visual calendar. See drafts and scheduled posts, reschedule times, and keep your publishing queue clear.",
      },
      { name: "robots", content: "index,follow" },
      {
        property: "og:title",
        content: "LinkedIn Content Calendar | Linker Post",
      },
      {
        property: "og:description",
        content:
          "Manage LinkedIn content in list, week, and month views. Spot gaps and move posts before they publish.",
      },
      { property: "og:url", content: absoluteUrl("/linkedin-content-calendar") },
      { property: "og:image", content: absoluteUrl("/og-image.png") },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/linkedin-content-calendar") }],
  }),
  component: LinkedInContentCalendarPage,
});

function LinkedInContentCalendarPage() {
  return (
    <MarketingSeoPage
      eyebrow="Organize"
      title="LinkedIn Content Calendar"
      lead="A calendar turns scattered drafts into a visible plan. In Linker Post you can see what is coming up, move posts to better times, and keep each LinkedIn account’s queue readable."
    >
      <SeoSection title="Why a LinkedIn calendar beats a notes app">
        <p>
          Notes hide gaps. A calendar shows them. If Thursday is empty, you notice. If two heavy
          posts land on the same morning, you notice. Linker Post’s calendar views exist so
          publishing feels like operations, not memory.
        </p>
        <p>
          This page is about organization. Generation lives on the{" "}
          <Link to="/linkedin-post-generator" className="text-primary hover:underline">
            post generator
          </Link>{" "}
          and{" "}
          <Link to="/ai-linkedin-content-planner" className="text-primary hover:underline">
            content planner
          </Link>
          . Automation of due posts lives on the{" "}
          <Link to="/linkedin-post-scheduler" className="text-primary hover:underline">
            scheduler
          </Link>
          .
        </p>
      </SeoSection>

      <SeoSection title="How to use the calendar in practice">
        <SeoSteps
          steps={[
            {
              title: "Fill the queue",
              body: "Create drafts, schedule posts, or import AI-planned posts into your workspace.",
            },
            {
              title: "Open calendar views",
              body: "Switch between list, week, and month styles depending on whether you are editing details or scanning the month.",
            },
            {
              title: "Balance the week",
              body: "Spread topics so you are not stacking five product posts or five news reactions in a row.",
            },
            {
              title: "Reschedule before publish",
              body: "Drag timing mentally and update scheduled times when meetings, launches, or news change your plan.",
            },
            {
              title: "Publish or let the scheduler run",
              body: "When the time hits, scheduled posts can publish through the selected LinkedIn account.",
            },
          ]}
        />
      </SeoSection>

      <SeoSection title="What a healthy LinkedIn calendar looks like">
        <p>
          Variety matters. Mix story posts, tactical tips, proof posts, and occasional commentary.
          Leave breathing room for replies. If you manage multiple accounts, filter by destination
          so client A and client B do not blur together.
        </p>
        <p>
          Timely posts can sit next to evergreen ones. The calendar is where you decide what lands
          when.
        </p>
        <TopicExamples
          label="Example timely slots people plan around:"
          topics={[
            "Lunar eclipse",
            "Blood moon partial lunar eclipse",
            "US Open",
            "NFL rivalry jerseys",
            "Gamecom opening night games",
            "National Dog Day conversations",
            "Onam wishes",
            "Eid Milad Un Nabi",
            "Raksha Bandhan",
          ]}
        />
        <TopicExamples
          label="Example evergreen pillars that fill quiet days:"
          topics={[
            "Founder lessons",
            "Customer stories",
            "Hiring notes",
            "Product updates",
            "Industry frameworks",
            "Team culture",
          ]}
        />
      </SeoSection>

      <SeoSection title="List, week, and month views">
        <p>
          List view is for details: titles, status, exact time, and which account owns the post.
          Week view is for balance: you can see whether Monday is overloaded and Friday is empty.
          Month view is for runway: campaign arcs, launch weeks, and quiet stretches.
        </p>
        <p>
          Most people bounce between week and list. Scan the week, open a post, fix the copy or
          time, then scan again. That loop is faster than hunting through chat threads or Google
          Docs for the latest draft.
        </p>
      </SeoSection>

      <SeoSection title="Calendars for founders, creators, and agencies">
        <p>
          Founders use the calendar to protect shipping weeks and still show up online. Creators use
          it to map series. Agencies use it as a shared source of truth for client publish times.
          Everyone gets the same benefit: fewer surprises.
        </p>
        <p>
          Pair the calendar with{" "}
          <Link to="/multiple-linkedin-account-manager" className="text-primary hover:underline">
            multi-account management
          </Link>{" "}
          when you run more than one LinkedIn presence. Filter by destination so client queues stay
          separate and you do not accidentally schedule a personal story onto a company profile.
        </p>
      </SeoSection>

      <SeoSection title="Common calendar mistakes to avoid">
        <p>
          Stacking every post at the same hour. Filling the week with only announcements. Leaving
          no space for replies after a strong post. Scheduling a timely take too late. Treating the
          calendar as a dumping ground for unfinished drafts that never get edited.
        </p>
        <p>
          A better habit: keep a small buffer of ready posts, leave open slots for reactions, and
          mark anything incomplete clearly until it is publishable. The calendar should reduce
          anxiety, not create a wall of half-ready items.
        </p>
      </SeoSection>

      <SeoSection title="From planner to calendar to live">
        <p>
          Use the{" "}
          <Link to="/ai-linkedin-content-planner" className="text-primary hover:underline">
            AI content planner
          </Link>{" "}
          to create a dated batch, the calendar to rearrange, and the{" "}
          <Link to="/linkedin-post-scheduler" className="text-primary hover:underline">
            scheduler
          </Link>{" "}
          to publish on time. If a draft still sounds stiff, polish it with the{" "}
          <Link to="/linkedin-ai-writer" className="text-primary hover:underline">
            AI writer
          </Link>{" "}
          before the slot arrives.
        </p>
      </SeoSection>

      <SeoSection title="A simple weekly calendar rhythm">
        <p>
          Sunday: scan next week and fill gaps. Monday to Thursday: publish and reply. Friday:
          review which posts earned conversation and note themes worth repeating. That rhythm is
          dull and effective. The calendar is the board that makes the rhythm visible.
        </p>
        <p>
          If you manage several LinkedIn accounts, run the same rhythm per destination or assign
          days to different brands so you are not context switching every hour.
        </p>
      </SeoSection>

      <SeoSection title="FAQ">
        <SeoFaq
          items={[
            {
              q: "Does the calendar include drafts?",
              a: "You can work with drafts and scheduled posts from your workspace. Use status filters to focus on what needs attention.",
            },
            {
              q: "Can I change a time after scheduling?",
              a: "Yes, before the post publishes. Update the scheduled time and keep the calendar clean.",
            },
            {
              q: "Is the calendar only for AI posts?",
              a: "No. Manual drafts and AI drafts both belong on the same calendar once scheduled.",
            },
            {
              q: "Can I see multiple LinkedIn accounts on one calendar?",
              a: "Yes. Posts carry their destination. Use account context so each profile’s queue stays readable.",
            },
            {
              q: "What if my week fills up with news topics?",
              a: "Swap or delete weak timely posts. Keep evergreen pillars ready so the calendar does not depend on headlines every day.",
            },
            {
              q: "How does this help a personal brand?",
              a: "Consistency compounds. A calendar is how you keep showing up with useful posts instead of random bursts.",
            },
          ]}
        />
      </SeoSection>
    </MarketingSeoPage>
  );
}
