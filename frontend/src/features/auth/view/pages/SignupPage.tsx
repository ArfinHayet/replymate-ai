import { type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSignupViewModel } from "../../viewModel/useSignupViewModel";
import { AuthBrandHeader } from "../components/AuthBrandHeader";
import { AuthDivider } from "../components/AuthDivider";
import { AuthSurface } from "../components/AuthSurface";
import { GoogleSignInButton } from "../components/GoogleSignInButton";

export function SignupPage() {
  const viewModel = useSignupViewModel();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await viewModel.submitSignup();
    if (result.errorMessage) {
      toast.error(result.errorMessage);
    }
  };

  const handleGoogleSignIn = async () => {
    const result = await viewModel.signInWithGoogle(window.location.origin);
    if (result.errorMessage) {
      toast.error(result.errorMessage);
    }
  };

  if (viewModel.done) {
    return (
      <AuthSurface>
        <div className="flex min-h-dvh w-full flex-col justify-center bg-white px-5 py-8 text-center sm:min-h-0 sm:max-w-md sm:rounded-rm-trip-smooth sm:border sm:border-white/80 sm:bg-white/95 sm:p-9 sm:shadow-[0_24px_70px_rgba(15,23,42,0.16)] sm:backdrop-blur">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-rm-trip-smooth bg-emerald-50">
              <CheckCircle2 className="h-8 w-8 text-rm-trip-success" />
            </div>
          </div>
          <h1 className="font-rm-trip-heading text-2xl font-bold text-rm-trip-text">Check your email</h1>
          <p className="mt-2 text-sm font-medium leading-relaxed text-rm-trip-text-muted">
            We sent a confirmation link to <strong className="text-rm-trip-text">{viewModel.email}</strong>. Click it
            to verify your account before signing in.
          </p>
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
        <AuthBrandHeader title="Create your SupportMate AI account" subtitle="Set up your business assistant workspace." />

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-bold text-rm-trip-text">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={viewModel.email}
              onChange={viewModel.handleEmailChange}
              autoComplete="email"
              className="w-full rounded-rm-trip-smooth border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-rm-trip-text outline-none transition-all placeholder:text-gray-400 focus-rm-trip-highlight focus:bg-white"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-bold text-rm-trip-text">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Min. 6 characters"
              value={viewModel.password}
              onChange={viewModel.handlePasswordChange}
              autoComplete="new-password"
              className="w-full rounded-rm-trip-smooth border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-rm-trip-text outline-none transition-all placeholder:text-gray-400 focus-rm-trip-highlight focus:bg-white"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="mb-2 block text-sm font-bold text-rm-trip-text">
              Confirm Password
            </label>
            <input
              id="confirm"
              type="password"
              placeholder="Re-enter your password"
              value={viewModel.confirm}
              onChange={viewModel.handleConfirmChange}
              autoComplete="new-password"
              className="w-full rounded-rm-trip-smooth border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-rm-trip-text outline-none transition-all placeholder:text-gray-400 focus-rm-trip-highlight focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={viewModel.loading}
            className="flex w-full items-center justify-center gap-2 rounded-rm-trip-smooth bg-rm-trip-brand px-4 py-3 text-sm font-bold text-white shadow-rm-trip-glow transition-all hover:bg-rm-trip-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
          >
            {viewModel.loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {viewModel.loading ? "Creating account..." : "Create Account"}
          </button>

          <AuthDivider />

          <GoogleSignInButton
            loading={viewModel.googleLoading}
            disabled={viewModel.googleLoading || viewModel.loading}
            onClick={() => void handleGoogleSignIn()}
          />

          <p className="pt-1 text-center text-sm font-medium text-rm-trip-text-muted">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-rm-trip-highlight hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </AuthSurface>
  );
}

export default SignupPage;
