import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Bot, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { signup } from "@/lib/api";

export function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

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
          </form>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
