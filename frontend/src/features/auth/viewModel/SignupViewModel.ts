import type { ChangeEvent } from "react";
import type { AuthFieldErrors } from "../model/entities/AuthFieldErrors";
import type { TurnstileControl } from "@/lib/turnstile";

export interface SignupViewModel {
  email: string;
  password: string;
  confirm: string;
  loading: boolean;
  resendLoading: boolean;
  done: boolean;
  googleLoading: boolean;
  errors: AuthFieldErrors;
  turnstile: TurnstileControl;
  handleEmailChange(event: ChangeEvent<HTMLInputElement>): void;
  handlePasswordChange(event: ChangeEvent<HTMLInputElement>): void;
  handleConfirmChange(event: ChangeEvent<HTMLInputElement>): void;
  submitSignup(): Promise<{ success: boolean; errorMessage?: string }>;
  resendConfirmation(): Promise<{ success: boolean; errorMessage?: string }>;
  signInWithGoogle(origin: string): Promise<{ success: boolean; errorMessage?: string }>;
}
