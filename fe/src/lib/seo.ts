/** Canonical public site origin for SEO (sitemap, canonical, Open Graph). */
export const SITE_URL = (
  (import.meta.env.VITE_SITE_URL as string | undefined)?.trim() || "https://linkerpost.vercel.app"
).replace(/\/$/, "");

export function absoluteUrl(path = "/"): string {
  if (!path || path === "/") return `${SITE_URL}/`;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function softwareApplicationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Linker Post",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description:
      "LinkedIn-first content tool to research trends, draft posts with AI, schedule publishing, and manage multiple LinkedIn accounts.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "LinkedIn multi-account management",
      "AI content planner with LangGraph",
      "Post scheduling and publishing",
      "Content calendar",
      "Rewrite with AI",
    ],
  };
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Linker Post",
    url: SITE_URL,
    logo: absoluteUrl("/logo.png"),
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Linker Post",
    url: SITE_URL,
    description:
      "Turn trending topics into LinkedIn posts. Research, create, schedule, and publish from one workspace.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/help`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function demoVideoJsonLd(videoUrl: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: "Linker Post product demo",
    description:
      "Watch how Linker Post uses agentic AI to research trends, draft LinkedIn posts, plan content, and schedule publishing across LinkedIn accounts.",
    thumbnailUrl: absoluteUrl("/og-image.png"),
    contentUrl: videoUrl,
    embedUrl: absoluteUrl("/"),
    uploadDate: "2026-08-26",
    publisher: {
      "@type": "Organization",
      name: "Linker Post",
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/logo.png"),
      },
    },
  };
}

export function faqJsonLd(
  items: Array<{ question: string; answer: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
