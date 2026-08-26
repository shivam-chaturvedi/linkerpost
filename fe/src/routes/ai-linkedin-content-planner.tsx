import { createFileRoute, Link } from "@tanstack/react-router";
import {
  MarketingSeoPage,
  SeoFaq,
  SeoSection,
  SeoSteps,
  TopicExamples,
} from "@/components/site/MarketingSeoPage";
import { absoluteUrl } from "@/lib/seo";

export const Route = createFileRoute("/ai-linkedin-content-planner")({
  head: () => ({
    meta: [
      {
        title: "AI LinkedIn Content Planner | 7, 14, 30 Day Plans | Linker Post",
      },
      {
        name: "description",
        content:
          "Plan 7, 14, or 30 days of LinkedIn content with AI. Research topics, draft posts, and build a dated plan you can schedule in Linker Post.",
      },
      { name: "robots", content: "index,follow" },
      {
        property: "og:title",
        content: "AI LinkedIn Content Planner | Linker Post",
      },
      {
        property: "og:description",
        content:
          "Use agentic AI and LangGraph-style planning to research, draft, and organize multi-day LinkedIn content.",
      },
      { property: "og:url", content: absoluteUrl("/ai-linkedin-content-planner") },
      { property: "og:image", content: absoluteUrl("/og-image.png") },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/ai-linkedin-content-planner") }],
  }),
  component: AiLinkedInContentPlannerPage,
});

function AiLinkedInContentPlannerPage() {
  return (
    <MarketingSeoPage
      eyebrow="Plan"
      title="AI LinkedIn Content Planner"
      lead="Stop asking what to post today. Ask Linker Post to build the next 7, 14, or 30 days of LinkedIn content around a theme, audience, and schedule you control."
    >
      <SeoSection title="Planning is different from one-off generation">
        <p>
          A single draft helps when you already know the topic. A content planner helps when you
          need a runway. Linker Post’s AI Content Planner is built for that: gather requirements,
          research sources, shape a strategy, draft posts, and attach future schedule slots you can
          send to your calendar.
        </p>
        <p>
          Under the hood it uses an agentic workflow (including LangGraph-style steps) so research,
          drafting, and scheduling support are not a single messy prompt. You still approve what
          becomes real posts in your workspace.
        </p>
      </SeoSection>

      <SeoSection title="How the AI content planner works">
        <SeoSteps
          steps={[
            {
              title: "Describe the brief",
              body: "Tell the agent who you are posting for, how many days you need, and what themes matter. You can answer follow-up questions when the brief is incomplete.",
            },
            {
              title: "Research and gather sources",
              body: "The planner can search and fetch useful context so posts are informed, not vague.",
            },
            {
              title: "Build a content strategy",
              body: "It groups ideas so the week has variety: lessons, stories, opinions, product notes, timely commentary.",
            },
            {
              title: "Generate dated posts",
              body: "You get draft posts with suggested times. Diversity settings help posts feel distinct rather than repetitive.",
            },
            {
              title: "Send to calendar",
              body: "Move accepted posts into Linker Post scheduling so they can publish through your connected LinkedIn accounts.",
            },
          ]}
        />
      </SeoSection>

      <SeoSection title="What you can plan for">
        <p>
          Founders plan launch weeks and build-in-public streaks. Creators plan series. Agencies plan
          client calendars in batches. Educators and operators plan teaching threads turned into
          posts. The planner adapts to the brief you give it.
        </p>
        <p>
          You can also plan around attention without turning into a news aggregator. Ask for
          LinkedIn angles on themes your audience already follows.
        </p>
        <TopicExamples
          label="Business and tech planning examples:"
          topics={[
            "Meta stock",
            "Boston Scientific",
            "Bill Gates",
            "Altruist",
            "Humanoid robots",
            "LEGO Skylines",
            "GTA 6 Netflix",
            "Social Security COLA conversations",
          ]}
        />
        <TopicExamples
          label="Culture and news planning examples:"
          topics={[
            "Dolly Parton",
            "Jelly Roll",
            "Nepal",
            "South Carolina Senate race",
            "Oklahoma election results",
            "Solar flare",
            "El Nino Southern Oscillation",
            "Excessive heat",
            "Hurricane Dolly conversations",
          ]}
        />
        <p>
          The planner should turn those into professional angles: leadership lessons, risk
          communication, product storytelling, operator notes. You keep the brand voice.
        </p>
      </SeoSection>

      <SeoSection title="What a strong brief includes">
        <p>
          Audience, goal, cadence, topics to emphasize, topics to avoid, and whether you want
          timely commentary or mostly evergreen posts. If you manage multiple LinkedIn destinations,
          say which plan belongs to which account. Vague briefs create vague calendars.
        </p>
        <p>
          You can also ask for a mix: two story posts, two tactical tips, one product update, and
          one opinion per week. The planner then fills dates instead of inventing a random pile of
          similar posts.
        </p>
      </SeoSection>

      <SeoSection title="Example planning scenarios">
        <p>
          A founder preparing a launch week asks for fourteen days: pre-launch lessons, launch day
          story, customer proof, hiring note, and follow-up FAQs. A creator building a newsletter
          asks for thirty days of hooks that point back to deeper essays. An agency briefing for a
          B2B client asks for twelve posts across three themes with no competitor bashing and no
          unverified market claims.
        </p>
        <p>
          Same tool, different briefs. The planner is useful when the output is a dated set you can
          edit, not when you want one clever line for tonight.
        </p>
        <p>
          Educators can plan a teaching series. Operators can plan incident-communication style
          posts that stay calm and factual. Recruiters can plan culture and role posts without
          turning every day into a job blast. The brief decides the shape.
        </p>
      </SeoSection>

      <SeoSection title="Why multi-day plans beat daily panic">
        <p>
          Daily panic creates uneven quality. A 14-day plan creates room to edit, batch media, and
          protect weekends. When something unexpected happens, you can swap one post without
          rebuilding everything.
        </p>
        <p>
          After planning, use the{" "}
          <Link to="/linkedin-content-calendar" className="text-primary hover:underline">
            content calendar
          </Link>{" "}
          to adjust dates and the{" "}
          <Link to="/linkedin-post-scheduler" className="text-primary hover:underline">
            post scheduler
          </Link>{" "}
          to lock publish times. Polish weak drafts with the{" "}
          <Link to="/linkedin-ai-writer" className="text-primary hover:underline">
            AI writer
          </Link>{" "}
          before they go live.
        </p>
      </SeoSection>

      <SeoSection title="How planning fits with generation and writing">
        <p>
          Think of the planner as the map. The{" "}
          <Link to="/linkedin-post-generator" className="text-primary hover:underline">
            post generator
          </Link>{" "}
          is useful when one slot needs a fresh idea. The writer is useful when a planned draft is
          close but not shippable. Keep those jobs separate and you waste less time rewriting the
          whole week every morning.
        </p>
        <p>
          A practical loop looks like this: plan fourteen days on Sunday, accept ten posts, rewrite
          three weak ones, schedule everything, then leave two open slots for real-time commentary.
          That mix keeps structure without making your feed feel robotic.
        </p>
      </SeoSection>

      <SeoSection title="Guardrails that matter">
        <p>
          AI plans are suggestions until you accept them. Linker Post stores runs in history and
          library flows so you can revisit outputs. Publishing still depends on LinkedIn permissions
          you granted. If you want safer defaults, keep humans in the loop before anything goes
          live.
        </p>
        <p>
          Treat research as a starting point. Verify claims, especially around elections, markets,
          health, or breaking news. Planning speed is useless if the posts are wrong.
        </p>
      </SeoSection>

      <SeoSection title="FAQ">
        <SeoFaq
          items={[
            {
              q: "Can I plan only a week?",
              a: "Yes. Ask for 7 days, 14 days, 30 days, or a custom duration that fits your cadence.",
            },
            {
              q: "Will every planned post publish automatically?",
              a: "Only after you schedule or publish them. Planning creates drafts and suggested times. You decide what enters the live queue.",
            },
            {
              q: "Can I mix evergreen posts with timely topics?",
              a: "Yes. A good brief includes both. Evergreen posts keep the calendar full. Timely posts keep it fresh.",
            },
            {
              q: "Is this the same as the rewrite tool?",
              a: "No. Rewrite polishes one draft. The planner builds a multi-post strategy. Use both.",
            },
            {
              q: "Can I regenerate part of a plan?",
              a: "Yes. Keep the posts you like, then ask for replacements for weak days or missing themes.",
            },
            {
              q: "Does the planner work for multiple LinkedIn accounts?",
              a: "Plan per destination when voices differ. Then assign each accepted draft to the right connected account before scheduling.",
            },
          ]}
        />
      </SeoSection>
    </MarketingSeoPage>
  );
}
