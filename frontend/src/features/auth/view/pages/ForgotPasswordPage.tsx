import { type FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { createAuthService } from "../../model/services/createAuthService";
import { AuthBrandHeader } from "../components/AuthBrandHeader";
import { AuthSurface } from "../components/AuthSurface";

export function ForgotPasswordPage() {
  const authService = useMemo(() => createAuthService(), []);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!normalizedEmail) return;

    setSubmitting(true);
    setError(null);

    try {
      await authService.forgotPassword(normalizedEmail);
      setSent(true);
    } catch (requestError: unknown) {
      setError(
        (requestError as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ?? "Could not send reset instructions.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthSurface>
        <div className="flex min-h-dvh w-full flex-col justify-center bg-white px-5 py-8 sm:min-h-0 sm:max-w-md sm:rounded-rm-trip-smooth sm:border sm:border-white/80 sm:bg-white/95 sm:p-9 sm:shadow-[0_24px_70px_rgba(15,23,42,0.16)] sm:backdrop-blur">
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-rm-trip-smooth bg-blue-50">
              <CheckCircle2 className="h-8 w-8 text-rm-trip-brand" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="font-rm-trip-heading text-2xl font-bold text-rm-trip-text">Check your email</h1>
            <p className="mt-2 text-sm font-medium leading-relaxed text-rm-trip-text-muted">
              If an account exists for <strong className="text-rm-trip-text">{email}</strong>, a password reset link
              will be sent there.
            </p>
          </div>
          <Link
            to="/login"
            className="mt-7 inline-flex w-full items-center justify-center rounded-rm-trip-smooth bg-rm-trip-brand px-4 py-3 text-sm font-bold text-white shadow-rm-trip-glow transition-all hover:bg-rm-trip-brand-dark"
          >
            Back to Sign In
          </Link>
        </div>
      </AuthSurface>
    );
  }

  return (
    <AuthSurface>
      <div className="flex min-h-dvh w-full flex-col justify-center bg-white px-5 py-8 sm:min-h-0 sm:max-w-md sm:rounded-rm-trip-smooth sm:border sm:border-white/80 sm:bg-white/95 sm:p-9 sm:shadow-[0_24px_70px_rgba(15,23,42,0.16)] sm:backdrop-blur">
        <AuthBrandHeader title="Reset your password" subtitle="Enter your email and we will send reset instructions." />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="forgot-email" className="mb-2 block text-sm font-bold text-rm-trip-text">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-rm-trip-text-muted" />
              <input
                id="forgot-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="w-full rounded-rm-trip-smooth border border-gray-200 bg-gray-50 px-4 py-3 pl-11 text-sm text-rm-trip-text outline-none transition-all placeholder:text-gray-400 focus-rm-trip-highlight focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!email.trim() || submitting}
            className="flex w-full items-center justify-center rounded-rm-trip-smooth bg-rm-trip-brand px-4 py-3 text-sm font-bold text-white shadow-rm-trip-glow transition-all hover:bg-rm-trip-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? "Sending..." : "Send Reset Link"}
          </button>

          {error && <p className="text-sm font-semibold text-rm-trip-error">{error}</p>}

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 pt-2 text-sm font-semibold text-rm-trip-text-muted hover:text-rm-trip-brand"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </form>
      </div>
    </AuthSurface>
  );
}

export default ForgotPasswordPage;
