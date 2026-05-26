import type { ChangeEvent } from "react";
import type { AuthFieldErrors } from "../model/entities/AuthFieldErrors";

export interface SignupViewModel {
  email: string;
  password: string;
  confirm: string;
  loading: boolean;
  resendLoading: boolean;
  done: boolean;
  googleLoading: boolean;
  errors: AuthFieldErrors;
  handleEmailChange(event: ChangeEvent<HTMLInputElement>): void;
  handlePasswordChange(event: ChangeEvent<HTMLInputElement>): void;
  handleConfirmChange(event: ChangeEvent<HTMLInputElement>): void;
  submitSignup(): Promise<{ success: boolean; errorMessage?: string }>;
  resendConfirmation(): Promise<{ success: boolean; errorMessage?: string }>;
  signInWithGoogle(origin: string): Promise<{ success: boolean; errorMessage?: string }>;
}
