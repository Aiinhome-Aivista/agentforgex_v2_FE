import { useState, useRef, useEffect } from "react";
import { Bot, User, Send, X, ArrowRight, Sparkles } from "lucide-react";
import clsx from "clsx";

const AGENT_QUESTIONS = [
  "I've completed the initial scan of your process. To sharpen the recommendations — what is the single biggest operational pain point your team faces today?",
  "Got it. Roughly how many people are involved in running this process on a typical day?",
  "Understood. Are there any specific systems or tools you'd like the agentic workflow to integrate with — or explicitly avoid?",
  "Thanks. What's your target timeline for piloting an automated version of this process?",
  "Perfect — I've folded all of this into the analysis. Ready to view the full agentic blueprint?",
];

export default function ProcessChatbot({ processTitle, onSkip, onProceed }) {
  const [messages, setMessages] = useState([
    { role: "agent", text: AGENT_QUESTIONS[0] },
  ]);
  const [draft, setDraft] = useState("");
  const [qIndex, setQIndex] = useState(0);
  const [agentTyping, setAgentTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, agentTyping]);

  const isFinalStep = qIndex >= AGENT_QUESTIONS.length - 1;

  const handleContinue = () => {
    if (isFinalStep) {
      onProceed();
      return;
    }
    const text = draft.trim();
    if (!text) return;

    // 1. Push user message
    setMessages((m) => [...m, { role: "user", text }]);
    setDraft("");

    // 2. Show typing indicator, then push next agent question
    setAgentTyping(true);
    const nextIdx = qIndex + 1;
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        { role: "agent", text: AGENT_QUESTIONS[nextIdx] },
      ]);
      setQIndex(nextIdx);
      setAgentTyping(false);
    }, 900);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleContinue();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 mb-12">
      <div className="bg-[#0d0d0d]/90 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-[0_20px_60px_-15px_rgba(16,185,129,0.15)] overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-500">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-gradient-to-r from-brand-500/10 via-transparent to-blue-500/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center">
                <Bot size={16} className="text-brand-300" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-brand-400 border-2 border-[#0d0d0d] animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold text-white flex items-center gap-1.5">
                AgentForgeX Assistant
                <Sparkles size={12} className="text-brand-400" />
              </p>
              <p className="text-[11px] text-white/50">
                {processTitle
                  ? `Refining: ${processTitle}`
                  : "Refining your process analysis"}
              </p>
            </div>
          </div>
          <button
            onClick={onSkip}
            title="Close and go to analysis"
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="px-5 py-4 max-h-[280px] overflow-y-auto space-y-3"
        >
          {messages.map((m, i) => (
            <Message key={i} role={m.role} text={m.text} />
          ))}
          {agentTyping && <TypingBubble />}
        </div>

        {/* Composer */}
        <div className="px-5 py-3 border-t border-white/10 bg-black/30">
          {!isFinalStep ? (
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer…  (Enter to send)"
                rows={1}
                className="flex-1 resize-none bg-white/5 border border-white/10 focus:border-brand-500/60 focus:bg-white/[0.07] rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors"
              />
            </div>
          ) : (
            <p className="text-xs text-white/50 italic">
              All set. You can view the full agentic blueprint now.
            </p>
          )}

          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              onClick={onSkip}
              className="px-4 py-2 text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              Skip → Go to Analysis
            </button>

            <button
              onClick={handleContinue}
              disabled={!isFinalStep && draft.trim().length === 0}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                "bg-brand-500 text-black hover:bg-brand-400 shadow-md shadow-brand-500/20",
              )}
            >
              {isFinalStep ? (
                <>
                  View Analysis
                  <ArrowRight size={14} />
                </>
              ) : (
                <>
                  Continue
                  <Send size={12} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Message({ role, text }) {
  const isAgent = role === "agent";
  return (
    <div
      className={clsx(
        "flex gap-2.5",
        isAgent ? "justify-start" : "justify-end",
      )}
    >
      {isAgent && (
        <div className="w-7 h-7 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0">
          <Bot size={13} className="text-brand-300" />
        </div>
      )}
      <div
        className={clsx(
          "max-w-[78%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed",
          isAgent
            ? "bg-white/[0.06] border border-white/10 text-white/85 rounded-tl-sm"
            : "bg-brand-500 text-black font-medium rounded-tr-sm",
        )}
      >
        {text}
      </div>
      {!isAgent && (
        <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
          <User size={13} className="text-white/70" />
        </div>
      )}
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex gap-2.5 justify-start">
      <div className="w-7 h-7 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0">
        <Bot size={13} className="text-brand-300" />
      </div>
      <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-white/[0.06] border border-white/10">
        <div className="flex gap-1">
          <span
            className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce"
            style={{ animationDelay: "120ms" }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce"
            style={{ animationDelay: "240ms" }}
          />
        </div>
      </div>
    </div>
  );
}
