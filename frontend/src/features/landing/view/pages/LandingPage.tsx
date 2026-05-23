import { type FormEvent, useMemo, useState } from "react";
import { isLoggedIn } from "@/lib/auth";
import {
  CONTACT_EMAIL,
  type ContactFormState,
  CommandCenterSection,
  ContactSection,
  FaqSection,
  FeaturesSection,
  HeroSection,
  IntegrationsBar,
  LandingFooter,
  LandingHeader,
  MetricsStrip,
  PricingSection,
  ScreenshotsSection,
  TestimonialsSection,
  TrustSection,
  WorkflowSection,
} from "../components";

export function LandingPage() {
  const [form, setForm] = useState<ContactFormState>({ name: "", email: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isAuthenticated = isLoggedIn();

  const messagePreview = useMemo(() => {
    const content = form.message.trim();
    if (!content) return "Tell us what you need help with and we will respond by email.";
    return content.length > 180 ? `${content.slice(0, 177)}...` : content;
  }, [form.message]);

  function set<K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
    setSuccess(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      return setError("Please fill in your name, email, and message.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return setError("Please enter a valid email address.");
    }

    const subject = form.subject.trim() || "New contact request from SupportMate landing page";
    const body = [`Name: ${form.name.trim()}`, `Email: ${form.email.trim()}`, "", form.message.trim()].join("\n");

    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSuccess(`Thanks ${form.name.split(" ")[0] || "there"}. Your contact request is ready to send.`);
    setSubmitting(false);
    setForm({ name: "", email: "", subject: "", message: "" });
  }

  return (
    <div className="bg-[var(--rm-trip-surface)] font-[var(--rm-trip-font-body)] text-[var(--rm-trip-text)] antialiased">
      <LandingHeader isAuthenticated={isAuthenticated} />
      <main>
        <HeroSection />
        <MetricsStrip />
        <IntegrationsBar />
        <ScreenshotsSection />
        <WorkflowSection />
        <FeaturesSection />
        <CommandCenterSection />
        <TestimonialsSection />
        <TrustSection />
        <PricingSection />
        <FaqSection />
        <ContactSection
          error={error}
          form={form}
          isAuthenticated={isAuthenticated}
          messagePreview={messagePreview}
          onSubmit={onSubmit}
          set={set}
          submitting={submitting}
          success={success}
        />
      </main>
      <LandingFooter />
    </div>
  );
}
