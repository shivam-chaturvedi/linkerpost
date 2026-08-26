import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircleHeart, Send, X } from "lucide-react";
import { createSupportTicket } from "@/lib/api";

const CATEGORIES = [
  "Creating and sharing content",
  "Channels and connections",
  "Account or billing",
  "Performance or reliability",
  "Other",
];

export function FeedbackWidget({ inline }: { inline?: boolean }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const canSubmit = Boolean(category && feedback.trim().length >= 8);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const sendFeedback = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await createSupportTicket({
        kind: "feedback",
        category,
        title: `Feedback: ${category}`.slice(0, 255),
        body: feedback.trim().slice(0, 4_000),
      });
      setSubmitted(true);
      setCategory("");
      setFeedback("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setSubmitted(false);
          setError("");
        }}
        aria-haspopup="dialog"
        className={`relative flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted ${inline ? "" : "fixed right-4 top-4 z-[60]"}`}
      >
        <MessageCircleHeart className="h-3.5 w-3.5 text-[#0077B5]" />
        <span>Feedback</span>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className={`fixed inset-0 z-[1000] grid place-items-center overflow-y-auto overscroll-contain bg-black/60 p-4 sm:p-6 ${
              document.querySelector(".dark") ? "dark" : ""
            }`}
            role="presentation"
            onMouseDown={() => setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="feedback-title"
              className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto border bg-card p-5 text-card-foreground shadow-2xl sm:p-6"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 id="feedback-title" className="font-display text-lg font-semibold">
                  Share feedback
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close feedback dialog"
                  className="p-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {submitted ? (
                <div className="mt-6 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Thanks — your feedback was saved. Our team can review it from support tickets.
                  </p>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="bg-[#0077B5] px-4 py-2 text-sm font-medium text-white"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Feedback is saved to your Linker Post account so the team can review it.
                  </p>

                  <label className="mt-5 block text-sm font-medium">
                    Category
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      className="mt-2 w-full border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select a category</option>
                      {CATEGORIES.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>

                  <label className="mt-4 block text-sm font-medium">
                    Feedback
                    <textarea
                      value={feedback}
                      onChange={(event) => setFeedback(event.target.value)}
                      maxLength={4_000}
                      rows={5}
                      className="mt-2 w-full resize-none border bg-background px-3 py-2 text-sm"
                    />
                  </label>

                  {error ? (
                    <p role="alert" className="mt-3 text-xs text-red-600">
                      {error}
                    </p>
                  ) : null}

                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="border px-4 py-2 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendFeedback()}
                      disabled={!canSubmit || submitting}
                      className="inline-flex items-center gap-2 bg-[#0077B5] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {submitting ? "Sending…" : "Send feedback"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
