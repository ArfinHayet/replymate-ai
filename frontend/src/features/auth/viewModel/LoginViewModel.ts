import type { AuthFieldErrors } from "../model/entities/AuthFieldErrors";
import type { AuthFormStatus } from "../model/entities/AuthFormStatus";
import type { TurnstileControl } from "@/lib/turnstile";

export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginViewModel {
  formData: LoginFormData;
  formStatus: AuthFormStatus;
  errors: AuthFieldErrors;
  googleLoading: boolean;
  turnstile: TurnstileControl;
  setEmail(value: string): void;
  setPassword(value: string): void;
  submitLogin(): Promise<{ success: boolean; errorMessage?: string }>;
  signInWithGoogle(origin: string): Promise<{ success: boolean; errorMessage?: string }>;
}
