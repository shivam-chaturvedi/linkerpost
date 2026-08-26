import { createFileRoute, Link } from "@tanstack/react-router";
import {
  MarketingSeoPage,
  SeoFaq,
  SeoSection,
  SeoSteps,
  TopicExamples,
} from "@/components/site/MarketingSeoPage";
import { absoluteUrl } from "@/lib/seo";

export const Route = createFileRoute("/linkedin-post-scheduler")({
  head: () => ({
    meta: [
      {
        title: "LinkedIn Post Scheduler | Schedule and Auto-Publish | Linker Post",
      },
      {
        name: "description",
        content:
          "Schedule LinkedIn posts and publish automatically. Pick a time, choose an account, and let Linker Post handle due posts in the background.",
      },
      { name: "robots", content: "index,follow" },
      {
        property: "og:title",
        content: "LinkedIn Post Scheduler | Linker Post",
      },
      {
        property: "og:description",
        content:
          "Plan publish times, avoid last-minute posting, and run scheduled LinkedIn posts even when you are offline.",
      },
      { property: "og:url", content: absoluteUrl("/linkedin-post-scheduler") },
      { property: "og:image", content: absoluteUrl("/og-image.png") },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/linkedin-post-scheduler") }],
  }),
  component: LinkedInPostSchedulerPage,
});

function LinkedInPostSchedulerPage() {
  return (
    <MarketingSeoPage
      eyebrow="Schedule"
      title="LinkedIn Post Scheduler"
      lead="Consistency beats inspiration. Linker Post lets you schedule LinkedIn posts for a future time, then publishes them through the LinkedIn account you selected, even if you are not signed into the website at that moment."
    >
      <SeoSection title="Scheduling is the point of this page">
        <p>
          Writing is only half the job. If every post depends on you remembering to hit publish at
          9:12 AM, you will miss days. A LinkedIn post scheduler turns finished drafts into timed
          actions. That is the core workflow in Linker Post: draft or generate, choose an account,
          set a time, save as scheduled.
        </p>
        <p>
          For generating copy, use the{" "}
          <Link to="/linkedin-post-generator" className="text-primary hover:underline">
            LinkedIn post generator
          </Link>
          . For seeing the week visually, use the{" "}
          <Link to="/linkedin-content-calendar" className="text-primary hover:underline">
            LinkedIn content calendar
          </Link>
          .
        </p>
      </SeoSection>

      <SeoSection title="How scheduling works in Linker Post">
        <SeoSteps
          steps={[
            {
              title: "Write or import a draft",
              body: "Create the post in the composer, or bring over an AI draft you already refined.",
            },
            {
              title: "Select a LinkedIn account",
              body: "Choose which connected profile the post belongs to. Multi-account workspaces can route different posts to different destinations.",
            },
            {
              title: "Pick date and time",
              body: "Set when the post should go live. The time is stored with the post as scheduled.",
            },
            {
              title: "Background publish",
              body: "When the time arrives, Linker Post’s scheduler uses the stored LinkedIn token for that account and publishes. You do not need an open browser session.",
            },
            {
              title: "Review status",
              body: "Published posts show as published. Failures are marked with a reason so you can reconnect permissions or retry.",
            },
          ]}
        />
      </SeoSection>

      <SeoSection title="Why schedule instead of posting live every time?">
        <p>
          Live posting is fine when you are free. Most people are not free at their audience’s best
          hours. Scheduling protects mornings, evenings, and travel days. It also helps you batch:
          write on Sunday, schedule for the week, then focus on replies and DMs instead of
          production.
        </p>
        <p>
          Teams use scheduling as a soft approval line. A draft can sit until someone confirms the
          time. Agencies can queue client posts without handing over passwords. Linker Post never
          asks for LinkedIn passwords. Connections use OAuth, and tokens are encrypted.
        </p>
      </SeoSection>

      <SeoSection title="Scheduling around real-world moments">
        <p>
          Timely posts still need timing. If you are commenting on markets, sports, or culture, you
          may want the post to land while the conversation is warm, not three days later.
          Scheduling helps you prepare the draft early and release it when it makes sense.
        </p>
        <TopicExamples
          label="Tech and markets timing examples:"
          topics={[
            "Meta stock",
            "NVIDIA earnings",
            "Mac mini",
            "Xbox",
            "PlayStation physical media protest",
            "Bill Gates",
            "Humanoid robot services",
          ]}
        />
        <TopicExamples
          label="Sports and events timing examples:"
          topics={[
            "Phillies vs Mariners",
            "Pirates vs Padres",
            "Reds vs Giants",
            "Guardians vs Angels",
            "Vietnam vs Thailand",
            "EFL Cup",
            "Carabao Cup",
            "US Open tickets",
          ]}
        />
        <p>
          You still decide whether a topic belongs on your LinkedIn. Scheduling just makes sure a
          good draft does not die in Notes.
        </p>
      </SeoSection>

      <SeoSection title="Best times are audience times">
        <p>
          There is no universal perfect hour. Founders posting for other founders often do well
          midweek mornings. Creators with global audiences may need staggered slots. Agencies should
          ask clients when their buyers actually scroll. Scheduling exists so you can test windows
          without living in LinkedIn all day.
        </p>
        <p>
          Start with a few consistent slots for two weeks, then move posts that underperformed to
          different times. The calendar makes those experiments visible.
        </p>
      </SeoSection>

      <SeoSection title="Automation without losing control">
        <p>
          Auto-publish for due posts is intentional automation, not runaway posting. You choose the
          content and the clock. If LinkedIn permissions expire, publishing can fail safely and
          surface an error so you can reconnect. That is better than silent misfires.
        </p>
        <p>
          Combine scheduling with the{" "}
          <Link to="/ai-linkedin-content-planner" className="text-primary hover:underline">
            AI content planner
          </Link>{" "}
          when you want many dated posts at once, then adjust times on the calendar. If a draft
          still needs polish, run it through the{" "}
          <Link to="/linkedin-ai-writer" className="text-primary hover:underline">
            AI writer
          </Link>{" "}
          before the slot hits.
        </p>
      </SeoSection>

      <SeoSection title="Scheduling checklist">
        <ul className="list-disc space-y-2 pl-5">
          <li>Account selected and LinkedIn connection healthy</li>
          <li>Copy reviewed for accuracy and tone</li>
          <li>Media attached if the post needs it</li>
          <li>Time set in the timezone you intend</li>
          <li>No duplicate posts stacked on the same hour unless intentional</li>
        </ul>
        <p>
          That checklist sounds boring on purpose. Boring process is how consistent LinkedIn
          presence actually happens.
        </p>
        <p>
          If you are traveling or heads-down on product work, scheduling is what keeps the profile
          alive. Replies still need a human. Publishing does not have to wait for one.
        </p>
      </SeoSection>

      <SeoSection title="FAQ">
        <SeoFaq
          items={[
            {
              q: "Do I need to keep Linker Post open for scheduled posts to go out?",
              a: "No. Due posts are handled by the publishing scheduler using the LinkedIn account token stored for that post.",
            },
            {
              q: "Can I reschedule?",
              a: "Yes. Update the scheduled time from your posts or calendar views before it publishes.",
            },
            {
              q: "What if publishing fails?",
              a: "The post is marked failed with a reason, such as expired access. Reconnect LinkedIn and publish or reschedule.",
            },
            {
              q: "Can different posts go to different LinkedIn accounts?",
              a: "Yes. Each scheduled post can target a connected account in your workspace.",
            },
            {
              q: "Can I schedule media posts?",
              a: "Yes, when the composer supports that content type for the draft. Attach media before you schedule.",
            },
            {
              q: "Is scheduling the same as the content planner?",
              a: "No. The planner builds a multi-day set of drafts. The scheduler is the clock that publishes posts you have approved.",
            },
          ]}
        />
      </SeoSection>
    </MarketingSeoPage>
  );
}
