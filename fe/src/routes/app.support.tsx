import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  HelpCircle,
  Lightbulb,
  Search,
  ChevronRight,
  MessageCircle,
  Mail,
  ExternalLink,
  BookOpen,
  Video,
  Zap,
  Users,
  BarChart3,
  Calendar,
  X,
  Check,
  Send,
  ArrowLeft,
} from "lucide-react";
import { createSupportTicket } from "@/lib/api";
import { SUPPORT_EMAIL, supportMailto } from "@/lib/support";

export const Route = createFileRoute("/app/support")({
  component: () => <SupportPage />,
});

const FAQ_ITEMS = [
  {
    q: "How do I connect my LinkedIn account?",
    a: "Open Accounts, choose Connect LinkedIn, approve the requested permissions on LinkedIn, and you will return to Linker Post with the profile connected.",
  },
  {
    q: "Can I schedule posts in advance?",
    a: "Use Manage Posts or Calendar to draft and schedule. Connected LinkedIn accounts publish through the LinkedIn API.",
  },
  {
    q: "What happens if a scheduled post fails?",
    a: "Failed posts stay in Manage Posts with a failure reason. You can edit and retry publishing.",
  },
  {
    q: "How do I upgrade my plan?",
    a: "Open Settings → Billing when pricing is enabled for your workspace.",
  },
  {
    q: "Is there a free plan available?",
    a: "Plan options depend on your workspace configuration. Check Settings or the pricing page when billing is enabled.",
  },
  {
    q: "How do I use the AI agents?",
    a: "Open Agents, pick an agent such as AI Content Planner, configure it, and run it. Rewrite with AI is also available while editing posts.",
  },
];

const CATEGORIES = [
  { icon: Calendar, label: "Scheduling & Calendar", articles: 12 },
  { icon: Users, label: "Account Management", articles: 8 },
  { icon: BarChart3, label: "Analytics & Insights", articles: 6 },
  { icon: Zap, label: "AI Agents", articles: 5 },
  { icon: BookOpen, label: "Getting Started", articles: 10 },
  { icon: MessageCircle, label: "Billing & Plans", articles: 7 },
];

function SuggestFeatureModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("scheduling");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await createSupportTicket({
        kind: "feature",
        category,
        title: title.trim().slice(0, 255),
        body: description.trim().slice(0, 4_000),
      });
      setSubmitted(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to submit feature request",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-border rounded-none shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Lightbulb className="h-5 w-5 text-[#0077B5]" />
            <h2 className="text-base font-semibold">Suggest a Feature</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-none transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          <div className="px-6 py-12 flex flex-col items-center gap-4 text-center">
            <div className="h-14 w-14 rounded-full bg-[#0077B5]/10 flex items-center justify-center">
              <Check className="h-7 w-7 text-[#0077B5]" />
            </div>
            <div>
              <h3 className="text-base font-semibold mb-1">Feature request saved</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Thanks — your suggestion was stored so the team can review it.
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-2 bg-[#0077B5] hover:bg-[#00A0DC] text-white px-6 py-2 text-sm font-medium rounded-none transition"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)} className="px-6 py-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Have an idea that would make Linker Post better? We'd love to hear it. Share your
              suggestion and help shape the product roadmap.
            </p>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border bg-background text-foreground px-3 py-2 text-sm outline-none focus:border-[#0077B5] rounded-none border-border"
              >
                <option value="scheduling">Scheduling & Calendar</option>
                <option value="analytics">Analytics & Insights</option>
                <option value="ai">AI Agents</option>
                <option value="accounts">Account Management</option>
                <option value="billing">Billing & Plans</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Feature Title */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                Feature Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Bulk schedule posts from CSV"
                className="w-full border bg-background text-foreground px-3 py-2 text-sm outline-none focus:border-[#0077B5] rounded-none border-border placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the feature and how it would help you..."
                rows={4}
                className="w-full border bg-background text-foreground px-3 py-2 text-sm outline-none focus:border-[#0077B5] rounded-none border-border placeholder:text-muted-foreground/50 resize-none"
              />
            </div>

            {/* Actions */}
            {error ? (
              <p role="alert" className="text-xs text-red-600">
                {error}
              </p>
            ) : null}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-border bg-card hover:bg-muted text-foreground py-2 text-sm font-medium rounded-none transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim() || !description.trim() || submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-[#0077B5] hover:bg-[#00A0DC] disabled:opacity-40 disabled:cursor-not-allowed text-white py-2 text-sm font-medium rounded-none transition"
              >
                <Send className="h-3.5 w-3.5" />
                {submitting ? "Submitting…" : "Submit Suggestion"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function SupportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showSuggestModal, setShowSuggestModal] = useState(false);

  const filteredFaq = FAQ_ITEMS.filter(
    (item) =>
      !searchQuery ||
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {showSuggestModal && <SuggestFeatureModal onClose={() => setShowSuggestModal(false)} />}

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-[#0077B5] to-[#075E54] px-8 py-14 text-white text-center relative">
        <Link
          to="/app/dashboard"
          className="absolute left-6 top-6 inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to App
        </Link>
        <div className="max-w-2xl mx-auto space-y-4">
          <h1 className="font-display text-3xl font-bold">Help Center</h1>
          <p className="text-white/80 text-sm">
            Find answers, browse categories, or contact our support team.
          </p>
          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0077B5]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help articles…"
              className="w-full bg-white text-[#213130] pl-11 pr-4 py-3 text-sm outline-none rounded-none placeholder:text-[#86888A] shadow-lg"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-12">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setShowSuggestModal(true)}
            className="flex items-start gap-4 border bg-card hover:bg-muted/30 p-5 rounded-none transition text-left group"
          >
            <div className="h-10 w-10 bg-[#0077B5]/10 flex items-center justify-center rounded-none shrink-0 group-hover:bg-[#0077B5]/20 transition">
              <Lightbulb className="h-5 w-5 text-[#0077B5]" />
            </div>
            <div>
              <div className="text-sm font-semibold mb-0.5">Suggest a Feature</div>
              <div className="text-xs text-muted-foreground">
                Have an idea? Share it with our product team.
              </div>
            </div>
          </button>
          <a
            href={supportMailto()}
            className="flex items-start gap-4 border bg-card hover:bg-muted/30 p-5 rounded-none transition text-left group"
          >
            <div className="h-10 w-10 bg-[#128C7E]/10 flex items-center justify-center rounded-none shrink-0 group-hover:bg-[#128C7E]/20 transition">
              <Mail className="h-5 w-5 text-[#128C7E]" />
            </div>
            <div>
              <div className="text-sm font-semibold mb-0.5">Email Support</div>
              <div className="text-xs text-muted-foreground">
                {SUPPORT_EMAIL} · Usually responds in 24h
              </div>
            </div>
          </a>
          <div
            aria-disabled="true"
            className="flex items-start gap-4 border bg-card p-5 rounded-none text-left opacity-60"
          >
            <div className="h-10 w-10 bg-purple-500/10 flex items-center justify-center rounded-none shrink-0 group-hover:bg-purple-500/20 transition">
              <Video className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <div className="text-sm font-semibold mb-0.5">Video Tutorials (planned)</div>
              <div className="text-xs text-muted-foreground">
                Video guides are not published yet.
              </div>
            </div>
          </div>
          <div
            aria-disabled="true"
            className="flex items-start gap-4 border bg-card p-5 rounded-none text-left opacity-60"
          >
            <div className="h-10 w-10 bg-yellow-500/10 flex items-center justify-center rounded-none shrink-0 group-hover:bg-yellow-500/20 transition">
              <MessageCircle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm font-semibold mb-0.5">Community Forum (planned)</div>
              <div className="text-xs text-muted-foreground">
                The community forum is not available yet.
              </div>
            </div>
          </div>
        </div>

        {/* Browse Categories */}
        <div>
          <h2 className="text-base font-semibold mb-4">Browse by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                className="flex items-center gap-3 border bg-card hover:bg-muted/20 px-4 py-3.5 rounded-none transition text-left group"
              >
                <cat.icon className="h-4.5 w-4.5 text-[#0077B5] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{cat.label}</div>
                  <div className="text-[10px] text-muted-foreground">{cat.articles} articles</div>
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition" />
              </button>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-base font-semibold mb-4">
            Frequently Asked Questions
            {searchQuery && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({filteredFaq.length} result{filteredFaq.length !== 1 ? "s" : ""})
              </span>
            )}
          </h2>
          <div className="space-y-2">
            {filteredFaq.length === 0 ? (
              <div className="border bg-card px-5 py-8 text-center text-sm text-muted-foreground rounded-none">
                No articles found for "{searchQuery}". Try a different search term or{" "}
                <a href={supportMailto()} className="text-[#0077B5] underline">
                  contact support
                </a>
                .
              </div>
            ) : (
              filteredFaq.map((item, i) => (
                <div key={i} className="border bg-card rounded-none overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-muted/10 transition"
                  >
                    <span className="text-sm font-medium">{item.q}</span>
                    <ChevronRight
                      className={`h-4 w-4 text-muted-foreground shrink-0 ml-4 transition-transform ${
                        openFaq === i ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4 text-sm text-muted-foreground border-t leading-relaxed">
                      <p className="pt-3">{item.a}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Contact Footer */}
        <div className="border bg-gradient-to-r from-[#0077B5]/5 to-[#075E54]/5 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-none">
          <div>
            <div className="text-sm font-semibold mb-1">Still need help?</div>
            <div className="text-xs text-muted-foreground">
              Our support team is available Mon–Fri, 9am–6pm IST.
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSuggestModal(true)}
              className="flex items-center gap-2 border border-[#0077B5] text-[#0077B5] hover:bg-[#0077B5]/5 px-4 py-2 text-xs font-medium rounded-none transition"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              Suggest Feature
            </button>
            <a
              href={supportMailto()}
              className="flex items-center gap-2 bg-[#0077B5] hover:bg-[#00A0DC] text-white px-4 py-2 text-xs font-medium rounded-none transition"
            >
              <Mail className="h-3.5 w-3.5" />
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
