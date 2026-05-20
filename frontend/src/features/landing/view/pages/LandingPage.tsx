import { type FormEvent, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
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
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  WandSparkles,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

type CtaFormState = {
  fullName: string;
  email: string;
  website: string;
  goal: string;
};

const goalOptions = [
  { value: "support", label: "Reduce support tickets" },
  { value: "sales", label: "Qualify more leads" },
  { value: "onboarding", label: "Improve onboarding" },
  { value: "other", label: "Something else" },
];

const workflowSteps = [
  {
    title: "Train from your content",
    desc: "Import docs, FAQs, and product pages so the assistant speaks with current business context.",
  },
  {
    title: "Set rules and handoffs",
    desc: "Define escalation paths, lead questions, and routing rules without custom automation code.",
  },
  {
    title: "Improve with insights",
    desc: "Track unanswered questions and conversion trends so every conversation makes the bot sharper.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "$49",
    subtitle: "per month for small teams testing automation.",
    features: ["1 chatbot workspace", "1,000 monthly conversations", "Email support"],
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$149",
    subtitle: "per month for support and sales teams.",
    features: ["5 chatbot workspaces", "10,000 monthly conversations", "CRM routing and analytics", "Priority support"],
    highlighted: true,
  },
];

const faqs = [
  {
    q: "How fast can we launch?",
    a: "Most teams can connect docs, configure handoff rules, and place the widget on their site in a single afternoon.",
  },
  {
    q: "Can it hand off to humans?",
    a: "Yes. Conversations can route to support, sales, or a shared inbox based on intent and custom rules.",
  },
  {
    q: "Will it make up answers?",
    a: "You can restrict answers to approved knowledge sources and route low-confidence questions to human review.",
  },
  {
    q: "Does it work with our CRM?",
    a: "Yes. ReplyMate is built for lead capture, qualification tags, notes, and CRM routing workflows.",
  },
];

export function LandingPage() {
  const [form, setForm] = useState<CtaFormState>({
    fullName: "",
    email: "",
    website: "",
    goal: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedGoalLabel = useMemo(
    () => goalOptions.find((goal) => goal.value === form.goal)?.label ?? "Book Growth demo",
    [form.goal],
  );

  function updateField<K extends keyof CtaFormState>(key: K, value: CtaFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.fullName.trim() || !form.email.trim() || !form.website.trim() || !form.goal) {
      setError("Please complete all fields.");
      return;
    }

    if (!/^https?:\/\/.+/i.test(form.website.trim())) {
      setError("Website must start with http:// or https://");
      return;
    }

    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setSubmitting(false);
    setSuccess(`Thanks ${form.fullName.split(" ")[0] || "there"}, your demo request is ready.`);
    setForm({ fullName: "", email: "", website: "", goal: "" });
  }

  return (
    <div className="min-h-screen bg-rm-trip-surface text-rm-trip-text">
      <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <a href="#" className="inline-flex items-center gap-2" aria-label="ReplyMate home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rm-trip-brand text-sm font-bold text-white">R</span>
            <span className="font-rm-trip-heading text-lg font-bold">ReplyMate</span>
          </a>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#how" className="text-sm font-semibold text-rm-trip-text-muted hover:text-rm-trip-text">Workflow</a>
            <a href="#screenshots" className="text-sm font-semibold text-rm-trip-text-muted hover:text-rm-trip-text">Screenshots</a>
            <a href="#features" className="text-sm font-semibold text-rm-trip-text-muted hover:text-rm-trip-text">Features</a>
            <a href="#testimonials" className="text-sm font-semibold text-rm-trip-text-muted hover:text-rm-trip-text">Customers</a>
            <a href="#pricing" className="text-sm font-semibold text-rm-trip-text-muted hover:text-rm-trip-text">Pricing</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-rm-trip-text hover:border-gray-300">
              Sign in
            </Link>
            <a href="#cta" className="hidden rounded-xl bg-rm-trip-brand px-3 py-2 text-sm font-semibold text-white hover:bg-rm-trip-brand-dark sm:inline-flex">
              Book demo
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(37,99,235,0.18),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(20,184,166,0.16),transparent_30%)]" />
          <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-24">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-rm-trip-brand">
                <Sparkles className="h-3.5 w-3.5" />
                AI chatbot for support and sales
              </p>
              <h1 className="font-rm-trip-heading text-4xl font-bold leading-tight sm:text-5xl">
                The AI teammate that turns visitors into customers
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-rm-trip-text-muted sm:text-lg">
                ReplyMate answers questions, qualifies high-intent leads, protects your support team from repetitive
                tickets, and hands off complex conversations with every detail already organized.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#cta" className="inline-flex items-center gap-2 rounded-xl bg-rm-trip-brand px-5 py-3 text-sm font-bold text-white shadow-rm-trip-card hover:bg-rm-trip-brand-dark">
                  Book live demo
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#screenshots" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-rm-trip-text hover:border-gray-300">
                  View product
                </a>
              </div>

              <div className="mt-8 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-rm-trip-card">
                  <p className="text-base font-bold">&lt; 5 sec</p>
                  <p className="text-xs font-semibold text-rm-trip-text-muted">typical AI first reply</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-rm-trip-card">
                  <p className="text-base font-bold">24/7</p>
                  <p className="text-xs font-semibold text-rm-trip-text-muted">automated coverage</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-rm-trip-card">
                  <p className="text-base font-bold">CRM</p>
                  <p className="text-xs font-semibold text-rm-trip-text-muted">ready lead handoff</p>
                </div>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="rounded-3xl border border-gray-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
                <div className="flex items-center gap-3 border-b border-gray-100 p-4">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <div>
                    <p className="text-sm font-bold">ReplyMate Assistant</p>
                    <p className="text-xs font-semibold text-rm-trip-text-muted">Online now</p>
                  </div>
                </div>
                <div className="space-y-3 bg-rm-trip-surface px-4 py-4">
                  <div className="max-w-[86%] rounded-2xl rounded-bl-md border border-gray-200 bg-white px-3 py-2 text-sm">Hi, I can help with plans, integrations, or account setup.</div>
                  <div className="ml-auto max-w-[86%] rounded-2xl rounded-br-md bg-rm-trip-brand px-3 py-2 text-sm font-medium text-white">Can it qualify leads from our pricing page?</div>
                  <div className="max-w-[86%] rounded-2xl rounded-bl-md border border-gray-200 bg-white px-3 py-2 text-sm">Yes. I can ask custom questions, score fit, and send hot leads to your CRM.</div>
                  <div className="max-w-[86%] rounded-2xl rounded-bl-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">Lead score updated: 92. Routed to Sales.</div>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-rm-trip-text-muted">
                  <span>Ask anything...</span>
                  <Send className="h-4 w-4 text-rm-trip-brand" />
                </div>
              </div>

              <div className="absolute -left-4 top-8 rounded-2xl border border-blue-100 bg-white px-3 py-2 shadow-rm-trip-card">
                <p className="inline-flex items-center gap-1 text-xs font-semibold text-rm-trip-text-muted">
                  <Zap className="h-3.5 w-3.5 text-rm-trip-brand" />
                  Intent detected
                </p>
                <p className="mt-1 text-sm font-bold">Sales qualified</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-gray-200 bg-white">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-4 px-4 py-8 sm:grid-cols-4 sm:px-6 lg:px-8">
            <div className="rounded-xl border border-gray-100 bg-rm-trip-surface px-4 py-3 text-center"><p className="text-lg font-bold">10k+</p><p className="text-xs font-semibold text-rm-trip-text-muted">monthly conversations</p></div>
            <div className="rounded-xl border border-gray-100 bg-rm-trip-surface px-4 py-3 text-center"><p className="text-lg font-bold">31%</p><p className="text-xs font-semibold text-rm-trip-text-muted">more qualified demos</p></div>
            <div className="rounded-xl border border-gray-100 bg-rm-trip-surface px-4 py-3 text-center"><p className="text-lg font-bold">42%</p><p className="text-xs font-semibold text-rm-trip-text-muted">fewer repeat tickets</p></div>
            <div className="rounded-xl border border-gray-100 bg-rm-trip-surface px-4 py-3 text-center"><p className="text-lg font-bold">99.9%</p><p className="text-xs font-semibold text-rm-trip-text-muted">target uptime</p></div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-bold uppercase tracking-[0.14em] text-rm-trip-text-muted">Built for teams using</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm font-bold text-rm-trip-text-muted">
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5">Slack</span>
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5">HubSpot</span>
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5">Intercom</span>
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5">Zendesk</span>
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5">Salesforce</span>
          </div>
        </section>

        <section id="screenshots" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-rm-trip-brand">Screenshots</p>
            <h2 className="mt-3 font-rm-trip-heading text-3xl font-bold sm:text-4xl">A clearer view of the chatbot workspace</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <figure className="rounded-2xl border border-gray-200 bg-white p-4 shadow-rm-trip-card lg:row-span-2">
              <img src="/landing/img/screenshot-inbox.svg" alt="ReplyMate shared inbox with AI replies" className="w-full rounded-xl border border-gray-100" />
            </figure>
            <figure className="rounded-2xl border border-gray-200 bg-white p-4 shadow-rm-trip-card">
              <img src="/landing/img/screenshot-analytics.svg" alt="ReplyMate analytics dashboard" className="w-full rounded-xl border border-gray-100" />
            </figure>
            <figure className="rounded-2xl border border-gray-200 bg-white p-4 shadow-rm-trip-card">
              <img src="/landing/img/screenshot-builder.svg" alt="ReplyMate workflow builder" className="w-full rounded-xl border border-gray-100" />
            </figure>
          </div>
        </section>

        <section id="how" className="bg-white py-16">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-rm-trip-brand">Workflow</p>
            <h2 className="mt-3 font-rm-trip-heading text-3xl font-bold sm:text-4xl">Go live with a smarter chatbot in three steps</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {workflowSteps.map((step, index) => (
                <article key={step.title} className="rounded-2xl border border-gray-200 bg-rm-trip-surface p-6 shadow-rm-trip-card">
                  <p className="text-3xl font-bold text-rm-trip-brand">{`0${index + 1}`}</p>
                  <h3 className="mt-3 font-rm-trip-heading text-xl font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-rm-trip-text-muted">{step.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-rm-trip-brand">Features</p>
            <h2 className="mt-3 font-rm-trip-heading text-3xl font-bold sm:text-4xl">Everything a customer-facing chatbot needs</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-rm-trip-card">
              <div className="inline-flex rounded-xl bg-blue-50 p-2 text-rm-trip-brand"><MessageCircle className="h-5 w-5" /></div>
              <p className="mt-4 text-xl font-bold">Instant answer engine</p>
              <ul className="mt-4 space-y-2 text-sm text-rm-trip-text-muted">
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-rm-trip-brand" />Answers from approved knowledge</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-rm-trip-brand" />Source-aware responses</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-rm-trip-brand" />Human handoff when needed</li>
              </ul>
            </article>

            <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-rm-trip-card">
              <div className="inline-flex rounded-xl bg-teal-50 p-2 text-rm-trip-accent"><Funnel className="h-5 w-5" /></div>
              <p className="mt-4 text-xl font-bold">Lead qualification</p>
              <ul className="mt-4 space-y-2 text-sm text-rm-trip-text-muted">
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-rm-trip-accent" />Custom discovery flows</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-rm-trip-accent" />Deal notes and tags</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-rm-trip-accent" />Calendar and CRM sync</li>
              </ul>
            </article>

            <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-rm-trip-card">
              <p className="text-xl font-bold">Platform essentials</p>
              <ul className="mt-4 space-y-3 text-sm text-rm-trip-text-muted">
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-rm-trip-brand" />Role-based access</li>
                <li className="flex items-center gap-2"><Languages className="h-4 w-4 text-rm-trip-brand" />Multilingual replies</li>
                <li className="flex items-center gap-2"><Activity className="h-4 w-4 text-rm-trip-brand" />Conversation analytics</li>
                <li className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-rm-trip-brand" />Conditional workflows</li>
                <li className="flex items-center gap-2"><Lock className="h-4 w-4 text-rm-trip-brand" />Secure data controls</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-rm-trip-brand">Command center</p>
              <h2 className="mt-3 font-rm-trip-heading text-3xl font-bold sm:text-4xl">Control the whole customer journey from one place</h2>
              <p className="mt-4 text-sm leading-6 text-rm-trip-text-muted">
                Train the AI, approve sensitive answers, watch live conversations, and measure support impact without switching tools.
              </p>
              <div className="mt-5 space-y-3 text-sm">
                <p className="inline-flex items-center gap-2"><WandSparkles className="h-4 w-4 text-rm-trip-brand" />AI answer drafts with source context</p>
                <p className="inline-flex items-center gap-2"><GitBranch className="h-4 w-4 text-rm-trip-brand" />Smart routing by intent and plan</p>
                <p className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-rm-trip-brand" />Approval rules for sensitive replies</p>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-rm-trip-surface p-5 shadow-rm-trip-card">
              <div className="mb-3 flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3"><span className="text-xs font-semibold text-rm-trip-text-muted">Live operations</span><strong className="text-sm">Healthy</strong></div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Unanswered questions</span><strong>12</strong></div>
                <div className="flex justify-between"><span>Qualified leads waiting</span><strong>31</strong></div>
                <div className="flex justify-between"><span>Human handoffs</span><strong>8</strong></div>
              </div>
            </div>
          </div>
        </section>

        <section id="testimonials" className="py-16">
          <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-rm-trip-brand">Customers</p>
              <h2 className="mt-3 font-rm-trip-heading text-3xl font-bold sm:text-4xl">Support teams get speed without losing control</h2>
              <div className="mt-6 grid gap-4">
                <figure className="rounded-2xl border border-gray-200 bg-white p-4 shadow-rm-trip-card">
                  <blockquote className="text-sm leading-6 text-rm-trip-text-muted">ReplyMate cut repetitive tickets in half and still gives our agents clean context when a human needs to step in.</blockquote>
                  <p className="mt-3 text-sm font-bold">Maya Chen, Support Lead</p>
                </figure>
                <figure className="rounded-2xl border border-gray-200 bg-white p-4 shadow-rm-trip-card">
                  <blockquote className="text-sm leading-6 text-rm-trip-text-muted">Lead routing surprised us. Demo requests land in HubSpot with the whole conversation attached.</blockquote>
                  <p className="mt-3 text-sm font-bold">Eli Novak, Growth Manager</p>
                </figure>
              </div>
            </div>
            <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-rm-trip-card">
              <div className="space-y-3">
                <div className="rounded-xl border border-gray-200 bg-rm-trip-surface p-3"><p className="text-xs font-semibold text-rm-trip-text-muted">Conversations handled</p><p className="text-xl font-bold">42,891</p></div>
                <div className="rounded-xl border border-gray-200 bg-rm-trip-surface p-3"><p className="text-xs font-semibold text-rm-trip-text-muted">Average first reply</p><p className="text-xl font-bold">3.2 sec</p></div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3"><p className="text-xs font-semibold text-blue-700">Qualified leads</p><p className="text-xl font-bold text-blue-900">1,248</p></div>
              </div>
            </aside>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
            <article className="rounded-2xl border border-gray-200 bg-rm-trip-surface p-5">
              <Lock className="h-5 w-5 text-rm-trip-brand" />
              <p className="mt-3 text-sm font-bold">Access control</p>
              <p className="mt-1 text-xs leading-5 text-rm-trip-text-muted">Role-based permissions for agents, admins, and reviewers.</p>
            </article>
            <article className="rounded-2xl border border-gray-200 bg-rm-trip-surface p-5">
              <FileText className="h-5 w-5 text-rm-trip-brand" />
              <p className="mt-3 text-sm font-bold">Source limits</p>
              <p className="mt-1 text-xs leading-5 text-rm-trip-text-muted">Answer only from approved docs, pages, and policies.</p>
            </article>
            <article className="rounded-2xl border border-gray-200 bg-rm-trip-surface p-5">
              <BarChart3 className="h-5 w-5 text-rm-trip-brand" />
              <p className="mt-3 text-sm font-bold">Audit history</p>
              <p className="mt-1 text-xs leading-5 text-rm-trip-text-muted">Track edits, escalations, training changes, and outcomes.</p>
            </article>
          </div>
        </section>

        <section id="pricing" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-rm-trip-brand">Pricing</p>
            <h2 className="mt-3 font-rm-trip-heading text-3xl font-bold sm:text-4xl">Start lean, scale as conversations grow</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {pricingPlans.map((plan) => (
              <article
                key={plan.name}
                className={plan.highlighted
                  ? "rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-rm-trip-card"
                  : "rounded-2xl border border-gray-200 bg-white p-6 shadow-rm-trip-card"}
              >
                <p className={plan.highlighted ? "text-sm font-bold text-blue-700" : "text-sm font-bold text-rm-trip-text-muted"}>{plan.name}</p>
                <p className={plan.highlighted ? "mt-2 text-4xl font-bold text-blue-900" : "mt-2 text-4xl font-bold"}>{plan.price}</p>
                <p className={plan.highlighted ? "mt-1 text-sm text-blue-800/80" : "mt-1 text-sm text-rm-trip-text-muted"}>{plan.subtitle}</p>
                <ul className={plan.highlighted ? "mt-5 space-y-2 text-sm text-blue-900/80" : "mt-5 space-y-2 text-sm text-rm-trip-text-muted"}>
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className={plan.highlighted ? "h-4 w-4 text-blue-700" : "h-4 w-4 text-rm-trip-brand"} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-rm-trip-card"><Clock3 className="h-5 w-5 text-rm-trip-brand" /><p className="mt-3 text-sm font-bold">Always available</p><p className="mt-1 text-xs leading-5 text-rm-trip-text-muted">Help visitors across every time zone.</p></article>
            <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-rm-trip-card"><FileText className="h-5 w-5 text-rm-trip-brand" /><p className="mt-3 text-sm font-bold">Knowledge grounded</p><p className="mt-1 text-xs leading-5 text-rm-trip-text-muted">Keep answers aligned with your docs.</p></article>
            <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-rm-trip-card"><Users className="h-5 w-5 text-rm-trip-brand" /><p className="mt-3 text-sm font-bold">Team handoff</p><p className="mt-1 text-xs leading-5 text-rm-trip-text-muted">Route complex chats with context.</p></article>
            <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-rm-trip-card"><BarChart3 className="h-5 w-5 text-rm-trip-brand" /><p className="mt-3 text-sm font-bold">Actionable trends</p><p className="mt-1 text-xs leading-5 text-rm-trip-text-muted">See topics driving conversion.</p></article>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-rm-trip-brand">FAQ</p>
            <h2 className="mt-3 font-rm-trip-heading text-3xl font-bold sm:text-4xl">Questions before launch</h2>
            <div className="mt-6 grid gap-3">
              {faqs.map((item) => (
                <details key={item.q} className="rounded-xl border border-gray-200 bg-rm-trip-surface p-4">
                  <summary className="cursor-pointer text-sm font-bold">{item.q}</summary>
                  <p className="mt-2 text-sm leading-6 text-rm-trip-text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="cta" className="pb-16">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-rm-trip-lift lg:grid-cols-[1.4fr_1fr] lg:p-8">
              <div>
                <h2 className="font-rm-trip-heading text-3xl font-bold">See your chatbot on your site</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-rm-trip-text-muted">
                  Share your website and we will show how ReplyMate can answer common questions, qualify leads, and route conversations.
                </p>

                <form className="mt-6 grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
                  <label className="text-sm font-semibold text-rm-trip-text">
                    Full name
                    <input type="text" value={form.fullName} onChange={(e) => updateField("fullName", e.target.value)} placeholder="Alex Morgan" className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus-rm-trip-highlight" />
                  </label>
                  <label className="text-sm font-semibold text-rm-trip-text">
                    Work email
                    <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="alex@company.com" className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus-rm-trip-highlight" />
                  </label>
                  <label className="text-sm font-semibold text-rm-trip-text">
                    Website
                    <input type="url" value={form.website} onChange={(e) => updateField("website", e.target.value)} placeholder="https://company.com" className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus-rm-trip-highlight" />
                  </label>
                  <label className="text-sm font-semibold text-rm-trip-text">
                    Main goal
                    <select value={form.goal} onChange={(e) => updateField("goal", e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus-rm-trip-highlight">
                      <option value="">Choose one option</option>
                      {goalOptions.map((goal) => (
                        <option key={goal.value} value={goal.value}>{goal.label}</option>
                      ))}
                    </select>
                  </label>

                  <div className="sm:col-span-2">
                    <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rm-trip-brand px-5 py-3 text-sm font-bold text-white hover:bg-rm-trip-brand-dark disabled:opacity-70">
                      {submitting ? "Submitting..." : "Request demo"}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </form>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Link to="/login" className="text-sm font-semibold text-rm-trip-brand hover:underline">Already have an account? Sign in</Link>
                  <Link to="/signup" className="text-sm font-semibold text-rm-trip-text-muted hover:text-rm-trip-text">Create account</Link>
                </div>

                {error && <p className="mt-3 text-sm font-semibold text-rm-trip-state-error">{error}</p>}
                {success && <p className="mt-3 text-sm font-semibold text-rm-trip-success">{success}</p>}
              </div>

              <div className="rounded-2xl border border-gray-200 bg-rm-trip-surface p-4">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-rm-trip-text-muted">Demo preview</p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                    <p className="text-xs font-semibold text-rm-trip-text-muted">New visitor</p>
                    <p className="mt-1 text-sm">{form.website.trim() ? `Can ${form.website.trim()} reduce repetitive support questions?` : "What plan is best for a 12-person support team?"}</p>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                    <p className="text-xs font-semibold text-blue-700">Suggested next action</p>
                    <p className="mt-1 text-sm font-bold text-blue-900">{selectedGoalLabel}</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                    <p className="inline-flex items-center gap-2 text-xs font-semibold text-rm-trip-text-muted">
                      <ShieldCheck className="h-4 w-4 text-rm-trip-brand" />
                      Secure handoff and audit-ready workflows
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rm-trip-brand text-sm font-bold text-white">R</span>
              <span className="font-rm-trip-heading text-lg font-bold">ReplyMate</span>
            </div>
            <p className="mt-4 text-sm text-rm-trip-text-muted">AI chat support for modern teams.</p>
          </div>
          <div>
            <p className="text-sm font-bold">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-rm-trip-text-muted">
              <li><a href="#features" className="hover:text-rm-trip-text">Features</a></li>
              <li><a href="#pricing" className="hover:text-rm-trip-text">Pricing</a></li>
              <li><a href="#cta" className="hover:text-rm-trip-text">Book demo</a></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold">Resources</p>
            <ul className="mt-3 space-y-2 text-sm text-rm-trip-text-muted">
              <li className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />24/7 automation</li>
              <li className="inline-flex items-center gap-2"><Bot className="h-4 w-4" />AI answer engine</li>
              <li className="inline-flex items-center gap-2"><Users className="h-4 w-4" />Human handoff</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold">Trust</p>
            <ul className="mt-3 space-y-2 text-sm text-rm-trip-text-muted">
              <li className="inline-flex items-center gap-2"><Lock className="h-4 w-4" />Secure data controls</li>
              <li className="inline-flex items-center gap-2"><FileText className="h-4 w-4" />Source restrictions</li>
              <li className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Audit-friendly workflows</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
