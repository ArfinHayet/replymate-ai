import { useMemo, useState } from "react";
import { useTurnstile } from "@/lib/turnstile";
import type { AuthFieldErrors } from "../model/entities/AuthFieldErrors";
import type { AuthFormStatus } from "../model/entities/AuthFormStatus";
import { getAuthErrorMessage } from "../model/services/authError";
import { createAuthService } from "../model/services/createAuthService";
import { validateLoginForm } from "../model/services/authValidation";
import type { LoginFormData, LoginViewModel } from "./LoginViewModel";

export function useLoginViewModel(): LoginViewModel {
  const [formData, setFormData] = useState<LoginFormData>({ email: "", password: "" });
  const [formStatus, setFormStatus] = useState<AuthFormStatus>("idle");
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [googleLoading, setGoogleLoading] = useState(false);
  const authService = useMemo(() => createAuthService(), []);
  const turnstile = useTurnstile();

  const setEmail = (value: string) => {
    setFormData((prev) => ({ ...prev, email: value }));
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const setPassword = (value: string) => {
    setFormData((prev) => ({ ...prev, password: value }));
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  const submitLogin = async () => {
    if (formStatus === "loading" || formStatus === "success") return { success: false };
    const newErrors = validateLoginForm(formData.email, formData.password);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return { success: false };

    const turnstileToken = turnstile.consumeToken();
    if (!turnstileToken) {
      return { success: false, errorMessage: "Please complete the security check." };
    }

    setFormStatus("loading");

    try {
      await authService.login(formData.email, formData.password, turnstileToken);
      setFormStatus("success");
      return { success: true };
    } catch (error: unknown) {
      setFormStatus("idle");
      return {
        success: false,
        errorMessage: getAuthErrorMessage(error, "Unable to log in. Please check your credentials and try again."),
      };
    } finally {
      turnstile.reset();
    }
  };

  const signInWithGoogle = async (origin: string) => {
    setGoogleLoading(true);
    try {
      await authService.signInWithGoogle(origin);
      return { success: true };
    } catch (error: unknown) {
      setGoogleLoading(false);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : "Google sign-in failed. Please try again.",
      };
    }
  };

  return {
    formData,
    formStatus,
    errors,
    googleLoading,
    turnstile,
    setEmail,
    setPassword,
    submitLogin,
    signInWithGoogle,
  };
}
