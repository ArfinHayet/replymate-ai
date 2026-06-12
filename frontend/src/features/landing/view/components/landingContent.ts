import type { FormEvent } from "react";

export type ContactFormState = { name: string; email: string; subject: string; message: string };

export type ContactFormProps = {
  error: string | null;
  form: ContactFormState;
  isAuthenticated: boolean;
  messagePreview: string;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  set: <K extends keyof ContactFormState>(k: K, v: ContactFormState[K]) => void;
  submitting: boolean;
  success: string | null;
};

export const CONTACT_EMAIL = "info@supportmate.online";
export const DASHBOARD_PATH = "/chat";

export const workflowSteps = [
  {
    title: "Add business knowledge",
    desc: "Upload PDFs, markdown files, web pages, and images so answers are grounded in approved sources.",
  },
  {
    title: "Configure your workspace",
    desc: "Set company profile context, review content sources, and prepare widget keys and allowed domains.",
  },
  {
    title: "Deploy and improve",
    desc: "Embed the widget or share a public chat URL, then monitor analytics and chat history to keep improving.",
  },
];

export const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    subtitle: "per month - for getting started.",
    features: [
      { label: "10 documents", included: true },
      { label: "1 website", included: true },
      { label: "10 photos", included: true },
      { label: "100 messages", included: true },
      { label: "Chatbot customization", included: false },
      { label: "Priority support", included: false },
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$20 USD",
    subtitle: "per month - for growing teams.",
    features: [
      { label: "100 document uploads", included: true },
      { label: "10 websites", included: true },
      { label: "200 photos", included: true },
      { label: "Unlimited chatting", included: true },
      { label: "Chatbot customization", included: true },
      { label: "Priority support", included: true },
    ],
    highlighted: true,
  },
];

export const faqs = [
  {
    q: "How fast can we launch?",
    a: "Most teams can upload content, generate a widget key, and embed SupportMate on their site in a single afternoon.",
  },
  {
    q: "What content can we train it with?",
    a: "SupportMate supports PDFs, markdown files, website URLs, and images so your assistant can answer from your own material.",
  },
  {
    q: "Can we control where the widget runs?",
    a: "Yes. You can manage widget keys and set allowed domains so only approved origins can load your assistant.",
  },
  {
    q: "How do we improve response quality over time?",
    a: "Use chat history and analytics to review conversations, add missing sources, and refresh indexed web pages.",
  },
];

export const shell = "mx-auto max-w-[1180px]";
export const section = `${shell} px-7 py-20`;
export const sectionWhite = "border-y border-[rgba(15,23,42,0.10)] bg-white";
export const eyebrow = "mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--rm-trip-brand)]";
export const sectionTitle =
  "font-[var(--rm-trip-font-heading)] text-[clamp(28px,3.5vw,40px)] font-extrabold leading-[1.1] text-[var(--rm-trip-text)]";
export const sectionSub =
  "mt-3 max-w-[540px] text-base font-light leading-[1.68] text-[var(--rm-trip-text-muted)]";
export const card =
  "rounded-[calc(var(--rm-trip-smooth)+6px)] border border-[rgba(15,23,42,0.10)] bg-white shadow-[var(--rm-trip-card-shadow)]";
export const hoverCard = "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--rm-trip-lift-shadow)]";
export const logoClasses = "flex min-w-0 shrink-0 items-center gap-[9px] no-underline";
export const logoMarkClasses =
  "block h-[34px] w-[34px] rounded-[10px] object-contain shadow-[var(--rm-trip-glow-shadow)]";
export const logoNameClasses =
  "whitespace-nowrap font-[var(--rm-trip-font-heading)] text-lg font-bold text-[var(--rm-trip-text)]";
