import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Lock } from "lucide-react";
import { AuthBrandHeader } from "../components/AuthBrandHeader";
import { AuthSurface } from "../components/AuthSurface";

export function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = password.length >= 6 && passwordsMatch;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <AuthSurface>
        <div className="flex min-h-dvh w-full flex-col justify-center bg-white px-5 py-8 sm:min-h-0 sm:max-w-md sm:rounded-rm-trip-smooth sm:border sm:border-white/80 sm:bg-white/95 sm:p-9 sm:shadow-[0_24px_70px_rgba(15,23,42,0.16)] sm:backdrop-blur">
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-rm-trip-smooth bg-emerald-50">
              <CheckCircle2 className="h-8 w-8 text-rm-trip-success" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="font-rm-trip-heading text-2xl font-bold text-rm-trip-text">Password updated</h1>
            <p className="mt-2 text-sm font-medium leading-relaxed text-rm-trip-text-muted">
              Your password has been changed. You can now sign in with your new password.
            </p>
          </div>
          <Link
            to="/login"
            className="mt-7 inline-flex w-full items-center justify-center rounded-rm-trip-smooth bg-rm-trip-brand px-4 py-3 text-sm font-bold text-white shadow-rm-trip-glow transition-all hover:bg-rm-trip-brand-dark"
          >
            Sign In
          </Link>
        </div>
      </AuthSurface>
    );
  }

  return (
    <AuthSurface>
      <div className="flex min-h-dvh w-full flex-col justify-center bg-white px-5 py-8 sm:min-h-0 sm:max-w-md sm:rounded-rm-trip-smooth sm:border sm:border-white/80 sm:bg-white/95 sm:p-9 sm:shadow-[0_24px_70px_rgba(15,23,42,0.16)] sm:backdrop-blur">
        <AuthBrandHeader title="Create a new password" subtitle="Use a strong password to protect your workspace." />

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            id="new-password"
            label="New Password"
            placeholder="Min. 6 characters"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <PasswordField
            id="confirm-password"
            label="Confirm Password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />

          {confirmPassword && !passwordsMatch && (
            <p className="text-xs font-medium text-rm-trip-error">Passwords do not match.</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex w-full items-center justify-center rounded-rm-trip-smooth bg-rm-trip-brand px-4 py-3 text-sm font-bold text-white shadow-rm-trip-glow transition-all hover:bg-rm-trip-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            Update Password
          </button>
        </form>
      </div>
    </AuthSurface>
  );
}

function PasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange(value: string): void;
  autoComplete: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-rm-trip-text">
        {label}
      </label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-rm-trip-text-muted" />
        <input
          id={id}
          type="password"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="w-full rounded-rm-trip-smooth border border-gray-200 bg-gray-50 px-4 py-3 pl-11 text-sm text-rm-trip-text outline-none transition-all placeholder:text-gray-400 focus-rm-trip-highlight focus:bg-white"
        />
      </div>
    </div>
  );
}

export default ResetPasswordPage;
