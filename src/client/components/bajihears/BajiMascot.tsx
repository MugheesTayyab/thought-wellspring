import React, { useState, useEffect, useRef } from "react";
import { Sparkles, MessageCircle, X, Send, Bot } from "lucide-react";
import { triggerHaptic } from "@/client/lib/haptics";
import { cn } from "@/shared/utils";

type BajiTopic = "about" | "why" | "comfort" | "tea" | "default";

const BAJI_KNOWLEDGE: Record<BajiTopic, string> = {
  about:
    "Baji is that quiet elder sister who sits with you on the terrace at 2 AM with a cup of adrak chai. She hears everything you can't tell your family, your friends, or your notes app — without judgment.",
  why: "Because the heaviest things in life are often the ones left unsaid. Baji gives them a quiet wall to land on, where thousands can feel them without needing to know your name.",
  comfort:
    "Breathe, bachay. The chapter you're crying over right now won't even be mentioned in your favorite story a few years from today. Drink some water and be gentle with your heart.",
  tea: "Spilling tea isn't about drama here — it's about sharing the unspoken truths that make us human. What's sitting heavy on your mind today?",
  default:
    "Baji hears you, meri jaan. Sometimes just saying it out loud to the universe is half the healing. What else is on your mind?",
};

const DAILY_LIMIT = 3;
const QUESTIONS_KEY = "bh:bajiMascotQuestions";

export const BajiMascot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<
    { id: string; sender: "user" | "baji"; text: string; time: string }[]
  >([
    {
      id: "intro",
      sender: "baji",
      text: "Aao betho 🍵. Baji is here. What's on your heart today?",
      time: "Just now",
    },
  ]);
  const [questionsToday, setQuestionsToday] = useState(0);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(QUESTIONS_KEY);
      if (raw) {
        const data = JSON.parse(raw) as { count: number; date: string };
        const today = new Date().toISOString().split("T")[0];
        if (data.date === today) {
          setQuestionsToday(data.count);
        } else {
          localStorage.setItem(QUESTIONS_KEY, JSON.stringify({ count: 0, date: today }));
          setQuestionsToday(0);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping || questionsToday >= DAILY_LIMIT) return;

    triggerHaptic("selection");
    const userMsg = {
      id: `u-${Date.now()}`,
      sender: "user" as const,
      text: trimmed,
      time: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    const newCount = questionsToday + 1;
    setQuestionsToday(newCount);
    if (typeof window !== "undefined") {
      const today = new Date().toISOString().split("T")[0];
      localStorage.setItem(QUESTIONS_KEY, JSON.stringify({ count: newCount, date: today }));
    }

    // 3.5s smooth typing delay to replicate "Baji is typing..." per vision
    window.setTimeout(() => {
      let reply = BAJI_KNOWLEDGE["default"];
      const lower = trimmed.toLowerCase();
      if (lower.includes("who") || lower.includes("about") || lower.includes("baji")) {
        reply = BAJI_KNOWLEDGE["about"];
      } else if (lower.includes("why") || lower.includes("reason") || lower.includes("unsaid")) {
        reply = BAJI_KNOWLEDGE["why"];
      } else if (
        lower.includes("sad") ||
        lower.includes("hurt") ||
        lower.includes("comfort") ||
        lower.includes("help")
      ) {
        reply = BAJI_KNOWLEDGE["comfort"];
      } else if (lower.includes("tea") || lower.includes("spill")) {
        reply = BAJI_KNOWLEDGE["tea"];
      }

      setIsTyping(false);
      triggerHaptic("celebration");
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: "baji",
          text: reply,
          time: "Just now",
        },
      ]);
    }, 3500);
  };

  const remaining = DAILY_LIMIT - questionsToday;

  return (
    <>
      {/* Floating Baji Mascot Trigger */}
      <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-4 z-30">
        <button
          type="button"
          onClick={() => {
            triggerHaptic("impactLight");
            setIsOpen((v) => !v);
          }}
          aria-label="Ask Baji"
          className={cn(
            "spring-press group relative flex items-center gap-2 rounded-full border border-primary/40 bg-[#160d0d]/95 px-3 py-2 text-xs font-semibold text-white shadow-[0_4px_25px_rgba(250,84,28,0.3)] backdrop-blur-md transition-all hover:border-primary hover:shadow-[0_4px_30px_rgba(250,84,28,0.5)] cursor-pointer",
            isOpen && "ring-2 ring-primary/50",
          )}
        >
          <span className="relative flex size-6 items-center justify-center rounded-full bg-brand-gradient text-sm shadow-xs">
            🧕
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-400 ring-1 ring-[#160d0d] animate-pulse" />
          </span>
          <span className="hidden sm:inline font-vibe text-[11px] font-bold tracking-tight text-white/90 group-hover:text-primary transition-colors">
            Ask Baji
          </span>
          <Sparkles className="size-3 text-primary shrink-0" />
        </button>
      </div>

      {/* Interactive Baji Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4">
          <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

          <div className="relative z-10 flex h-[80vh] sm:h-[540px] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-primary/30 bg-[#140e0e]/98 shadow-[0_10px_45px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-[slideUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-brand-gradient text-lg shadow-[0_0_15px_rgba(250,84,28,0.35)]">
                  🧕
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Baji Hears</span>
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[9px] font-mono font-semibold text-primary">
                      AI Sister
                    </span>
                  </h3>
                  <p className="text-[11px] text-white/60 font-vibe">
                    {remaining > 0
                      ? `${remaining} questions left today`
                      : "Reached daily 3 questions"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-vibe text-xs">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex flex-col max-w-[82%]",
                    m.sender === "user" ? "ml-auto items-end" : "mr-auto items-start",
                  )}
                >
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2.5 leading-relaxed",
                      m.sender === "user"
                        ? "bg-primary text-primary-foreground font-medium rounded-br-xs shadow-xs"
                        : "border border-white/10 bg-white/[0.04] text-white/90 rounded-bl-xs shadow-soft",
                    )}
                  >
                    {m.text}
                  </div>
                  <span className="mt-1 text-[9px] text-white/40">{m.time}</span>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-3.5 py-2 text-primary font-medium w-fit animate-fade-in">
                  <Bot className="size-3.5 animate-spin" />
                  <span className="text-[11px]">Baji is typing... 🍵</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Suggestion Chips */}
            {messages.length <= 2 && !isTyping && remaining > 0 && (
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 py-2 border-t border-white/5">
                {[
                  "Who is Baji?",
                  "Why do we hide our thoughts?",
                  "Tell me something comforting",
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setInput(q);
                    }}
                    className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/70 hover:border-primary/40 hover:text-white transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="border-t border-white/10 bg-[#100b0b] p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  disabled={isTyping || remaining <= 0}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    remaining > 0
                      ? "Ask Baji anything..."
                      : "Daily question limit reached. Come back tomorrow 🌙"
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder:text-white/40 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50 font-vibe"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping || remaining <= 0}
                  className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-primary-foreground shadow-[0_0_12px_rgba(250,84,28,0.3)] transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  <Send className="size-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
