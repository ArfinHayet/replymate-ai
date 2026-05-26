import { useMemo, useState, type ChangeEvent } from "react";
import type { AuthFieldErrors } from "../model/entities/AuthFieldErrors";
import { getAuthErrorMessage } from "../model/services/authError";
import { createAuthService } from "../model/services/createAuthService";
import { validateSignupForm } from "../model/services/authValidation";
import type { SignupViewModel } from "./SignupViewModel";

export function useSignupViewModel(): SignupViewModel {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const authService = useMemo(() => createAuthService(), []);

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
  };

  const handleConfirmChange = (event: ChangeEvent<HTMLInputElement>) => {
    setConfirm(event.target.value);
    if (errors.confirm) setErrors((prev) => ({ ...prev, confirm: undefined }));
  };

  const submitSignup = async () => {
    const newErrors = validateSignupForm(password, confirm);
    setErrors(newErrors);

    if (newErrors.password) {
      return { success: false, errorMessage: newErrors.password };
    }

    if (newErrors.confirm) {
      return { success: false, errorMessage: newErrors.confirm };
    }

    setLoading(true);
    try {
      await authService.signup(email, password);
      setDone(true);
      return { success: true };
    } catch (error: unknown) {
      return {
        success: false,
        errorMessage: getAuthErrorMessage(error, "Signup failed. Please try again."),
      };
    } finally {
      setLoading(false);
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

  const resendConfirmation = async () => {
    setResendLoading(true);
    try {
      await authService.resendConfirmation(email);
      return { success: true };
    } catch (error: unknown) {
      return {
        success: false,
        errorMessage: getAuthErrorMessage(error, "Could not resend confirmation email. Please try again."),
      };
    } finally {
      setResendLoading(false);
    }
  };

  return {
    email,
    password,
    confirm,
    loading,
    resendLoading,
    done,
    googleLoading,
    errors,
    handleEmailChange,
    handlePasswordChange,
    handleConfirmChange,
    submitSignup,
    resendConfirmation,
    signInWithGoogle,
  };
}
