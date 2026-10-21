import type { FormEvent } from "react";
import type { TurnstileControl } from "@/lib/turnstile";

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
  turnstile: TurnstileControl;
};

export const CONTACT_EMAIL = "arfinhayet786@gmail.com";
export const DASHBOARD_PATH = "/chat";

export const workflowSteps = [
  {
    title: "Upload your content",
    desc: "Upload documents, spreadsheets, and images to give your chatbot the knowledge it needs.",
    label: "Upload",
    note: "Your uploaded content becomes your chatbot’s knowledge base.",
    img: "/landing/screenshot-upload.png",
    alt: "SupportMate AI Add Content page showing the PDF upload area",
    imageClass: "w-full",
  },
  {
    title: "Copy the embed script and paste in your website",
    desc: "Copy the generated embed script and paste it into your website to add your chatbot.",
    label: "Embed",
    note: "Create a widget key and allow your website domain before embedding.",
    img: "/landing/screenshot-embed.png",
    alt: "SupportMate AI Website Widget page showing the embed script and allowed domains",
    imageClass: "w-full",
  },
  {
    title: "Get your own support chatbot",
    desc: "Let visitors ask questions and receive answers based on your uploaded content.",
    label: "Chatbot",
    note: "Your support chatbot is ready to help visitors on your website.",
    img: "/landing/screenshot-chatbot.png",
    alt: "SupportMate AI support chatbot with its message input",
    imageClass: "max-h-[520px] w-auto",
  },
];

export const faqs = [
  {
    q: "How fast can we launch?",
    a: "Most teams can upload content, generate a widget key, and embed SupportMate on their site in a single afternoon.",
  },
  {
    q: "What content can we train it with?",
    a: "SupportMate supports PDFs, markdown files, and images so your assistant can answer from your own material.",
  },
  {
    q: "Can we control where the widget runs?",
    a: "Yes. You can manage widget keys and set allowed domains so only approved origins can load your assistant.",
  },
  {
    q: "How do we improve response quality over time?",
    a: "Use chat history and analytics to review conversations and add missing sources.",
  },
  {
    q: "Which AI models power the chatbot responses?",
    a: "SupportMate is powered by leading industry models, including Google Gemini 2.5, OpenAI GPT-4, and Anthropic Claude, to deliver accurate, context-aware support responses based on your grounded business knowledge.",
  },
];

export const shell = "mx-auto max-w-[1180px]";
export const section = `${shell} px-7 py-[var(--space-section)]`;
export const sectionWhite = "border-y border-gray-200 bg-rm-trip-surface-card";
export const eyebrow = "mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--rm-trip-brand)]";
export const sectionTitle =
  "font-[var(--rm-trip-font-heading)] text-[clamp(28px,3.5vw,40px)] font-extrabold leading-[1.1] text-[var(--rm-trip-text)]";
export const sectionSub =
  "mt-3 max-w-[540px] text-base font-light leading-[1.68] text-[var(--rm-trip-text-muted)]";
export const card = "rounded-rm-trip-smooth border border-gray-200 bg-white shadow-rm-trip-card";
export const hoverCard = "transition-shadow duration-200 hover:shadow-rm-trip-lift";
export const logoClasses = "flex min-w-0 shrink-0 items-center gap-[9px] no-underline";
export const logoMarkClasses =
  "block h-[34px] w-[34px] rounded-rm-trip-smooth object-contain shadow-[var(--rm-trip-glow-shadow)]";
export const logoNameClasses =
  "whitespace-nowrap font-[var(--rm-trip-font-heading)] text-lg font-bold text-[var(--rm-trip-text)]";
