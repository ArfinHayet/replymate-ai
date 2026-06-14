import { Link } from "react-router-dom";
import { LandingFooter, LandingHeader } from "@/features/landing/view/components";
import { CONTACT_EMAIL, sectionTitle, shell } from "@/features/landing/view/components/landingContent";
import { isLoggedIn } from "@/lib/auth";
import { cn } from "@/lib/utils";

type LegalSection = {
  body: string[];
  title: string;
};

type LegalPageContent = {
  intro: string;
  sections: LegalSection[];
  title: string;
};

const termsContent: LegalPageContent = {
  title: "Terms of Service",
  intro:
    "These Terms of Service govern your access to and use of SupportMate, including our website, dashboard, chat tools, and related services.",
  sections: [
    {
      title: "Using SupportMate",
      body: [
        "You may use SupportMate only for lawful business purposes and in accordance with these terms.",
        "You are responsible for the content, documents, websites, images, prompts, and account information you provide to the service.",
      ],
    },
    {
      title: "Accounts and Security",
      body: [
        "You are responsible for maintaining the confidentiality of your account credentials and for activity under your account.",
        "Please contact us promptly if you believe your account or workspace has been accessed without authorization.",
      ],
    },
    {
      title: "Subscriptions and Billing",
      body: [
        "Paid plans are billed according to the plan selected at checkout. Plan limits and pricing are shown before purchase.",
        "Subscription changes, cancellations, and payment confirmations may be handled through our billing provider and your SupportMate dashboard.",
      ],
    },
    {
      title: "Acceptable Use",
      body: [
        "Do not use SupportMate to upload unlawful content, infringe intellectual property rights, distribute malware, or attempt to disrupt the service.",
        "We may suspend access when needed to protect the service, our customers, or other users.",
      ],
    },
    {
      title: "Service Availability",
      body: [
        "We work to keep SupportMate reliable, but we do not guarantee uninterrupted availability or error-free operation.",
        "Features may change as we improve the product, and we will make reasonable efforts to avoid material disruption.",
      ],
    },
    {
      title: "Contact",
      body: [`Questions about these terms can be sent to ${CONTACT_EMAIL}.`],
    },
  ],
};

const privacyContent: LegalPageContent = {
  title: "Privacy Policy",
  intro:
    "This Privacy Policy explains how SupportMate collects, uses, and protects information when you use our website, dashboard, and services.",
  sections: [
    {
      title: "Information We Collect",
      body: [
        "We collect account details such as name, email address, authentication information, and workspace settings.",
        "We also process content you upload or connect, including documents, web pages, images, company profile details, chat messages, and usage records.",
      ],
    },
    {
      title: "How We Use Information",
      body: [
        "We use information to provide the service, answer from your approved knowledge sources, maintain your account, process billing, improve reliability, and respond to support requests.",
        "We may use aggregated or de-identified information to understand product performance and improve SupportMate.",
      ],
    },
    {
      title: "Payments",
      body: [
        "Payment details are processed by our payment provider. SupportMate receives billing-related records needed to activate plans, confirm transactions, and manage subscriptions.",
      ],
    },
    {
      title: "Sharing Information",
      body: [
        "We share information with service providers only as needed to operate SupportMate, such as hosting, authentication, analytics, email, and payment processing.",
        "We may disclose information if required by law or to protect the rights, safety, and security of SupportMate, our customers, or others.",
      ],
    },
    {
      title: "Data Retention and Security",
      body: [
        "We retain information for as long as needed to provide the service, comply with legal obligations, resolve disputes, and enforce agreements.",
        "We use reasonable technical and organizational measures to protect information, but no online service can be guaranteed to be completely secure.",
      ],
    },
    {
      title: "Your Choices",
      body: [
        "You may update account details in the dashboard and contact us to request help with access, correction, deletion, or privacy questions.",
      ],
    },
    {
      title: "Contact",
      body: [`Privacy questions can be sent to ${CONTACT_EMAIL}.`],
    },
  ],
};

export function TermsOfServicePage() {
  return <LegalPage content={termsContent} />;
}

export function PrivacyPolicyPage() {
  return <LegalPage content={privacyContent} />;
}

function LegalPage({ content }: { content: LegalPageContent }) {
  const isAuthenticated = isLoggedIn();

  return (
    <div className="min-h-screen bg-[var(--rm-trip-surface)] font-[var(--rm-trip-font-body)] text-[var(--rm-trip-text)] antialiased">
      <LandingHeader isAuthenticated={isAuthenticated} />
      <main className={cn(shell, "px-7 py-16 max-[700px]:px-4 max-[700px]:py-10")}>
        <div className="max-w-[820px]">
          <Link
            to="/"
            className="text-[13px] font-semibold text-[var(--rm-trip-brand)] no-underline hover:underline"
          >
            Back to home
          </Link>
          <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--rm-trip-brand)]">
            Legal
          </p>
          <h1 className={cn(sectionTitle, "mt-2")}>{content.title}</h1>
          <p className="mt-4 text-base font-light leading-[1.75] text-[var(--rm-trip-text-muted)]">
            {content.intro}
          </p>
          <p className="mt-3 text-sm font-medium text-[var(--rm-trip-text-muted)]">Last updated: June 14, 2026</p>
        </div>

        <div className="mt-10 grid max-w-[900px] gap-4">
          {content.sections.map((legalSection) => (
            <section
              key={legalSection.title}
              className="rounded-[calc(var(--rm-trip-smooth)+6px)] border border-[rgba(15,23,42,0.10)] bg-white p-6 shadow-[var(--rm-trip-card-shadow)]"
            >
              <h2 className="font-[var(--rm-trip-font-heading)] text-xl font-bold text-[var(--rm-trip-text)]">
                {legalSection.title}
              </h2>
              <div className="mt-3 grid gap-3 text-sm font-light leading-[1.75] text-[var(--rm-trip-text-muted)]">
                {legalSection.body.map((paragraph) => (
                  <p key={paragraph}>{renderParagraph(paragraph)}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}

function renderParagraph(paragraph: string) {
  if (!paragraph.includes(CONTACT_EMAIL)) return paragraph;

  const [before, after] = paragraph.split(CONTACT_EMAIL);
  return (
    <>
      {before}
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="font-semibold text-[var(--rm-trip-brand)] no-underline hover:underline"
      >
        {CONTACT_EMAIL}
      </a>
      {after}
    </>
  );
}
