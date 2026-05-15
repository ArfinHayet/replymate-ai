import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Bot, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { signup } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
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
    // On success the browser is redirected — no further action needed here
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await signup(email.trim(), password);
      setDone(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Signup failed. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Success screen
  if (done) {
    return (
      <div className="bg-cover bg-center bg-no-repeat bg-[linear-gradient(to_top,_rgba(245,247,250,0.95),_rgba(245,247,250,0.8)),url('/images/bg.svg')]">
        <div className="min-h-screen container flex items-center justify-center">
          <div className="w-full max-w-lg bg-rm-trip-surface-card rounded-rm-trip-smooth shadow-rm-trip-glow p-8 sm:p-10 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-14 w-14 text-rm-trip-success" />
            </div>
            <h2 className="text-rm-trip-h2 font-bold text-gray-700 mb-2">Check your email</h2>
            <p className="text-gray-600 text-sm font-semibold mb-6">
              We sent a confirmation link to <strong>{email}</strong>. Click it to verify your account before signing
              in.
            </p>
            <Link
              to="/login"
              className="inline-block w-full bg-rm-trip-brand text-white font-bold py-3 rounded-rm-trip-smooth shadow-md transition hover:opacity-90 text-center"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cover bg-center bg-no-repeat bg-[linear-gradient(to_top,_rgba(245,247,250,0.95),_rgba(245,247,250,0.8)),url('/images/bg.svg')]">
      <div className="min-h-screen container flex items-center justify-center">
        <div className="w-full max-w-lg bg-rm-trip-surface-card rounded-rm-trip-smooth shadow-rm-trip-glow p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-rm-trip-smooth bg-rm-trip-brand">
                <Bot className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-rm-trip-h2 font-bold text-gray-700 mb-2">Account Registration</h2>
            <p className="text-gray-600 text-sm font-semibold">Create your account to get started</p>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 bg-white outline-none transition-all duration-150 focus:border-rm-trip-highlight focus:ring-2 focus:ring-rm-trip-highlight/20 placeholder:text-gray-400"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 bg-white outline-none transition-all duration-150 focus:border-rm-trip-highlight focus:ring-2 focus:ring-rm-trip-highlight/20 placeholder:text-gray-400"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm" className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                id="confirm"
                type="password"
                placeholder="Re-enter your password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 bg-white outline-none transition-all duration-150 focus:border-rm-trip-highlight focus:ring-2 focus:ring-rm-trip-highlight/20 placeholder:text-gray-400"
              />
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="mt-5 w-full bg-rm-trip-brand text-white font-bold py-3 rounded-rm-trip-smooth shadow-md transition hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Creating Account…" : "Create Account"}
              </button>
            </div>

            {/* Login Redirect */}
            <div className="text-center mt-4">
              <span className="text-gray-600 text-sm font-semibold">Already have an account? </span>
              <Link to="/login" className="text-rm-trip-highlight hover:underline font-medium">
                Sign in
              </Link>
            </div>

            {/* Divider */}
            <div className="relative flex items-center gap-3 py-1">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">or</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {/* Google OAuth */}
            <button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 border border-gray-300 bg-white text-gray-700 font-semibold py-3 rounded-rm-trip-smooth shadow-sm transition hover:bg-gray-50 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
              )}
              {googleLoading ? "Redirecting…" : "Continue with Google"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
