import { api } from "@/lib/api";
import { apiRoutes } from "@/lib/apiRoutes";
import { isLoggedIn, logout, setRefreshToken, setToken } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { LoginRequestDto } from "../dto/LoginRequestDto";
import type { SignupRequestDto } from "../dto/SignupRequestDto";
import type { AuthRepository } from "./AuthRepository";

interface LoginResponseDto {
  access_token: string;
  refresh_token: string;
}

export class HttpAuthRepository implements AuthRepository {
  async login(request: LoginRequestDto): Promise<void> {
    const response = await api.post<LoginResponseDto>(apiRoutes.auth.login, request);
    setToken(response.data.access_token);
    setRefreshToken(response.data.refresh_token);
  }

  async signup(request: SignupRequestDto): Promise<void> {
    await api.post(apiRoutes.auth.signup, request);
  }

  async signInWithGoogle(redirectTo: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  isAuthenticated(): boolean {
    return isLoggedIn();
  }

  logout(): void {
    logout();
  }
}
