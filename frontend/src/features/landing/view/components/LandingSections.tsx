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
  Minus,
  ShieldCheck,
  Users,
  WandSparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  CONTACT_EMAIL,
  DASHBOARD_PATH,
  type ContactFormProps,
  card,
  eyebrow,
  faqs,
  hoverCard,
  logoClasses,
  logoMarkClasses,
  logoNameClasses,
  pricingPlans,
  section,
  sectionSub,
  sectionTitle,
  sectionWhite,
  shell,
  workflowSteps,
} from "./landingContent";

export function MetricsStrip() {
  return (
    <div className="border-b border-[rgba(15,23,42,0.10)] bg-white">
      <div className={cn(shell, "grid grid-cols-4 gap-px bg-[rgba(15,23,42,0.10)] max-[700px]:grid-cols-2")}>
        {[
          ["PDF + Markdown", "document ingestion"],
          ["Web Crawl", "URL indexing and refetch"],
          ["Widget Keys", "embed and domain control"],
          ["Analytics", "sessions, sources, sections"],
        ].map(([value, label]) => (
          <div key={value} className="bg-white px-7 py-[22px] text-center">
            <strong className="block font-[var(--rm-trip-font-heading)] text-[26px] font-extrabold text-[var(--rm-trip-text)]">{value}</strong>
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
      <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">Built for</span>
      {["PDFs", "Markdown", "Web Pages", "Images", "Website Widget"].map((name) => (
        <span
          key={name}
          className="cursor-default rounded-full border border-[rgba(15,23,42,0.16)] bg-white px-[15px] py-1.5 text-[13px] font-semibold text-[var(--rm-trip-text-muted)] transition hover:border-[var(--rm-trip-brand)] hover:bg-[var(--rm-trip-brand-light)] hover:text-[var(--rm-trip-brand)]"
        >
          {name}
        </span>
      ))}
    </div>
  );
}

export function ScreenshotsSection() {
  const rows = [
    {
      alt: "SupportMate shared inbox with AI replies",
      desc: "Add PDFs, markdown files, web pages, and images so every assistant response stays grounded in trusted material.",
      img: "/landing/screenshot-inbox.png",
      label: "Setup",
      note: "Knowledge sources: PDFs, markdown, URLs, and images.",
      title: "Upload your content",
    },
    {
      alt: "Analytics dashboard",
      desc: "Monitor sessions, source coverage, and answer quality from one dashboard to quickly spot where support needs tuning.",
      img: "/landing/screenshot-analytics.png",
      label: "Insights",
      note: "Real-time visibility for conversations, usage, and content gaps.",
      title: "Track performance live",
    },
    {
      alt: "Workflow builder",
      desc: "Route conversations, qualify leads, and standardize handoffs with repeatable rules based on what your team learns.",
      img: "/landing/screenshot-builder.png",
      label: "Automation",
      note: "Operational playbooks that scale across agents and channels.",
      title: "Automate your workflows",
    },
  ];

  return (
    <section id="screenshots">
      <div className={section}>
        <p className={eyebrow}>Screenshots</p>
        <h2 className={sectionTitle}>A practical workspace for support operations</h2>
        <p className={sectionSub}>
          Follow the same Z flow your team uses: upload trusted sources, monitor results in one dashboard, then refine
          workflows to improve every reply.
        </p>
        <div className="mt-9 rounded-[calc(var(--rm-trip-smooth)+14px)] border border-[rgba(15,23,42,0.10)] bg-[radial-gradient(ellipse_65%_45%_at_8%_4%,rgba(37,99,235,0.08)_0%,transparent_60%),radial-gradient(ellipse_45%_45%_at_95%_98%,rgba(20,184,166,0.06)_0%,transparent_60%),#fff] p-[18px] max-[900px]:p-3">
          <div className="flex flex-col gap-5">
            {rows.map((row, index) => (
              <article key={row.title} className="grid grid-cols-[minmax(290px,0.95fr)_minmax(0,1.25fr)] items-stretch gap-5 max-[900px]:grid-cols-1">
                <div className="relative flex flex-col justify-center overflow-hidden rounded-[calc(var(--rm-trip-smooth)+10px)] border border-[rgba(15,23,42,0.10)] bg-[linear-gradient(145deg,#ffffff_0%,#f4f9ff_100%)] px-7 py-[26px] shadow-[var(--rm-trip-card-shadow)] before:absolute before:left-0 before:top-0 before:h-1 before:w-[86px] before:bg-[linear-gradient(90deg,var(--rm-trip-brand),#60a5fa)] max-[900px]:p-5">
                  <span className="mb-2.5 inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(37,99,235,0.25)] bg-[#eaf2ff] py-1 pl-1 pr-1.5 text-[11px] font-bold uppercase tracking-[0.09em] text-[#1e40af]">
                    <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[var(--rm-trip-brand)] text-[10px] text-white">
                      0{index + 1}
                    </span>
                    {row.label}
                  </span>
                  <h3 className="mb-2 font-[var(--rm-trip-font-heading)] text-[clamp(22px,2.3vw,30px)] font-bold leading-[1.15] text-[var(--rm-trip-text)]">
                    {row.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--rm-trip-text-muted)]">{row.desc}</p>
                  <p className="mt-3 text-xs font-semibold leading-normal text-[#94a3b8]">{row.note}</p>
                </div>
                <figure className="overflow-hidden rounded-[calc(var(--rm-trip-smooth)+10px)] border border-[rgba(15,23,42,0.10)] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-3 shadow-[var(--rm-trip-card-shadow)] transition duration-200 hover:-translate-y-[3px] hover:shadow-[var(--rm-trip-lift-shadow)]">
                  <img
                    src={row.img}
                    alt={row.alt}
                    className="block w-full rounded-[var(--rm-trip-smooth)] border border-[rgba(15,23,42,0.10)]"
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
    <div className={sectionWhite} id="how">
      <div className={section}>
        <p className={eyebrow}>Workflow</p>
        <h2 className={sectionTitle}>Set up, deploy, and improve in three clear steps</h2>
        <div className="mt-10 grid grid-cols-3 gap-4 max-md:grid-cols-1">
          {workflowSteps.map((step, index) => (
            <article
              key={step.title}
              className={cn(card, hoverCard, "relative overflow-hidden px-[26px] py-7 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:origin-left after:scale-x-0 after:bg-[linear-gradient(90deg,var(--rm-trip-brand),#3b82f6)] after:transition-transform hover:after:scale-x-100")}
            >
              <div className="mb-2.5 font-[var(--rm-trip-font-heading)] text-[52px] font-extrabold leading-none text-[var(--rm-trip-brand-light)]">
                0{index + 1}
              </div>
              <h3 className="mb-2 font-[var(--rm-trip-font-heading)] text-[17px] font-bold text-[var(--rm-trip-text)]">{step.title}</h3>
              <p className="text-[13.5px] leading-[1.65] text-[var(--rm-trip-text-muted)]">{step.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
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
          <FeatureCard icon={<MessageCircle size={20} />} tone="blue" title="Instant answer engine" items={["Answers from approved content", "Chat against indexed documents and pages", "Clear context for manual follow-up"]} />
          <FeatureCard icon={<Funnel size={20} />} tone="teal" title="Content pipeline" items={["Upload PDFs, markdown, and images", "Ingest and refetch website URLs", "Edit and manage saved sources"]} />
          <article className={cn(card, hoverCard, "p-7")}>
            <h3 className="mb-3.5 font-[var(--rm-trip-font-heading)] text-[17px] font-bold text-[var(--rm-trip-text)]">Platform essentials</h3>
            <ul className="flex flex-col gap-[11px]">
              {[
                [ShieldCheck, "Widget keys and allowed domains"],
                [Languages, "Public chatbot URL for quick sharing"],
                [Activity, "Conversation analytics"],
                [GitBranch, "Web crawl health and source mix"],
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
  tone,
}: {
  icon: ReactNode;
  items: string[];
  title: string;
  tone: "blue" | "teal";
}) {
  const isTeal = tone === "teal";

  return (
    <article className={cn(card, hoverCard, "p-7")}>
      <div
        className={cn(
          "mb-4 flex h-11 w-11 items-center justify-center rounded-[11px]",
          isTeal ? "bg-[var(--rm-trip-accent-light)] text-[#0f766e]" : "bg-[var(--rm-trip-brand-light)] text-[var(--rm-trip-brand)]",
        )}
      >
        {icon}
      </div>
      <h3 className="mb-3.5 font-[var(--rm-trip-font-heading)] text-[17px] font-bold text-[var(--rm-trip-text)]">{title}</h3>
      <ul className="flex flex-col gap-[9px]">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-[13.5px] text-[var(--rm-trip-text-muted)]">
            <Check size={15} className={cn("mt-px shrink-0", isTeal ? "text-[#0f766e]" : "text-[var(--rm-trip-brand)]")} />
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
          <div className={cn(card, "bg-[var(--rm-trip-surface)] p-5")}>
            <div className="mb-3.5 flex items-center justify-between rounded-[var(--rm-trip-smooth)] border border-[rgba(15,23,42,0.10)] bg-white px-3.5 py-[11px]">
              <span className="text-xs font-semibold text-[#94a3b8]">Live operations</span>
              <span className="flex items-center gap-[5px] text-xs font-semibold text-[var(--rm-trip-state-success)]">
                <span className="h-[7px] w-[7px] rounded-full bg-[var(--rm-trip-state-success)] animate-pulse" />
                Healthy
              </span>
            </div>
            {[
              ["Indexed sources", "126"],
              ["Active widget keys", "8"],
              ["Crawled pages", "412"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-[rgba(15,23,42,0.10)] py-[9px] text-[13.5px] last:border-0">
                <span className="text-[var(--rm-trip-text-muted)]">{label}</span>
                <strong className="font-[var(--rm-trip-font-heading)] text-[15px] font-bold text-[var(--rm-trip-text)]">{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsSection() {
  return (
    <section id="testimonials">
      <div className={section}>
        <div className="grid grid-cols-[1.2fr_1fr] items-start gap-8 max-[900px]:grid-cols-1">
          <div>
            <p className={eyebrow}>Customers</p>
            <h2 className={sectionTitle}>Support teams move faster with better content control</h2>
            <div className="mt-6 flex flex-col gap-3">
              <QuoteCard cite="Maya Chen - Support Lead">
                "We uploaded our docs and help center first, then SupportMate started answering with cleaner,
                source-backed responses in the same day."
              </QuoteCard>
              <QuoteCard cite="Eli Novak - Operations Manager">
                "Widget key and domain controls made rollout easy across our properties, and analytics shows exactly
                where we still need better content."
              </QuoteCard>
            </div>
          </div>
          <div className={cn(card, "flex flex-col gap-2.5 p-5")}>
            <StatBlock label="Indexed sections" value="5,406" />
            <StatBlock label="Crawled pages" value="1,284" />
            <StatBlock label="Conversations" value="42,891" highlighted />
          </div>
        </div>
      </div>
    </section>
  );
}

function QuoteCard({ children, cite }: { children: ReactNode; cite: string }) {
  return (
    <figure className={cn(card, "p-6")}>
      <blockquote className="mb-3.5 text-[15px] font-light italic leading-[1.72] text-[var(--rm-trip-text-muted)]">
        {children}
      </blockquote>
      <cite className="text-[13px] font-bold not-italic text-[var(--rm-trip-text)]">{cite}</cite>
    </figure>
  );
}

function StatBlock({ highlighted = false, label, value }: { highlighted?: boolean; label: string; value: string }) {
  return (
    <div
      className={cn(
        "rounded-[var(--rm-trip-smooth)] border p-4",
        highlighted
          ? "border-[rgba(37,99,235,0.20)] bg-[var(--rm-trip-brand-light)]"
          : "border-[rgba(15,23,42,0.10)] bg-[var(--rm-trip-surface)]",
      )}
    >
      <div className={cn("text-[11px] font-semibold uppercase tracking-[0.07em]", highlighted ? "text-[rgba(37,99,235,0.60)]" : "text-[#94a3b8]")}>
        {label}
      </div>
      <div className={cn("mt-1 font-[var(--rm-trip-font-heading)] text-[26px] font-extrabold text-[var(--rm-trip-text)]", highlighted && "text-[var(--rm-trip-brand)]")}>
        {value}
      </div>
    </div>
  );
}

export function TrustSection() {
  return (
    <div className={sectionWhite}>
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
                className="rounded-[calc(var(--rm-trip-smooth)+6px)] border border-[rgba(15,23,42,0.10)] bg-[var(--rm-trip-surface)] p-[22px] transition hover:bg-white hover:shadow-[var(--rm-trip-card-shadow)]"
              >
                <TypedIcon size={20} className="text-[var(--rm-trip-brand)]" />
                <h4 className="mb-[5px] mt-2.5 font-[var(--rm-trip-font-heading)] text-sm font-bold text-[var(--rm-trip-text)]">
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

export function PricingSection() {
  return (
    <section id="pricing">
      <div className={section}>
        <div className="mb-10 text-center">
          <p className={eyebrow}>Pricing</p>
          <h2 className={cn(sectionTitle, "mx-auto max-w-[460px]")}>Choose a plan for your support volume</h2>
        </div>
        <div className="mb-3.5 grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
          {pricingPlans.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                card,
                "relative flex h-full flex-col p-[30px]",
                plan.highlighted && "-translate-y-1 border-2 border-[var(--rm-trip-brand)] shadow-[0_16px_40px_rgba(37,99,235,0.22)]",
              )}
            >
              {plan.highlighted && (
                <span className="absolute right-5 top-[-12px] rounded-full bg-[var(--rm-trip-brand)] px-[11px] py-[5px] text-[11px] font-bold text-white">
                  Most popular
                </span>
              )}
              <div className={cn("mb-2 text-[11px] font-bold uppercase tracking-[0.12em]", plan.highlighted ? "text-[var(--rm-trip-brand)]" : "text-[var(--rm-trip-text-muted)]")}>
                {plan.name}
              </div>
              <div className={cn("mb-1.5 font-[var(--rm-trip-font-heading)] text-[56px] font-extrabold leading-none text-[var(--rm-trip-text)]", plan.highlighted && "text-[var(--rm-trip-brand)]")}>
                {plan.price}
              </div>
              <p className={cn("mb-6 text-[13px] text-[#94a3b8]", plan.highlighted && "text-[var(--rm-trip-text-muted)]")}>
                {plan.subtitle}
              </p>
              <ul className="flex flex-1 flex-col gap-2.5">
                {plan.features.map((feature) => (
                  <li
                    key={feature.label}
                    className={cn(
                      "flex items-center gap-[9px] text-[13.5px] text-[var(--rm-trip-text-muted)]",
                      !feature.included && "text-[#94a3b8] line-through decoration-[1.25px]",
                    )}
                  >
                    {feature.included ? (
                      <Check size={15} className="shrink-0 text-[var(--rm-trip-brand)]" />
                    ) : (
                      <Minus size={15} className="shrink-0 text-[#94a3b8]" />
                    )}
                    {feature.label}
                  </li>
                ))}
              </ul>
              <a
                href="#cta"
                className={cn(
                  "mt-6 flex w-full items-center justify-center gap-1.5 rounded-[var(--rm-trip-smooth)] border p-[11px] text-sm font-semibold no-underline transition",
                  plan.highlighted
                    ? "border-[var(--rm-trip-brand)] bg-[var(--rm-trip-brand)] text-white hover:border-[var(--rm-trip-brand-dark)] hover:bg-[var(--rm-trip-brand-dark)]"
                    : "border-[rgba(15,23,42,0.16)] bg-transparent text-[var(--rm-trip-text)] hover:bg-[var(--rm-trip-surface)]",
                )}
              >
                Get started <ChevronRight size={15} />
              </a>
            </article>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2.5 max-[900px]:grid-cols-2">
          {[
            [Clock3, "Always available", "Keep your assistant active around the clock."],
            [FileText, "Knowledge grounded", "Answer from docs, pages, markdown, and images."],
            [Users, "Workspace control", "Manage company context, content, and widget keys."],
            [BarChart3, "Actionable trends", "Track activity, source mix, and crawl health."],
          ].map(([Icon, title, body]) => {
            const TypedIcon = Icon as typeof Clock3;
            return (
              <article key={title as string} className={cn(card, "p-[18px]")}>
                <TypedIcon size={18} className="text-[var(--rm-trip-brand)]" />
                <h4 className="mb-1 mt-2.5 font-[var(--rm-trip-font-heading)] text-[13.5px] font-bold text-[var(--rm-trip-text)]">
                  {title as string}
                </h4>
                <p className="text-xs leading-normal text-[var(--rm-trip-text-muted)]">{body as string}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
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
              className="group overflow-hidden rounded-[calc(var(--rm-trip-smooth)+6px)] border border-[rgba(15,23,42,0.10)] bg-white transition-shadow open:shadow-[var(--rm-trip-card-shadow)]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between px-[22px] py-[18px] text-[15px] font-semibold text-[var(--rm-trip-text)] marker:hidden [&::-webkit-details-marker]:hidden">
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
  messagePreview,
  onSubmit,
  set,
  submitting,
  success,
}: ContactFormProps) {
  return (
    <section id="cta">
      <div className={cn(shell, "px-7 pb-20 pt-16 max-[700px]:px-3.5 max-[700px]:pb-16 max-[700px]:pt-12")}>
        <div className="grid grid-cols-[1.4fr_1fr] overflow-hidden rounded-[calc(var(--rm-trip-smooth)+12px)] border border-[rgba(15,23,42,0.10)] bg-white shadow-[var(--rm-trip-lift-shadow)] max-[900px]:grid-cols-1">
          <div className="min-w-0 p-10 max-[700px]:px-5 max-[700px]:py-7">
            <h2 className="mb-2.5 font-[var(--rm-trip-font-heading)] text-3xl font-extrabold text-[var(--rm-trip-text)] max-[700px]:text-2xl">
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
                />
              </ContactField>
              <ContactField label="Message" wide>
                <textarea
                  className={cn(inputClasses, "min-h-[120px] resize-y")}
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                  placeholder="Write your message..."
                  required
                />
              </ContactField>
              <button
                type="submit"
                disabled={submitting}
                className="col-span-full flex items-center justify-center gap-[7px] rounded-[var(--rm-trip-smooth)] bg-[var(--rm-trip-brand)] p-[13px] text-[15px] font-semibold text-white shadow-[var(--rm-trip-glow-shadow)] transition hover:-translate-y-px hover:bg-[var(--rm-trip-brand-dark)] hover:shadow-[0_6px_28px_rgba(37,99,235,0.35)] disabled:cursor-not-allowed disabled:opacity-65"
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
            {error && <p className="mt-2.5 text-[13px] font-semibold text-[var(--rm-trip-state-error)]">{error}</p>}
            {success && <p className="mt-2.5 text-[13px] font-semibold text-[var(--rm-trip-state-success)]">{success}</p>}
          </div>
          <div className="min-w-0 border-l border-[rgba(15,23,42,0.10)] bg-[var(--rm-trip-surface)] p-8 max-[900px]:border-l-0 max-[900px]:border-t max-[700px]:px-5 max-[700px]:py-6">
            <p className="mb-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">Contact preview</p>
            <PreviewBlock label="Your message">{messagePreview}</PreviewBlock>
            <PreviewBlock label="Reply destination" highlighted>
              {form.email.trim() || "your-email@example.com"}
            </PreviewBlock>
            <div className="flex items-center gap-2 rounded-[var(--rm-trip-smooth)] border border-[rgba(15,23,42,0.10)] bg-white px-3.5 py-[11px] text-[12.5px] font-medium text-[var(--rm-trip-text-muted)]">
              <ShieldCheck size={15} className="text-[var(--rm-trip-brand)]" />
              Messages are prepared for {CONTACT_EMAIL}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const inputClasses =
  "w-full rounded-[var(--rm-trip-smooth)] border border-[rgba(15,23,42,0.16)] bg-[var(--rm-trip-surface)] px-[13px] py-2.5 text-[13.5px] text-[var(--rm-trip-text)] outline-none transition placeholder:text-[#94a3b8] focus:border-[var(--rm-trip-brand)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]";

function ContactField({ children, label, wide = false }: { children: ReactNode; label: string; wide?: boolean }) {
  return (
    <label className={cn("block", wide && "col-span-full max-[700px]:col-auto")}>
      <span className="mb-[5px] block text-[12.5px] font-semibold text-[var(--rm-trip-text)]">{label}</span>
      {children}
    </label>
  );
}

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
        "mb-2.5 rounded-[var(--rm-trip-smooth)] border px-[15px] py-[13px]",
        highlighted
          ? "border-[rgba(37,99,235,0.20)] bg-[var(--rm-trip-brand-light)]"
          : "border-[rgba(15,23,42,0.10)] bg-white",
      )}
    >
      <div className={cn("mb-1 text-[11px] font-semibold", highlighted ? "text-[rgba(37,99,235,0.60)]" : "text-[#94a3b8]")}>
        {label}
      </div>
      <div className={cn("break-words text-[13.5px] leading-normal", highlighted ? "text-sm font-bold text-[var(--rm-trip-brand)]" : "text-[var(--rm-trip-text)]")}>
        {children}
      </div>
    </div>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-[rgba(15,23,42,0.10)] bg-white">
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
            <a href="#pricing">Pricing</a>
          </li>
          <li>
            <a href="#cta">Book walkthrough</a>
          </li>
        </FooterColumn>
        <FooterColumn title="Resources">
          <FooterIconItem icon={<Clock3 size={13} />}>24/7 assistant availability</FooterIconItem>
          <FooterIconItem icon={<Bot size={13} />}>Grounded answer engine</FooterIconItem>
          <FooterIconItem icon={<Users size={13} />}>Conversation history review</FooterIconItem>
        </FooterColumn>
        <FooterColumn title="Trust">
          <FooterIconItem icon={<Lock size={13} />}>Chat history review tools</FooterIconItem>
          <FooterIconItem icon={<FileText size={13} />}>Approved source control</FooterIconItem>
          <FooterIconItem icon={<ShieldCheck size={13} />}>Widget domain allowlist</FooterIconItem>
        </FooterColumn>
      </div>
      <div className={cn(shell, "flex items-center justify-between border-t border-[rgba(15,23,42,0.10)] px-7 py-4 text-xs text-[#94a3b8]")}>
        <span>© {new Date().getFullYear()} SupportMate, Inc. All rights reserved.</span>
        <span>Privacy · Terms</span>
      </div>
    </footer>
  );
}

function FooterColumn({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div>
      <h5 className="mb-3.5 font-[var(--rm-trip-font-heading)] text-[13px] font-bold text-[var(--rm-trip-text)]">{title}</h5>
      <ul className="flex flex-col gap-[9px] text-[13px] text-[var(--rm-trip-text-muted)] [&_a]:text-[var(--rm-trip-text-muted)] [&_a]:no-underline [&_a]:transition-colors [&_a:hover]:text-[var(--rm-trip-text)]">
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
