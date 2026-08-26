import { Linkedin, Wand2 as Sparkles, CalendarDays, Bot, PenTool, Award } from "lucide-react";

export function AuthSidePanel() {
  return (
    <div className="relative hidden sm:flex h-full flex-col justify-between overflow-hidden bg-gradient-to-br from-sky-500 to-teal-600 p-12 text-white">
      <div className="absolute inset-0 bg-black/5" />
      <div className="relative flex items-center gap-2 text-xs font-semibold tracking-wider text-white/80 uppercase">
        <Award className="h-4 w-4" />
        <span>Built for LinkedIn-first creators</span>
      </div>

      <div className="relative mt-12 flex-1">
        <h2 className="font-display max-w-md text-[2.5rem] leading-[1.1] tracking-tight">
          The premium LinkedIn-first content control center.
        </h2>
        <p className="mt-4 max-w-md text-white/80">
          Connect every account, draft with agents, schedule a full calendar, without the bloat of a
          generic social suite.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            {
              icon: Linkedin,
              t: "Multi-account posting",
              d: "Profiles + company pages, role-aware.",
            },
            {
              icon: CalendarDays,
              t: "Calendar & queue",
              d: "Schedule, retry, reschedule with one click.",
            },
            { icon: Bot, t: "Agents with guardrails", d: "Draft-only, approval, or auto-publish." },
            { icon: PenTool, t: "Premium composer", d: "Text, image, video, document & article." },
          ].map((f) => (
            <div
              key={f.t}
              className="flex items-start gap-4 rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm"
            >
              <span className="inline-flex items-center justify-center text-white shrink-0 mt-0.5">
                <f.icon className="h-5 w-5" />
              </span>
              <div>
                <div className="font-display text-sm font-medium">{f.t}</div>
                <div className="mt-1 text-xs text-white/70">{f.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-12 rounded-2xl border border-white/20 bg-white/10 p-6 text-sm text-white/90 backdrop-blur-sm">
        <p>
          Linker Post is built to help professionals and teams grow their LinkedIn presence
          efficiently. Focus on creating great content while we handle the scheduling, queueing, and
          publishing.
        </p>
      </div>
    </div>
  );
}
