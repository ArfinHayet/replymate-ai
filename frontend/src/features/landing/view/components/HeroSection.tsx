import { ArrowRight, Send, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { shell } from "./landingContent";

export function HeroSection() {
  return (
    <section className="landing-hero relative overflow-hidden border-b border-gray-200">
      <div className={cn(shell, "relative z-[1] grid grid-cols-[1.05fr_0.95fr] items-center gap-14 px-7 py-20 max-[900px]:grid-cols-1 max-[900px]:gap-12 max-[900px]:px-5 max-[900px]:py-14")}>
        <div>
          <div className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-rm-trip-brand">
            <Sparkles size={13} />
            SupportMate / Knowledge support system
          </div>
          <h1 className="mb-6 max-w-[680px] font-[var(--font-display)] text-[clamp(3.5rem,7.6vw,6rem)] font-extrabold leading-[0.94] tracking-[-0.065em] text-rm-trip-text">
            Knowledge in.
            <br />
            <em className="font-[var(--font-editorial)] font-normal tracking-[-0.055em] text-rm-trip-brand">
              Answers out.
            </em>
          </h1>
          <p className="mb-8 max-w-[540px] text-base leading-7 text-rm-trip-text-muted sm:text-lg">
            SupportMate answers from your approved documents and pages, powers your website widget, and gives your team
            visibility with analytics and conversation history.
          </p>
          <div className="mb-9 flex flex-wrap gap-3">
            <a
              href="#cta"
              className="inline-flex min-h-11 items-center gap-2 border border-rm-trip-brand bg-rm-trip-brand px-5 py-3 text-sm font-semibold text-rm-trip-on-brand no-underline shadow-rm-trip-card transition-colors hover:bg-rm-trip-brand-dark"
            >
              Get a workspace walkthrough <ArrowRight size={16} />
            </a>
            <a
              href="#screenshots"
              className="inline-flex min-h-11 items-center gap-2 border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-rm-trip-text no-underline transition-colors hover:border-rm-trip-brand hover:text-rm-trip-brand"
            >
              See the workspace
            </a>
          </div>
          <div className="grid max-w-[600px] grid-cols-3 border-y border-gray-200 bg-rm-trip-surface-card/70">
            {[
              ["4", "content types"],
              ["1 script", "to embed your widget"],
              ["Live", "analytics and chat history"],
            ].map(([value, label], index) => (
              <div
                key={value}
                className={cn("px-4 py-4", index > 0 && "border-l border-gray-200")}
              >
                <strong className="block font-[var(--font-display)] text-xl font-bold text-rm-trip-text">{value}</strong>
                <span className="mt-1 block text-[11px] font-medium leading-4 text-rm-trip-text-muted">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[560px] px-2 py-5">
          <div className="tape-mark absolute -left-3 top-2 z-10 rotate-[-4deg] px-3 py-1.5 text-[10px] font-bold">
            Approved sources
          </div>
          <div className="theme-terminal">
            <div className="theme-terminal-titlebar flex items-center justify-between gap-3 px-4 py-3">
              <span className="font-mono text-xs font-bold tracking-[0.1em]">SUPPORTMATE / ANSWER TERMINAL</span>
              <span className="theme-terminal-meta text-[10px]">PREVIEW 01</span>
            </div>
            <div className="p-5 sm:p-7">
              <p className="theme-terminal-meta flex items-center gap-2 text-[11px]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Static example / grounded in your knowledge
              </p>
              <div className="mt-7 space-y-5">
                <div>
                  <p className="theme-terminal-meta mb-2 text-[10px]">Visitor asks</p>
                  <div className="border border-[rgb(var(--color-terminal-border))] bg-[rgb(var(--color-terminal-text))] px-3.5 py-3 text-sm leading-6 text-rm-trip-text">
                    Can I add our help center and product PDFs?
                  </div>
                </div>
                <div>
                  <p className="theme-terminal-meta mb-2 text-[10px]">SupportMate answers</p>
                  <p className="max-w-[440px] text-sm leading-6 text-[rgb(var(--color-terminal-text))]">
                    Yes. Add website URLs, PDFs, markdown files, and images. Your assistant answers using that approved content.
                  </p>
                </div>
                <div className="border-l-2 border-rm-trip-brand-light pl-3.5">
                  <p className="theme-terminal-meta mb-1 text-[10px]">Source / Content pipeline</p>
                  <p className="flex items-center gap-2 text-xs font-semibold text-[rgb(var(--color-terminal-accent))]">
                    <Zap size={13} /> Answer linked to approved sources
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-[rgb(var(--color-terminal-border))] px-4 py-3">
              <span className="font-mono text-[10px] tracking-wide text-[rgb(var(--color-terminal-muted))]">
                ILLUSTRATIVE EXAMPLE — NO LIVE REQUEST
              </span>
              <Send size={14} className="text-[rgb(var(--color-terminal-accent))]" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
      <div className={cn(shell, "relative z-[1] flex items-center justify-between gap-4 border-t border-gray-300 px-7 py-4 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-rm-trip-text-muted max-[700px]:flex-wrap max-[700px]:px-5")}>
        <span>01 / Support grounded in your business knowledge</span>
        <span>PDFs · Markdown · Web pages · Images</span>
      </div>
    </section>
  );
}
