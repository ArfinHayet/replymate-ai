import type { ReactNode } from "react";
import { ArrowRight, Send, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { shell } from "./landingContent";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#f8fbff] before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_70%_55%_at_15%_25%,rgba(37,99,235,0.16)_0%,transparent_55%),radial-gradient(ellipse_45%_40%_at_90%_10%,rgba(20,184,166,0.12)_0%,transparent_45%),radial-gradient(ellipse_50%_60%_at_55%_95%,rgba(37,99,235,0.10)_0%,transparent_50%)] after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(rgba(15,23,42,0.06)_1px,transparent_1px)] after:bg-[length:28px_28px]">
      <div className={cn(shell, "relative z-[1] grid grid-cols-2 items-center gap-[60px] px-7 py-[88px] pb-24 max-[900px]:grid-cols-1 max-[900px]:gap-12 max-[900px]:px-5 max-[900px]:py-16 max-[900px]:pb-[72px]")}>
        <div>
          <div className="mb-[22px] inline-flex items-center gap-1.5 rounded-full border border-[rgba(37,99,235,0.28)] bg-[var(--rm-trip-brand-light)] px-[13px] py-[5px] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--rm-trip-brand)]">
            <Sparkles size={12} />
            AI support assistant for your knowledge base
          </div>
          <h1 className="mb-[22px] font-[var(--rm-trip-font-heading)] text-[clamp(40px,5.2vw,62px)] font-extrabold leading-[1.06] text-[#0f172a]">
            A grounded AI assistant for your <span className="text-[#60a5fa]">support content</span>
          </h1>
          <p className="mb-9 max-w-[500px] text-[17px] leading-[1.7] text-[#64748b]">
            SupportMate answers from your approved documents and pages, powers your website widget, and gives your team
            full visibility with analytics and conversation history.
          </p>
          <div className="mb-11 flex flex-wrap gap-3">
            <a
              href="#cta"
              className="inline-flex items-center gap-2 rounded-[var(--rm-trip-smooth)] bg-[var(--rm-trip-brand)] px-6 py-[13px] text-[15px] font-semibold text-white no-underline shadow-[var(--rm-trip-glow-shadow)] transition hover:-translate-y-px hover:bg-[var(--rm-trip-brand-dark)] hover:shadow-[0_0_32px_rgba(37,99,235,0.22),var(--rm-trip-glow-shadow)]"
            >
              Get a workspace walkthrough <ArrowRight size={16} />
            </a>
            <a
              href="#screenshots"
              className="inline-flex items-center gap-2 rounded-[var(--rm-trip-smooth)] border border-[rgba(15,23,42,0.16)] bg-white px-[22px] py-[13px] text-[15px] font-medium text-[var(--rm-trip-text)] no-underline transition hover:border-[var(--rm-trip-brand-light)] hover:bg-[var(--rm-trip-surface)]"
            >
              See the dashboard
            </a>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              ["4", "content types supported"],
              ["1 script", "to embed your widget"],
              ["Live", "analytics and chat history"],
            ].map(([value, label]) => (
              <div key={value} className="rounded-[var(--rm-trip-smooth)] border border-[rgba(15,23,42,0.10)] bg-white px-4 py-3.5 shadow-[var(--rm-trip-card-shadow)]">
                <strong className="block font-[var(--rm-trip-font-heading)] text-xl font-bold text-[#0f172a]">{value}</strong>
                <span className="text-[11.5px] font-medium text-[#64748b]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-[calc(var(--rm-trip-smooth)+6px)] border border-[rgba(15,23,42,0.10)] bg-white shadow-[var(--rm-trip-lift-shadow)]">
            <div className="flex items-center gap-2.5 border-b border-[rgba(15,23,42,0.10)] px-4 py-3.5">
              <span className="h-[9px] w-[9px] rounded-full bg-[#22c55e] shadow-[0_0_0_3px_rgba(34,197,94,0.18),0_0_10px_rgba(34,197,94,0.35)] animate-pulse" />
              <div>
                <p className="text-[13.5px] font-semibold text-[#0f172a]">SupportMate Assistant</p>
                <p className="text-[11.5px] text-[#64748b]">Online now</p>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 bg-[var(--rm-trip-surface)] p-4">
              <ChatBubble>Hi, I can help using your uploaded docs and indexed website pages.</ChatBubble>
              <ChatBubble user>Can I add our help center and product PDFs?</ChatBubble>
              <ChatBubble>
                Yes. Add URLs, PDFs, markdown, and images in Add Content, then ask questions from Chat.
              </ChatBubble>
              <div className="max-w-[88%] rounded-[12px_12px_12px_4px] border border-[rgba(37,99,235,0.28)] bg-[var(--rm-trip-brand-light)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--rm-trip-brand)]">
                Indexed source match: 5 sections
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-[rgba(15,23,42,0.10)] px-4 py-3 text-[13px] text-[var(--rm-trip-text-muted)]">
              <span>Ask about your knowledge base...</span>
              <Send size={14} className="text-[var(--rm-trip-brand)]" />
            </div>
          </div>
          <div className="absolute left-[-18px] top-8 rounded-[var(--rm-trip-smooth)] border border-[rgba(15,23,42,0.10)] bg-white px-[13px] py-2 shadow-[var(--rm-trip-lift-shadow)]">
            <div className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-[#94a3b8]">
              <Zap size={11} className="text-[var(--rm-trip-brand)]" />
              Source status
            </div>
            <div className="text-[13px] font-bold text-[var(--rm-trip-brand)]">Grounded answer</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatBubble({ children, user = false }: { children: ReactNode; user?: boolean }) {
  return (
    <div
      className={cn(
        "max-w-[88%] px-3.5 py-2.5 text-[13.5px] leading-normal",
        user
          ? "self-end rounded-[12px_12px_4px_12px] bg-[var(--rm-trip-brand)] font-medium text-white"
          : "rounded-[12px_12px_12px_4px] border border-[rgba(15,23,42,0.10)] bg-white text-[var(--rm-trip-text)]",
      )}
    >
      {children}
    </div>
  );
}
