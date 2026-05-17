import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { login } from "@/lib/api";
import { supabase } from "@/lib/supabase";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [formStatus, setFormStatus] = useState<"idle" | "loading" | "success">("idle");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      toast.error(error.message);
      setGoogleLoading(false);
    }
  };

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!formData.email) newErrors.email = "Please provide a valid email.";
    if (!formData.password) newErrors.password = "Password is required.";
    return newErrors;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [id]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setFormStatus("loading");

    try {
      await login(formData.email.toLowerCase().trim(), formData.password.trim());
      setFormStatus("success");
      setTimeout(() => {
        navigate("/chat", { replace: true });
      }, 500);
    } catch (err: unknown) {
      console.error("Login error:", err);
      setFormStatus("idle");
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Unable to log in. Please check your credentials and try again.";
      toast.error(msg);
    }
  };

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-rm-trip-surface">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(37,99,235,0.16),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(20,184,166,0.12),transparent_28%),linear-gradient(135deg,#f8fafc_0%,#eef4ff_48%,#f8fafc_100%)]" />
      <div className="absolute left-1/2 top-16 -z-10 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-white/60 blur-3xl" />

      <div className="container flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-rm-trip-smooth border border-white/80 bg-white/95 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.16)] backdrop-blur sm:p-9">
          <div className="mb-7 text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <img src="/favicon.svg" alt="Logo" className="h-10 w-10" />
              <div className="text-left">
                <p className="font-rm-trip-heading text-base font-bold text-rm-trip-text leading-none">ReplyMate Ai</p>
                <p className="text-xs text-rm-trip-text-muted mt-0.5">Your personal AI assistant</p>
              </div>
            </div>
            <h1 className="font-rm-trip-heading text-2xl font-bold text-rm-trip-text">Sign in to your account</h1>
            <p className="mt-2 text-sm font-medium text-rm-trip-text-muted">Access your knowledge base workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-bold text-rm-trip-text">
                Email
              </label>
              <input
                placeholder="you@example.com"
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                className="w-full rounded-rm-trip-smooth border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-rm-trip-text outline-none transition-all placeholder:text-gray-400 focus-rm-trip-highlight focus:bg-white"
              />
              {errors.email && <p className="mt-1.5 text-xs font-medium text-rm-trip-error">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-bold text-rm-trip-text">
                Password
              </label>
              <input
                placeholder="Your password"
                type="password"
                id="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                className="w-full rounded-rm-trip-smooth border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-rm-trip-text outline-none transition-all placeholder:text-gray-400 focus-rm-trip-highlight focus:bg-white"
              />
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                {errors.password ? (
                  <p className="text-xs font-medium text-rm-trip-error">{errors.password}</p>
                ) : (
                  <span />
                )}
                <Link to="/users/forgot-password" className="font-semibold text-rm-trip-highlight hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={formStatus === "loading" || formStatus === "success"}
              className="flex w-full items-center justify-center gap-2 rounded-rm-trip-smooth bg-rm-trip-brand px-4 py-3 text-sm font-bold text-white shadow-rm-trip-glow transition-all hover:bg-rm-trip-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {formStatus === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
              {formStatus === "success" && <CheckCircle2 className="h-4 w-4" />}
              {formStatus === "loading" ? "Signing in..." : formStatus === "success" ? "Success" : "Sign In"}
            </button>

            <div className="relative flex items-center gap-3 py-1">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs font-bold uppercase tracking-wide text-rm-trip-text-muted">or</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            <button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              disabled={googleLoading || formStatus === "loading" || formStatus === "success"}
              className="flex w-full items-center justify-center gap-3 rounded-rm-trip-smooth border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-rm-trip-text shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
              {googleLoading ? "Redirecting..." : "Continue with Google"}
            </button>

            <p className="pt-1 text-center text-sm font-medium text-rm-trip-text-muted">
              Don't have an account?{" "}
              <Link to="/signup" className="font-bold text-rm-trip-highlight hover:underline">
                Register
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
