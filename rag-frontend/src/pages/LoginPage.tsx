import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, CheckCircle2, Bot } from "lucide-react";
import { toast } from "sonner";
import { login } from "@/lib/api";

export function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [formStatus, setFormStatus] = useState<"idle" | "loading" | "success">("idle");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!formData.email) newErrors.email = "Please provide valid email!";
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
    <div className="bg-cover bg-center bg-no-repeat bg-[linear-gradient(to_top,_rgba(245,247,250,0.95),_rgba(245,247,250,0.8)),url('/images/bg.svg')]">
      <div className="min-h-screen container flex items-center justify-center">
        <div className="w-full max-w-lg bg-rm-trip-surface-card rounded-rm-trip-smooth shadow-rm-trip-glow p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-6">
            {/* Robot Logo */}
            <div className="flex justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-rm-trip-smooth bg-rm-trip-brand">
                <Bot className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-rm-trip-h2 font-bold text-gray-700 mb-2">Sign In to Your Account</h2>
            <p className="text-gray-600 text-sm font-semibold">Access your account by signing in below</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                placeholder="example@mail.com"
                id="email"
                type="text"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 bg-white outline-none transition-all duration-150 focus:border-rm-trip-highlight focus:ring-2 focus:ring-rm-trip-highlight/20 placeholder:text-gray-400"
              />
              {errors.email && <small className="text-rm-trip-error text-xs">{errors.email}</small>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                placeholder="Your password"
                type="password"
                id="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 bg-white outline-none transition-all duration-150 focus:border-rm-trip-highlight focus:ring-2 focus:ring-rm-trip-highlight/20 placeholder:text-gray-400"
              />
              <div className="flex justify-between items-center mt-2 text-sm">
                {errors.password ? <small className="text-rm-trip-error text-xs">{errors.password}</small> : <span />}
                <Link to="/users/forgot-password" className="text-rm-trip-highlight hover:underline font-medium">
                  Forgot Password?
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={formStatus === "loading" || formStatus === "success"}
              className="w-full bg-rm-trip-brand text-white font-bold py-3 rounded-rm-trip-smooth shadow-md transition hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {formStatus === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
              {formStatus === "success" && <CheckCircle2 className="h-4 w-4" />}
              {formStatus === "loading" ? "Signing in…" : formStatus === "success" ? "Success" : "Sign In"}
            </button>

            {/* Register link */}
            <div className="text-center mt-4">
              <span className="text-gray-600 text-sm font-semibold">Don't have an account? </span>
              <Link to="/signup" className="text-rm-trip-highlight font-semibold hover:underline">
                Register
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
