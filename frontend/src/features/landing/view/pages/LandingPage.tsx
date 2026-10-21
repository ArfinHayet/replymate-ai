import { type FormEvent, useMemo, useState } from "react";
import axios from "axios";
import { isLoggedIn } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api";
import { apiRoutes } from "@/lib/apiRoutes";
import { useTurnstile } from "@/lib/turnstile";
import {
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
  ScreenshotsSection,
  TrustSection,
  WorkflowSection,
} from "../components";

export function LandingPage() {
  const [form, setForm] = useState<ContactFormState>({ name: "", email: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isAuthenticated = isLoggedIn();
  const turnstile = useTurnstile();

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
    if (submitting) return;
    setError(null);
    setSuccess(null);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject.trim(),
      message: form.message.trim(),
    };
    if (!payload.name || !payload.email || !payload.message) {
      setError("Please fill in your name, email, and message.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (payload.name.length > 120 || payload.email.length > 254 ||
        payload.subject.length > 200 || payload.message.length > 5000) {
      setError("Please shorten the fields to their allowed lengths.");
      return;
    }

    const turnstileToken = turnstile.consumeToken();
    if (!turnstileToken) {
      setError("Please complete the security check.");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post<{ id: string; createdAt: string }>(
        apiRoutes.contactMessages.create,
        { ...payload, turnstileToken },
        { baseURL: API_BASE_URL, timeout: 20000 },
      );
      setForm({ name: "", email: "", subject: "", message: "" });
      setSuccess(`Thanks ${payload.name.split(/\s+/)[0]}. Your message has been sent. We will get back to you by email.`);
    } catch (reason: unknown) {
      let message = "Could not send your message. Please try again.";
      if (axios.isAxiosError<{ message?: string | string[] }>(reason) &&
          (reason.response?.status === 400 || reason.response?.status === 503)) {
        const serverMessage = reason.response.data?.message;
        if (Array.isArray(serverMessage)) message = serverMessage.join(" ");
        else if (typeof serverMessage === "string" && serverMessage) message = serverMessage;
      }
      setError(message);
    } finally {
      setSubmitting(false);
      turnstile.reset();
    }
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
        <TrustSection />
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
          turnstile={turnstile}
        />
      </main>
      <LandingFooter />
    </div>
  );
}
