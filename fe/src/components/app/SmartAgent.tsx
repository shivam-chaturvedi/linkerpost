import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  HelpCircle,
  LayoutDashboard,
  Library as LibraryIcon,
  Linkedin,
  Maximize2,
  Minimize2,
  PenSquare,
  Send,
  Settings,
  User,
  X,
} from "lucide-react";
import { chatWithAssistant, type AssistantLink } from "@/lib/api";
import { HR_FEATURE_ENABLED } from "@/lib/features";

type MessageRole = "user" | "agent";

interface Message {
  id: number;
  role: MessageRole;
  text: string;
  timestamp: Date;
  actions?: { label: string; icon?: React.ComponentType<{ className?: string }>; to?: string }[];
  isLoading?: boolean;
}

const QUICK_PAGES = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/app/dashboard" },
  { label: "Accounts", icon: Linkedin, to: "/app/accounts" },
  { label: "Manage Posts", icon: PenSquare, to: "/app/manage-posts" },
  { label: "Calendar", icon: CalendarDays, to: "/app/calendar" },
  { label: "Agents", icon: Bot, to: "/app/agents" },
  { label: "Library", icon: LibraryIcon, to: "/app/library" },
  { label: "Settings", icon: Settings, to: "/app/settings" },
  { label: "Support", icon: HelpCircle, to: "/app/support" },
  ...(HR_FEATURE_ENABLED
    ? [{ label: "Recruiting", icon: User, to: "/app/recruiting" as const }]
    : []),
];

const WELCOME: Message = {
  id: 1,
  role: "agent",
  text: "Hi — I’m the Linker Post Assistant. Ask where to go, which agent to use, how to rewrite a post, or how anything in the app works.",
  timestamp: new Date(),
};

let msgIdCounter = 10;

function pathIcon(path: string) {
  const match = QUICK_PAGES.find((page) => page.to === path);
  return match?.icon ?? ArrowRight;
}

export function SmartAgent() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 120);
    }
  }, [open, messages]);

  const sendMessage = async (text?: string) => {
    const userText = (text ?? input).trim();
    if (!userText || sending) return;
    if (!text) setInput("");

    const userMsg: Message = {
      id: ++msgIdCounter,
      role: "user",
      text: userText,
      timestamp: new Date(),
    };
    const loadingId = ++msgIdCounter;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: loadingId, role: "agent", text: "", timestamp: new Date(), isLoading: true },
    ]);
    setSending(true);

    try {
      const history = [...messages, userMsg]
        .filter((msg) => !msg.isLoading && msg.id !== WELCOME.id)
        .slice(-8)
        .map((msg) => ({
          role: (msg.role === "user" ? "user" : "assistant") as "user" | "assistant",
          content: msg.text,
        }));
      const response = await chatWithAssistant({ message: userText, history });
      const links: AssistantLink[] = response.links ?? [];
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingId
            ? {
                ...msg,
                isLoading: false,
                text: response.reply,
                actions: links.map((link) => ({
                  label: link.label,
                  to: link.path,
                  icon: pathIcon(link.path),
                })),
              }
            : msg,
        ),
      );
    } catch (requestError) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingId
            ? {
                ...msg,
                isLoading: false,
                text:
                  requestError instanceof Error
                    ? requestError.message
                    : "Assistant is unavailable right now. Try again in a moment.",
              }
            : msg,
        ),
      );
    } finally {
      setSending(false);
    }
  };

  const panelW = expanded
    ? "w-[calc(100vw-32px)] sm:w-[480px]"
    : "w-[calc(100vw-32px)] sm:w-[370px]";
  const panelH = expanded
    ? "h-[calc(100vh-140px)] sm:h-[640px]"
    : "h-[calc(100vh-140px)] sm:h-[500px]";

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-12 right-8 z-[60] flex items-center justify-center rounded-2xl shadow-lg transition-all duration-300 group ${
          open
            ? "bg-[#213130] text-white"
            : "bg-[#0077B5] text-white hover:bg-[#00A0DC] hover:shadow-xl hover:scale-105"
        }`}
        style={{ height: 52, width: 52 }}
        title="Linker Post Assistant"
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-6 w-6" strokeWidth={1.7} />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[59]" onClick={() => setOpen(false)} />

          <div
            className={`fixed bottom-[80px] sm:bottom-[68px] right-4 sm:right-8 z-[60] ${panelW} ${panelH} flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition-all duration-200`}
          >
            <div className="flex items-center gap-3 border-b bg-[#0077B5] px-4 py-3.5 shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 shrink-0">
                <Bot className="h-5 w-5 text-white" strokeWidth={1.6} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white leading-none">
                  Linker Post Assistant
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-white/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" />
                  AI · Product help
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition"
                  title={expanded ? "Minimise" : "Expand"}
                >
                  {expanded ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#f8f8f2] dark:bg-[#1a1a1a]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      msg.role === "agent"
                        ? "bg-[#0077B5]"
                        : "bg-white dark:bg-[#2a2a2a] border border-border"
                    }`}
                  >
                    {msg.role === "agent" ? (
                      <Bot className="h-3.5 w-3.5 text-white" strokeWidth={1.6} />
                    ) : (
                      <User className="h-3.5 w-3.5 text-foreground" />
                    )}
                  </div>

                  <div
                    className={`flex flex-col gap-1.5 max-w-[82%] ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`px-3.5 py-2.5 text-sm leading-relaxed rounded-2xl ${
                        msg.role === "user"
                          ? "bg-[#0077B5] text-white rounded-tr-sm"
                          : "bg-white dark:bg-[#2a2a2a] border border-border/60 text-foreground rounded-tl-sm shadow-sm"
                      }`}
                    >
                      {msg.isLoading ? (
                        <div className="flex items-center gap-2 py-0.5">
                          <div className="flex gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                          </div>
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap">{msg.text}</span>
                      )}
                    </div>

                    {msg.actions && msg.actions.length > 0 && !msg.isLoading && (
                      <div className="flex flex-wrap gap-1.5 mt-0.5">
                        {msg.actions.map((action) => (
                          <Link
                            key={`${action.label}-${action.to}`}
                            to={action.to ?? "/app/dashboard"}
                            onClick={() => setOpen(false)}
                            className="inline-flex items-center gap-1.5 bg-white dark:bg-[#2a2a2a] border border-[#0077B5]/30 hover:border-[#0077B5] hover:bg-[#0077B5]/5 text-[#0077B5] px-3 py-1.5 text-[11px] font-medium rounded-full transition"
                          >
                            {action.icon ? <action.icon className="h-3 w-3" /> : null}
                            {action.label}
                            <ArrowRight className="h-2.5 w-2.5 opacity-60" />
                          </Link>
                        ))}
                      </div>
                    )}

                    <span className="text-[9px] text-muted-foreground/50 px-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {messages.length <= 2 && (
              <div className="border-t bg-white dark:bg-[#1e1e1e] px-4 py-3 shrink-0">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">
                  Quick actions
                </p>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                  {QUICK_PAGES.map((page) => (
                    <button
                      key={page.to}
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        void navigate({ to: page.to });
                      }}
                      className="flex items-center gap-2 rounded-xl border border-border bg-card hover:border-[#0077B5]/40 hover:bg-[#0077B5]/5 px-3 py-2 text-[11px] font-medium text-foreground/80 transition text-left"
                    >
                      <page.icon className="h-3.5 w-3.5 text-[#0077B5] shrink-0" />
                      <span className="truncate">{page.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t bg-white dark:bg-[#1e1e1e] px-3 py-3 shrink-0">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-[#f8f8f2] dark:bg-[#2a2a2a] px-3.5 py-2.5 focus-within:border-[#0077B5] transition">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder="Ask me anything…"
                  className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={!input.trim() || sending}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0077B5] hover:bg-[#00A0DC] disabled:opacity-40 disabled:cursor-not-allowed text-white transition shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1.5 text-center text-[9px] text-muted-foreground/40">
                Linker Post AI · Responses may not always be accurate
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
