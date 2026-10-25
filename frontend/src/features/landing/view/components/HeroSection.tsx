import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { shell } from "./landingContent";

export function HeroSection() {
  return (
    <section className="landing-hero relative overflow-hidden border-b border-gray-200">
      <div className={cn(shell, "relative z-[1] grid grid-cols-[1.05fr_0.95fr] items-center gap-14 px-7 py-20 max-[900px]:grid-cols-1 max-[900px]:gap-12 max-[900px]:px-5 max-[900px]:py-14")}>
        <div className="min-w-0">
          <h1 className="mb-6 max-w-[680px] font-[family-name:var(--font-display)] text-[clamp(2rem,4.4vw,3.5rem)] font-extrabold leading-[1.08] tracking-[-0.045em] text-rm-trip-text max-[900px]:text-[clamp(1.75rem,5.8vw,3.5rem)]">
            <span className="block">AI-Powered Support.</span>{" "}
            <em className="block font-[family-name:var(--font-editorial)] font-normal tracking-[-0.035em] text-rm-trip-brand">
              <span className="block">Smarter Responses.</span>{" "}
              <span className="block">Happier Customers.</span>
            </em>
          </h1>
          <p className="mb-8 max-w-[540px] text-base leading-7 text-rm-trip-text-muted sm:text-lg">
            SupportMate answers from your approved documents, powers your website widget, and gives your team
            visibility with analytics and conversation history.
          </p>
          <div className="mb-9 flex flex-wrap gap-3">
            <a
              href="#screenshots"
              className="inline-flex min-h-11 items-center gap-2 border border-rm-trip-brand bg-rm-trip-brand px-5 py-3 text-sm font-semibold text-rm-trip-on-brand no-underline shadow-rm-trip-card transition-colors hover:bg-rm-trip-brand-dark"
            >
              Get a workspace walkthrough <ArrowRight size={16} />
            </a>
          </div>
          <div className="grid max-w-[600px] grid-cols-3 border-2 border-gray-300 bg-rm-trip-surface-card shadow-2xl">
            {[
              ["3", "content types"],
              ["1 script", "to embed your widget"],
              ["Live", "analytics and chat history"],
            ].map(([value, label], index) => (
              <div
                key={value}
                className={cn(
                  "min-w-0 px-3 py-4 sm:px-4",
                  index > 0 && "border-l border-gray-300",
                )}
              >
                <strong className="block font-mono text-xl font-bold text-rm-trip-brand">
                  {value}
                </strong>
                <span className="mt-2 block font-mono text-[10px] font-semibold uppercase leading-4 tracking-[0.04em] text-rm-trip-text-muted">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto flex min-w-0 w-full max-w-[560px] items-center justify-center">
          <img
            src="/landing/hero-chatbot.gif"
            alt="Animated SupportMate AI chatbot showing suggested questions and a message input"
            width={435}
            height={634}
            loading="eager"
            decoding="async"
            className="block h-auto w-auto max-h-[600px] max-w-full"
          />
        </div>
      </div>
    </section>
  );
}
