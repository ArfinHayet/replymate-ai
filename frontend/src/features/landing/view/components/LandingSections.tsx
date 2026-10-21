import type { ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Bot,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  Funnel,
  GitBranch,
  Languages,
  Lock,
  MessageCircle,
  ShieldCheck,
  WandSparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import {
  DASHBOARD_PATH,
  type ContactFormProps,
  card,
  eyebrow,
  faqs,
  hoverCard,
  logoClasses,
  logoMarkClasses,
  logoNameClasses,
  section,
  sectionSub,
  sectionTitle,
  sectionWhite,
  shell,
  workflowSteps,
} from "./landingContent";

export function MetricsStrip() {
  return (
    <div className="border-b border-[rgb(var(--color-border))] bg-white">
      <div className={cn(shell, "grid grid-cols-3 gap-px bg-[rgb(var(--color-border))] max-[700px]:grid-cols-2")}>
        {[
          ["PDF + Markdown", "document ingestion"],
          ["Widget Keys", "embed and domain control"],
          ["Analytics", "sessions, sources, sections"],
        ].map(([value, label]) => (
          <div key={value} className="bg-white px-7 py-[22px] text-center">
            <strong className="block font-[var(--rm-trip-font-heading)] text-[26px] font-extrabold text-rm-trip-text">{value}</strong>
            <span className="mt-0.5 block text-xs font-medium text-[var(--rm-trip-text-muted)]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function IntegrationsBar() {
  return (
    <div className={cn(shell, "flex flex-wrap items-center gap-3.5 px-7 py-7")}>
      <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.12em] text-rm-trip-text-muted">Built for</span>
      {["PDFs", "Markdown", "Images", "Website Widget"].map((name) => (
        <span
          key={name}
          className="cursor-default rounded-full border border-[rgb(var(--color-border-strong))] bg-white px-[15px] py-1.5 text-[13px] font-semibold text-[var(--rm-trip-text-muted)] transition hover:border-rm-trip-brand hover:bg-[var(--rm-trip-brand-light)] hover:text-[var(--rm-trip-brand)]"
        >
          {name}
        </span>
      ))}
    </div>
  );
}

export function ScreenshotsSection() {
  const rows = workflowSteps;

  return (
    <section id="screenshots">
      <div className={section}>
        <p className={eyebrow}>Screenshots</p>
        <h2 className={sectionTitle}>Your support chatbot in three simple steps</h2>
        <p className={sectionSub}>
          Upload your content, copy the embed script into your website, and start helping visitors with your own support
          chatbot.
        </p>
        <div className="mt-9 rounded-rm-trip-smooth border border-[rgb(var(--color-border))] bg-rm-trip-surface-card p-[18px] max-[900px]:p-3">
          <div className="flex flex-col gap-5">
            {rows.map((row, index) => (
              <article key={row.title} className="grid grid-cols-[minmax(290px,0.95fr)_minmax(0,1.25fr)] items-stretch gap-5 max-[900px]:grid-cols-1">
                <div className="relative flex flex-col justify-center overflow-hidden rounded-rm-trip-smooth border border-[rgb(var(--color-border))] bg-rm-trip-surface-card px-7 py-[26px] shadow-[var(--rm-trip-card-shadow)] before:absolute before:left-0 before:top-0 before:h-1 before:w-[86px] before:bg-rm-trip-brand max-[900px]:p-5">
                  <span className="mb-2.5 inline-flex w-fit items-center gap-2 rounded-full border border-rm-trip-brand/30 bg-rm-trip-brand-light py-1 pl-1 pr-1.5 text-[11px] font-bold uppercase tracking-[0.09em] text-rm-trip-brand-dark">
                    <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-rm-trip-brand text-[10px] text-rm-trip-on-brand">
                      0{index + 1}
                    </span>
                    {row.label}
                  </span>
                  <h3 className="mb-2 font-[var(--rm-trip-font-heading)] text-[clamp(22px,2.3vw,30px)] font-bold leading-[1.15] text-rm-trip-text">
                    {row.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--rm-trip-text-muted)]">{row.desc}</p>
                  <p className="mt-3 text-xs font-semibold leading-normal text-rm-trip-text-muted">{row.note}</p>
                </div>
                <figure className="flex items-center justify-center overflow-hidden rounded-rm-trip-smooth border border-[rgb(var(--color-border))] bg-rm-trip-surface-card p-3 shadow-[var(--rm-trip-card-shadow)] transition duration-200 hover:-translate-y-[3px] hover:shadow-[var(--rm-trip-lift-shadow)]">
                  <img
                    src={row.img}
                    alt={row.alt}
                    loading="lazy"
                    decoding="async"
                    className={cn(
                      "block h-auto max-w-full rounded-rm-trip-smooth border border-[rgb(var(--color-border))] object-contain",
                      row.imageClass,
                    )}
                  />
                </figure>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function WorkflowSection() {
  return (
    <section id="how" className={cn(sectionWhite, "theme-grid")}>
      <div className={section}>
        <picture className="block">
          <source
            media="(max-width: 767px)"
            srcSet="/landing/workflow-mobile.gif"
            width={420}
            height={910}
          />
          <img
            src="/landing/workflow.gif"
            alt="Upload your content, copy the embed script and paste in your website, and get your own support chatbot."
            width={1392}
            height={340}
            loading="lazy"
            decoding="async"
            className="block h-auto w-full"
          />
        </picture>
      </div>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section id="features">
      <div className={section}>
        <div className="mb-10 text-center">
          <p className={eyebrow}>Features</p>
          <h2 className={cn(sectionTitle, "mx-auto max-w-[540px]")}>Everything needed to run a grounded support assistant</h2>
        </div>
        <div className="grid grid-cols-3 gap-3.5 max-[900px]:grid-cols-1">
          <FeatureCard icon={<MessageCircle size={20} />} title="Instant answer engine" items={["Answers from approved content", "Chat against indexed documents", "Clear context for manual follow-up"]} />
          <FeatureCard icon={<Funnel size={20} />} title="Content pipeline" items={["Upload PDFs, markdown, and images", "Organize content for search", "Edit and manage saved sources"]} />
          <article className={cn(card, hoverCard, "p-7")}>
            <h3 className="mb-3.5 font-[var(--rm-trip-font-heading)] text-[17px] font-bold text-rm-trip-text">Platform essentials</h3>
            <ul className="flex flex-col gap-[11px]">
              {[
                [ShieldCheck, "Widget keys and allowed domains"],
                [Languages, "Public chatbot URL for quick sharing"],
                [Activity, "Conversation analytics"],
                [Lock, "Chat history review tools"],
              ].map(([Icon, text]) => {
                const TypedIcon = Icon as typeof ShieldCheck;
                return (
                  <li key={text as string} className="flex items-center gap-2.5 text-[13.5px] text-[var(--rm-trip-text-muted)]">
                    <TypedIcon size={16} className="shrink-0 text-[var(--rm-trip-brand)]" />
                    {text as string}
                  </li>
                );
              })}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  items,
  title,
}: {
  icon: ReactNode;
  items: string[];
  title: string;
}) {
  return (
    <article className={cn(card, hoverCard, "p-7")}>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-rm-trip-smooth bg-rm-trip-brand-light text-rm-trip-brand">
        {icon}
      </div>
      <h3 className="mb-3.5 font-[var(--rm-trip-font-heading)] text-[17px] font-bold text-rm-trip-text">{title}</h3>
      <ul className="flex flex-col gap-[9px]">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-[13.5px] text-[var(--rm-trip-text-muted)]">
            <Check size={15} className="mt-px shrink-0 text-rm-trip-brand" />
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}

export function CommandCenterSection() {
  return (
    <div className={sectionWhite}>
      <div className={section}>
        <div className="grid grid-cols-[1.25fr_1fr] items-center gap-12 max-[900px]:grid-cols-1">
          <div>
            <p className={eyebrow}>Command center</p>
            <h2 className={sectionTitle}>Run your assistant from one operational workspace</h2>
            <p className={sectionSub}>
              Manage content, monitor conversations, configure embed settings, and track performance from one dashboard.
            </p>
            <div className="mt-[22px] flex flex-col gap-[11px]">
              {[
                [WandSparkles, "Grounded answers from indexed content"],
                [GitBranch, "Widget snippet and public URL generation"],
                [ShieldCheck, "Domain allowlist and key management"],
              ].map(([Icon, text]) => {
                const TypedIcon = Icon as typeof ShieldCheck;
                return (
                  <div key={text as string} className="flex items-center gap-2.5 text-sm text-[var(--rm-trip-text-muted)]">
                    <TypedIcon size={16} className="shrink-0 text-[var(--rm-trip-brand)]" />
                    {text as string}
                  </div>
                );
              })}
            </div>
          </div>
          <div className={cn(card, "overflow-hidden bg-rm-trip-surface")}>
            <img
              src="/landing/rocket-launch.gif"
              alt="Animated rocket launch"
              width={640}
              height={640}
              loading="lazy"
              decoding="async"
              className="block h-auto w-full object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TrustSection() {
  return (
    <div className={cn(sectionWhite, "landing-trust")}>
      <div className={cn(shell, "px-7 py-12")}>
        <div className="grid grid-cols-3 gap-3 max-[700px]:grid-cols-1">
          {[
            [Lock, "Domain controls", "Allow only approved origins to load your website widget."],
            [FileText, "Approved sources", "Ground responses in your uploaded and indexed business content."],
            [BarChart3, "Conversation visibility", "Review chat history and analytics to improve answers continuously."],
          ].map(([Icon, title, body]) => {
            const TypedIcon = Icon as typeof Lock;
            return (
              <article
                key={title as string}
                className="rounded-rm-trip-smooth border border-[rgb(var(--color-border))] bg-rm-trip-surface p-[22px] transition hover:bg-white hover:shadow-[var(--rm-trip-card-shadow)]"
              >
                <TypedIcon size={20} className="text-[var(--rm-trip-brand)]" />
                <h4 className="mb-[5px] mt-2.5 font-[var(--rm-trip-font-heading)] text-sm font-bold text-rm-trip-text">
                  {title as string}
                </h4>
                <p className="text-[12.5px] leading-[1.55] text-[var(--rm-trip-text-muted)]">{body as string}</p>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function FaqSection() {
  return (
    <div className={sectionWhite}>
      <div className={section}>
        <p className={eyebrow}>FAQ</p>
        <h2 className={sectionTitle}>Questions before rollout</h2>
        <div className="mt-8 flex flex-col gap-2.5">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="group overflow-hidden rounded-rm-trip-smooth border border-[rgb(var(--color-border))] bg-white transition-shadow open:shadow-[var(--rm-trip-card-shadow)]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between px-[22px] py-[18px] text-[15px] font-semibold text-rm-trip-text marker:hidden [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="text-lg font-light leading-none text-[var(--rm-trip-brand)]">
                  <span className="group-open:hidden">+</span>
                  <span className="hidden group-open:inline">-</span>
                </span>
              </summary>
              <p className="px-[22px] pb-[18px] text-sm font-light leading-[1.72] text-[var(--rm-trip-text-muted)]">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ContactSection({
  error,
  form,
  isAuthenticated,
  // messagePreview,
  onSubmit,
  set,
  submitting,
  success,
  turnstile,
}: ContactFormProps) {
  return (
    <section id="cta">
      <div className={cn(shell, "px-7 pb-20 pt-16 max-[700px]:px-3.5 max-[700px]:pb-16 max-[700px]:pt-12")}>
        <div className="grid grid-cols-[1.4fr_1fr] overflow-hidden rounded-rm-trip-smooth border border-[rgb(var(--color-border))] bg-white shadow-[var(--rm-trip-lift-shadow)] max-[900px]:grid-cols-1">
          <div className="min-w-0 p-10 max-[700px]:px-5 max-[700px]:py-7">
            <h2 className="mb-2.5 font-[var(--rm-trip-font-heading)] text-3xl font-extrabold text-rm-trip-text max-[700px]:text-2xl">
              Contact us
            </h2>
            <p className="mb-[26px] max-w-[420px] text-sm font-light leading-[1.65] text-[var(--rm-trip-text-muted)]">
              Send us your questions and we will get back to you by email.
            </p>
            <form className="grid grid-cols-2 gap-3.5 max-[700px]:grid-cols-1" onSubmit={onSubmit}>
              <ContactField label="Name">
                <input
                  className={inputClasses}
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Alex Morgan"
                  maxLength={120}
                  disabled={submitting}
                  required
                />
              </ContactField>
              <ContactField label="Email">
                <input
                  className={inputClasses}
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="alex@company.com"
                  maxLength={254}
                  disabled={submitting}
                  required
                />
              </ContactField>
              <ContactField label="Subject (optional)" wide>
                <input
                  className={inputClasses}
                  type="text"
                  value={form.subject}
                  onChange={(e) => set("subject", e.target.value)}
                  placeholder="How can we help?"
                  maxLength={200}
                  disabled={submitting}
                />
              </ContactField>
              <ContactField label="Message" wide>
                <textarea
                  className={cn(inputClasses, "min-h-[120px] resize-y")}
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                  placeholder="Write your message..."
                  maxLength={5000}
                  disabled={submitting}
                  required
                />
              </ContactField>
              <TurnstileWidget action="contact" control={turnstile} className="col-span-full" />
              <button
                type="submit"
                disabled={submitting || !turnstile.token}
                className="col-span-full flex items-center justify-center gap-[7px] rounded-rm-trip-smooth bg-rm-trip-brand p-[13px] text-[15px] font-semibold text-rm-trip-on-brand shadow-[var(--rm-trip-glow-shadow)] transition hover:-translate-y-px hover:bg-rm-trip-brand-dark hover:shadow-rm-trip-card disabled:cursor-not-allowed disabled:opacity-65"
              >
                {submitting ? "Submitting..." : "Send message"}
                <ChevronRight size={16} />
              </button>
            </form>
            <div className="mt-3 flex flex-wrap gap-5">
              <Link
                to={isAuthenticated ? DASHBOARD_PATH : "/login"}
                className="text-[13px] font-semibold text-[var(--rm-trip-brand)] no-underline hover:underline"
              >
                {isAuthenticated ? "Go to dashboard" : "Already have an account? Sign in"}
              </Link>
              <Link to="/signup" className="text-[13px] font-semibold text-[var(--rm-trip-text-muted)] no-underline hover:underline">
                Create account
              </Link>
            </div>
            {error && <p role="alert" className="mt-2.5 text-[13px] font-semibold text-[var(--rm-trip-state-error)]">{error}</p>}
            {success && <p role="status" className="mt-2.5 text-[13px] font-semibold text-[var(--rm-trip-state-success)]">{success}</p>}
          </div>
          <div className="relative min-w-0 overflow-hidden border-l border-[rgb(var(--color-border))] bg-rm-trip-surface max-[900px]:aspect-square max-[900px]:border-l-0 max-[900px]:border-t">
            {/*
            <p className="mb-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-rm-trip-text-muted">Contact preview</p>
            <PreviewBlock label="Your message">{messagePreview}</PreviewBlock>
            <div className="flex items-center gap-2 rounded-rm-trip-smooth border border-[rgb(var(--color-border))] bg-white px-3.5 py-[11px] text-[12.5px] font-medium text-[var(--rm-trip-text-muted)]">
              <ShieldCheck size={15} className="text-[var(--rm-trip-brand)]" />
              <span>
                Messages are prepared for{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="font-semibold text-[var(--rm-trip-brand)] no-underline hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>
              </span>
            </div>
            */}
            <img
              src="/landing/logo-retro.gif"
              alt="Animated SupportMate logo"
              width={640}
              height={640}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 block h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

const inputClasses =
  "w-full rounded-rm-trip-smooth border border-[rgb(var(--color-border-strong))] bg-rm-trip-surface px-[13px] py-2.5 text-[13.5px] text-rm-trip-text outline-none transition placeholder:text-rm-trip-text-muted focus:border-rm-trip-brand focus:bg-white focus:shadow-[var(--shadow-focus)]";

function ContactField({ children, label, wide = false }: { children: ReactNode; label: string; wide?: boolean }) {
  return (
    <label className={cn("block", wide && "col-span-full max-[700px]:col-auto")}>
      <span className="mb-[5px] block text-[12.5px] font-semibold text-rm-trip-text">{label}</span>
      {children}
    </label>
  );
}

/*
function PreviewBlock({
  children,
  highlighted = false,
  label,
}: {
  children: ReactNode;
  highlighted?: boolean;
  label: string;
}) {
  return (
    <div
      className={cn(
        "mb-2.5 rounded-rm-trip-smooth border px-[15px] py-[13px]",
        highlighted
          ? "border-rm-trip-brand/25 bg-[var(--rm-trip-brand-light)]"
          : "border-[rgb(var(--color-border))] bg-white",
      )}
    >
      <div className={cn("mb-1 text-[11px] font-semibold", highlighted ? "text-rm-trip-brand/70" : "text-rm-trip-text-muted")}>
        {label}
      </div>
      <div className={cn("break-words text-[13.5px] leading-normal", highlighted ? "text-sm font-bold text-[var(--rm-trip-brand)]" : "text-rm-trip-text")}>
        {children}
      </div>
    </div>
  );
}
*/

export function LandingFooter() {
  return (
    <footer className="landing-footer border-t border-[rgb(var(--color-border))]">
      <div className={cn(shell, "grid grid-cols-[1.6fr_1fr_1fr_1fr] gap-8 px-7 pb-10 pt-[52px] max-md:grid-cols-2")}>
        <div>
          <div className={logoClasses}>
            <img src="/favicon.svg" alt="SupportMate logo" className={logoMarkClasses} />
            <span className={logoNameClasses}>SupportMate</span>
          </div>
          <p className="mt-3 text-[13.5px] font-light text-[var(--rm-trip-text-muted)]">Grounded AI support for modern teams.</p>
        </div>
        <FooterColumn title="Product">
          <li>
            <a href="#features">Features</a>
          </li>
          <li>
            <a href="#cta">Book walkthrough</a>
          </li>
        </FooterColumn>
        <FooterColumn title="Resources">
          <li>
            <Link to="/privacy">Privacy Policy</Link>
          </li>
          <li>
            <Link to="/terms">Terms of Service</Link>
          </li>
          <FooterIconItem icon={<Clock3 size={13} />}>24/7 assistant availability</FooterIconItem>
          <FooterIconItem icon={<Bot size={13} />}>Grounded answer engine</FooterIconItem>
        </FooterColumn>
        <FooterColumn title="Trust">
          {/* <li className="flex items-center gap-[7px] text-[13px] text-[var(--rm-trip-text-muted)]">
            <ShieldCheck size={13} className="shrink-0" />
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </li> */}
          <FooterIconItem icon={<Lock size={13} />}>Chat history review tools</FooterIconItem>
          <FooterIconItem icon={<FileText size={13} />}>Approved source control</FooterIconItem>
        </FooterColumn>
      </div>
      <div className={cn(shell, "flex flex-wrap items-center justify-between gap-3 border-t border-[rgb(var(--color-border))] px-7 py-4 text-xs text-rm-trip-text-muted")}>
        <span>&copy; {new Date().getFullYear()} SupportMate, Inc. All rights reserved.</span>
        <span className="flex items-center gap-2">
          <Link to="/privacy" className="text-rm-trip-text-muted no-underline hover:text-rm-trip-text hover:underline">
            Privacy
          </Link>
          <span aria-hidden="true">&middot;</span>
          <Link to="/terms" className="text-rm-trip-text-muted no-underline hover:text-rm-trip-text hover:underline">
            Terms
          </Link>
        </span>
      </div>
    </footer>
  );
}

function FooterColumn({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div>
      <h5 className="mb-3.5 font-[var(--rm-trip-font-heading)] text-[13px] font-bold text-rm-trip-text">{title}</h5>
      <ul className="flex flex-col gap-[9px] text-[13px] text-[var(--rm-trip-text-muted)] [&_a]:text-[var(--rm-trip-text-muted)] [&_a]:no-underline [&_a]:transition-colors [&_a:hover]:text-rm-trip-text">
        {children}
      </ul>
    </div>
  );
}

function FooterIconItem({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <li className="flex items-center gap-[7px] text-[13px] text-[var(--rm-trip-text-muted)] [&_svg]:shrink-0">
      {icon}
      {children}
    </li>
  );
}
