import { createFileRoute, Link } from "@tanstack/react-router";
import {
  MarketingSeoPage,
  SeoFaq,
  SeoSection,
  SeoSteps,
  TopicExamples,
} from "@/components/site/MarketingSeoPage";
import { absoluteUrl } from "@/lib/seo";

export const Route = createFileRoute("/linkedin-post-generator")({
  head: () => ({
    meta: [
      {
        title: "LinkedIn Post Generator with AI | Linker Post",
      },
      {
        name: "description",
        content:
          "Generate LinkedIn posts with AI. Choose a topic, research context, draft a post, rewrite it, and schedule it in Linker Post.",
      },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "LinkedIn Post Generator with AI | Linker Post" },
      {
        property: "og:description",
        content:
          "Create engaging LinkedIn posts from your topics and trending angles, then refine and schedule them.",
      },
      { property: "og:url", content: absoluteUrl("/linkedin-post-generator") },
      { property: "og:image", content: absoluteUrl("/og-image.png") },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/linkedin-post-generator") }],
  }),
  component: LinkedInPostGeneratorPage,
});

function LinkedInPostGeneratorPage() {
  return (
    <MarketingSeoPage
      eyebrow="Create"
      title="LinkedIn Post Generator"
      lead="Blank LinkedIn composers waste time. Linker Post helps you generate a solid first draft from a topic you care about, refine the wording, and move the post into your schedule when it is ready."
    >
      <SeoSection title="What this page is for">
        <p>
          A LinkedIn post generator should do more than spit out generic motivational lines. It
          should help you start from a real angle, shape a post that sounds like you, and leave you
          in control of the final publish. That is how generation works inside Linker Post: you pick
          the topic, the AI drafts, you edit, then you save a draft or schedule the post.
        </p>
        <p>
          This page is about generating posts. If you need a full week of planning, see the{" "}
          <Link to="/ai-linkedin-content-planner" className="text-primary hover:underline">
            AI LinkedIn content planner
          </Link>
          . If you need timing and automation, see the{" "}
          <Link to="/linkedin-post-scheduler" className="text-primary hover:underline">
            LinkedIn post scheduler
          </Link>
          .
        </p>
      </SeoSection>

      <SeoSection title="How the LinkedIn post generator works">
        <SeoSteps
          steps={[
            {
              title: "Choose your topic",
              body: "Start with a theme from your work, industry, or audience. You can also use a timely public conversation as fuel, then translate it into a point your network will care about.",
            },
            {
              title: "Research context",
              body: "When you use AI planning and research tools in Linker Post, the system can pull useful context so the draft is grounded, not empty filler.",
            },
            {
              title: "Generate the post",
              body: "Get a first draft with a clear hook, body, and close. The goal is a usable LinkedIn post you can edit quickly, not a finished speech you cannot touch.",
            },
            {
              title: "Rewrite and refine",
              body: "Use rewrite tools to tighten tone, shorten, or sharpen the CTA. You stay the editor. The AI is the assistant.",
            },
            {
              title: "Schedule or publish",
              body: "Move the post into Manage Posts, set a time, or publish now to a connected LinkedIn account.",
            },
          ]}
        />
      </SeoSection>

      <SeoSection title="Why use an AI LinkedIn post generator?">
        <p>
          Most people do not struggle because they have nothing to say. They struggle because they
          start from a blank box after a long day. Generation removes the cold start. You still
          decide what ships.
        </p>
        <p>
          Founders use it for build-in-public updates. Creators use it for hooks and story posts.
          Agencies use it to draft options for clients, then edit before approval. In every case the
          workflow is the same: idea, draft, human review, schedule.
        </p>
      </SeoSection>

      <SeoSection title="What makes Linker Post different?">
        <p>
          Linker Post is LinkedIn-first. Generation sits next to scheduling, calendar views, and
          account connections, so you are not copying text between three tools. Drafts live in your
          workspace. Connected accounts use OAuth. Scheduled publishing can run later using stored
          LinkedIn tokens for the account you selected.
        </p>
        <p>
          You can also keep generating inside a longer plan. One post is useful. A sequence of posts
          across a week is how consistency actually happens.
        </p>
      </SeoSection>

      <SeoSection title="What a strong generated draft includes">
        <p>
          A first line that earns the next scroll. A middle that teaches or shows proof. A close
          that invites a comment without begging for engagement. Optional hashtags only when they
          help discovery. Mentions only when they are relevant.
        </p>
        <p>
          If the draft is vague, give the generator more context: who you are, who you serve, what
          happened this week, what you want people to do next. Better inputs beat longer prompts
          that say “make it viral.”
        </p>
      </SeoSection>

      <SeoSection title="Generate posts from trending topics">
        <p>
          Trends are optional prompts, not requirements. If something in culture, sports, tech, or
          news is getting attention, you can ask for a LinkedIn angle that fits your brand instead
          of chasing every headline.
        </p>
        <TopicExamples
          label="Entertainment and culture examples:"
          topics={[
            "Dolly Parton",
            "Miley Cyrus",
            "Toxic movie review",
            "Witcher 3 Remastered",
            "Project Runway",
            "Only Murders in the Building",
            "Star Wars Zero Company",
            "The Walking Dead",
          ]}
        />
        <TopicExamples
          label="Sports examples:"
          topics={[
            "Dodgers vs Braves",
            "Astros vs Yankees",
            "Ja'Marr Chase",
            "Tiger Woods",
            "Roger Federer",
            "Kyrie Irving",
            "Christian McCaffrey",
            "US Open mixed doubles",
            "College Gameday",
          ]}
        />
        <p>
          The useful move is not “post about Dolly Parton because it is trending.” The useful move
          is “use a cultural moment to talk about storytelling, consistency, or audience empathy in
          your industry.” Generation helps with that translation.
        </p>
      </SeoSection>

      <SeoSection title="Create multiple posts, not just one">
        <p>
          After one strong draft, ask for variations: a shorter version, a story version, a
          founder lesson, a carousel outline. Or jump into the content planner and request 7, 14, or
          30 days of posts so generation becomes a calendar, not a one-off.
        </p>
        <p>
          Multi-account teams can generate once, then adapt tone per LinkedIn profile before
          scheduling. That keeps volume high without sounding copy-pasted.
        </p>
        <p>
          When a generated draft is close but not ready, switch to rewrite mode instead of starting
          over. Generation gets you moving. Editing gets you published.
        </p>
      </SeoSection>

      <SeoSection title="Related tools in Linker Post">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <Link to="/linkedin-ai-writer" className="text-primary hover:underline">
              LinkedIn AI writer
            </Link>{" "}
            for rewrite and polish
          </li>
          <li>
            <Link to="/linkedin-content-calendar" className="text-primary hover:underline">
              LinkedIn content calendar
            </Link>{" "}
            for visual planning
          </li>
          <li>
            <Link to="/multiple-linkedin-account-manager" className="text-primary hover:underline">
              Multiple LinkedIn account manager
            </Link>{" "}
            for workspace routing
          </li>
        </ul>
      </SeoSection>

      <SeoSection title="FAQ">
        <SeoFaq
          items={[
            {
              q: "Does the generator publish without my approval?",
              a: "No. You review drafts. Publishing or scheduling is a separate action you choose.",
            },
            {
              q: "Can I generate posts about news or sports without sounding spammy?",
              a: "Yes, if you connect the topic to your audience. Use trends as context, then write the lesson or insight your network actually needs.",
            },
            {
              q: "Do I need LinkedIn connected before generating?",
              a: "You can draft before connecting. You need a connected LinkedIn account to schedule or publish.",
            },
            {
              q: "Can agencies generate for several clients?",
              a: "You can keep multiple LinkedIn destinations in one workspace and generate or adapt drafts per account.",
            },
            {
              q: "Should every post mention a trending topic?",
              a: "No. Use trends when they help your audience. Evergreen lessons often outperform forced newsjacking.",
            },
            {
              q: "Can I generate image or carousel ideas too?",
              a: "Start with the text angle, then decide whether the post needs media. The composer supports multiple content types once you are ready to attach files.",
            },
          ]}
        />
      </SeoSection>
    </MarketingSeoPage>
  );
}
