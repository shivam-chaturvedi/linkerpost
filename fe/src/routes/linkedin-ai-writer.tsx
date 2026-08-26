import { createFileRoute, Link } from "@tanstack/react-router";
import {
  MarketingSeoPage,
  SeoFaq,
  SeoSection,
  SeoSteps,
  TopicExamples,
} from "@/components/site/MarketingSeoPage";
import { absoluteUrl } from "@/lib/seo";

export const Route = createFileRoute("/linkedin-ai-writer")({
  head: () => ({
    meta: [
      {
        title: "LinkedIn AI Writer | Rewrite and Polish Posts | Linker Post",
      },
      {
        name: "description",
        content:
          "Write LinkedIn posts faster with AI. Draft, rewrite, tighten tone, and keep your voice before you schedule or publish in Linker Post.",
      },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "LinkedIn AI Writer | Linker Post" },
      {
        property: "og:description",
        content:
          "An AI writing assistant for LinkedIn drafts: clearer hooks, tighter stories, better CTAs, still edited by you.",
      },
      { property: "og:url", content: absoluteUrl("/linkedin-ai-writer") },
      { property: "og:image", content: absoluteUrl("/og-image.png") },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/linkedin-ai-writer") }],
  }),
  component: LinkedInAiWriterPage,
});

function LinkedInAiWriterPage() {
  return (
    <MarketingSeoPage
      eyebrow="Write"
      title="LinkedIn AI Writer"
      lead="Writing faster should not mean sounding fake. Linker Post’s AI writing tools help you draft and rewrite LinkedIn posts while you stay in charge of voice, facts, and final meaning."
    >
      <SeoSection title="AI writing for LinkedIn, not generic social copy">
        <p>
          LinkedIn rewards clarity and specificity. A good AI writer for LinkedIn should improve
          structure, cut fluff, and preserve your point of view. In Linker Post you can start from a
          rough note, generate a fuller draft, then rewrite until it feels ready.
        </p>
        <p>
          If you need many dated posts, use the{" "}
          <Link to="/ai-linkedin-content-planner" className="text-primary hover:underline">
            AI content planner
          </Link>
          . If you need a first draft from a topic, use the{" "}
          <Link to="/linkedin-post-generator" className="text-primary hover:underline">
            post generator
          </Link>
          . This page focuses on writing quality.
        </p>
      </SeoSection>

      <SeoSection title="A practical AI writing workflow">
        <SeoSteps
          steps={[
            {
              title: "Capture the raw idea",
              body: "Paste bullets, a voice note transcript, or a messy first draft into the composer.",
            },
            {
              title: "Ask AI to shape it",
              body: "Turn notes into a LinkedIn post with a hook, narrative flow, and ending that invites discussion.",
            },
            {
              title: "Rewrite for tone",
              body: "Make it shorter, sharper, more executive, more story-driven, or more tactical. Iterate without starting over.",
            },
            {
              title: "Fact-check yourself",
              body: "AI can invent confident nonsense. Verify names, numbers, and claims before anything public.",
            },
            {
              title: "Save, schedule, or publish",
              body: "Move the finished writing into your queue when it is ready.",
            },
          ]}
        />
      </SeoSection>

      <SeoSection title="What AI writing is good for">
        <p>
          Hooks. Transitions. Condensing a long story. Offering alternate openings. Translating a
          technical update into language non-experts understand. Summarizing a week of work into one
          post. Those are high-leverage assists.
        </p>
        <p>
          What it should not replace: your judgment, your lived examples, your opinions. The best
          LinkedIn posts still sound like a person who did the work.
        </p>
      </SeoSection>

      <SeoSection title="Writing about trends without losing credibility">
        <p>
          Trend-aware writing works when the trend is a doorway, not the whole house. You might
          reference a cultural or market moment, then land on a professional insight.
        </p>
        <TopicExamples
          label="Writer-friendly example prompts:"
          topics={[
            "Miley Cyrus and creative reinvention",
            "Tiger Woods and long-game consistency",
            "Meta stock and narrative vs fundamentals",
            "Roger Federer and graceful exits",
            "Humanoid robots and job design",
            "Solar flare and operational risk communication",
            "Ina Garten and simple excellence",
            "Busy Philipps and personal brand honesty",
          ]}
        />
        <p>
          Same idea for sports or entertainment weeks. Mention Dodgers vs Braves or Endgame Encore
          only if it helps your audience understand a point about competition, comebacks, or
          storytelling. Otherwise skip it.
        </p>
      </SeoSection>

      <SeoSection title="Rewrite patterns that actually help">
        <p>
          Shorten a long draft without losing the point. Swap a soft opening for a concrete hook.
          Turn a feature list into a story. Soften sales language. Add a clearer ask at the end.
          Those patterns are the daily work of a LinkedIn AI writer.
        </p>
        <p>
          A useful rewrite prompt names the audience and the outcome. Example: “Make this clearer
          for hiring managers, keep my examples, cut buzzwords.” Vague prompts like “make it
          better” waste a round. Specific prompts save time.
        </p>
      </SeoSection>

      <SeoSection title="Keep writing inside the product">
        <p>
          The value of an in-app AI writer is continuity. You rewrite, then schedule, then see the
          post on the{" "}
          <Link to="/linkedin-content-calendar" className="text-primary hover:underline">
            calendar
          </Link>
          , then publish through a connected account. No copy-paste scavenger hunt.
        </p>
        <p>
          Multi-account teams can rewrite once for a founder voice and again for a cleaner company
          update. Destination choice still happens at schedule time through{" "}
          <Link
            to="/multiple-linkedin-account-manager"
            className="text-primary hover:underline"
          >
            multi-account management
          </Link>
          .
        </p>
      </SeoSection>

      <SeoSection title="What good LinkedIn writing looks like">
        <p>
          A clear first line. Short paragraphs. One idea per post when possible. A specific example
          instead of abstract advice. A close that invites a reply, not a hard pitch every time.
          AI can help you reach that shape faster. It cannot invent your credibility for you.
        </p>
        <p>
          If you are starting from nothing, generate first, then write. If you already have a messy
          draft, write and rewrite here. Use the right tool for the stage you are in.
        </p>
      </SeoSection>

      <SeoSection title="Before and after thinking">
        <p>
          Before: a paragraph that starts with “I am excited to announce” and lists five features.
          After: a hook about the problem those features solve, one proof point, and a question for
          people who face the same issue. The AI writer can propose that structure. You still decide
          whether the proof point is true.
        </p>
        <p>
          Before: a trend dump about Meta stock or a big sports weekend. After: one sentence of
          context, then the operator lesson your audience can use on Monday. That is writing, not
          news aggregation.
        </p>
        <p>
          Before: a long essay pasted from a newsletter. After: a LinkedIn-native cut with a
          stronger open and a link or CTA only if it earns its place. Compression is a writing skill
          the assistant can accelerate.
        </p>
      </SeoSection>

      <SeoSection title="FAQ">
        <SeoFaq
          items={[
            {
              q: "Will AI replace my voice?",
              a: "Only if you let it. Treat outputs as drafts. Add your examples and delete anything that does not sound like you.",
            },
            {
              q: "Can I rewrite existing posts?",
              a: "Yes. Paste or open a draft and run rewrite flows to improve clarity or tone.",
            },
            {
              q: "Does Linker Post store my drafts?",
              a: "Drafts and posts live in your workspace so you can return, edit, and schedule them.",
            },
            {
              q: "How is this different from ChatGPT in a browser tab?",
              a: "The draft stays next to scheduling, calendar, and LinkedIn account selection, so writing is part of publishing, not a separate copy-paste step.",
            },
            {
              q: "Can I ask for a shorter and a longer version?",
              a: "Yes. Generate alternatives, keep the one that fits the slot, and schedule it.",
            },
            {
              q: "Is AI writing allowed on LinkedIn?",
              a: "You are responsible for content you publish. Be accurate, be respectful of platform rules, and disclose when required.",
            },
          ]}
        />
      </SeoSection>
    </MarketingSeoPage>
  );
}
