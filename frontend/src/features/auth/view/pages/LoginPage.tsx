import { type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isLoggedIn } from "@/lib/auth";
import { useLoginViewModel } from "../../viewModel/useLoginViewModel";
import { AuthBrandHeader } from "../components/AuthBrandHeader";
import { AuthDivider } from "../components/AuthDivider";
import { AuthSurface } from "../components/AuthSurface";
import { GoogleSignInButton } from "../components/GoogleSignInButton";

const DASHBOARD_PATH = "/chat";

export function LoginPage() {
  const navigate = useNavigate();
  const viewModel = useLoginViewModel();

  if (isLoggedIn()) {
    return <Navigate to={DASHBOARD_PATH} replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await viewModel.submitLogin();

    if (result.success) {
      setTimeout(() => {
        navigate(DASHBOARD_PATH, { replace: true });
      }, 500);
      return;
    }

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

  return (
    <AuthSurface>
      <div className="flex min-h-dvh w-full flex-col justify-center bg-white px-5 py-8 sm:min-h-0 sm:max-w-md sm:rounded-rm-trip-smooth sm:border sm:border-white/80 sm:bg-white/95 sm:p-9 sm:shadow-[0_24px_70px_rgba(15,23,42,0.16)] sm:backdrop-blur">
        <AuthBrandHeader title="Sign in to SupportMate AI" subtitle="Manage your business content and assistant settings." />

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-bold text-rm-trip-text">
              Email
            </label>
            <input
              placeholder="you@example.com"
              id="email"
              type="email"
              value={viewModel.formData.email}
              onChange={(event) => viewModel.setEmail(event.target.value)}
              autoComplete="email"
              className="w-full rounded-rm-trip-smooth border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-rm-trip-text outline-none transition-all placeholder:text-gray-400 focus-rm-trip-highlight focus:bg-white"
            />
            {viewModel.errors.email && (
              <p className="mt-1.5 text-xs font-medium text-rm-trip-error">{viewModel.errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-bold text-rm-trip-text">
              Password
            </label>
            <input
              placeholder="Your password"
              type="password"
              id="password"
              value={viewModel.formData.password}
              onChange={(event) => viewModel.setPassword(event.target.value)}
              autoComplete="current-password"
              className="w-full rounded-rm-trip-smooth border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-rm-trip-text outline-none transition-all placeholder:text-gray-400 focus-rm-trip-highlight focus:bg-white"
            />
            <div className="mt-2 flex items-center justify-between gap-3 text-sm">
              {viewModel.errors.password ? (
                <p className="text-xs font-medium text-rm-trip-error">{viewModel.errors.password}</p>
              ) : (
                <span />
              )}
              <Link to="/users/forgot-password" className="shrink-0 font-semibold text-rm-trip-highlight hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={viewModel.formStatus === "loading" || viewModel.formStatus === "success"}
            className="flex w-full items-center justify-center gap-2 rounded-rm-trip-smooth bg-rm-trip-brand px-4 py-3 text-sm font-bold text-white shadow-rm-trip-glow transition-all hover:bg-rm-trip-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
          >
            {viewModel.formStatus === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
            {viewModel.formStatus === "success" && <CheckCircle2 className="h-4 w-4" />}
            {viewModel.formStatus === "loading"
              ? "Signing in..."
              : viewModel.formStatus === "success"
                ? "Success"
                : "Sign In"}
          </button>

          <AuthDivider />

          <GoogleSignInButton
            loading={viewModel.googleLoading}
            disabled={viewModel.googleLoading || viewModel.formStatus === "loading" || viewModel.formStatus === "success"}
            onClick={() => void handleGoogleSignIn()}
          />

          <p className="pt-1 text-center text-sm font-medium text-rm-trip-text-muted">
            Don't have an account?{" "}
            <Link to="/signup" className="font-bold text-rm-trip-highlight hover:underline">
              Register
            </Link>
          </p>
        </form>
      </div>
    </AuthSurface>
  );
}

export default LoginPage;
