import type { LoginRequestDto } from "../dto/LoginRequestDto";
import type { SignupRequestDto } from "../dto/SignupRequestDto";

export interface AuthRepository {
  login(request: LoginRequestDto): Promise<void>;
  signup(request: SignupRequestDto): Promise<void>;
  resendConfirmation(email: string): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(request: {
    accessToken: string;
    refreshToken: string;
    password: string;
  }): Promise<void>;
  signInWithGoogle(redirectTo: string): Promise<void>;
  isAuthenticated(): boolean;
  logout(): void;
}
