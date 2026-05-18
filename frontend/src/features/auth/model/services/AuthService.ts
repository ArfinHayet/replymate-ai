import { apiRoutes } from "@/lib/apiRoutes";
import type { AuthRepository } from "../repositories/AuthRepository";

export class AuthService {
  private readonly authRepository: AuthRepository;

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository;
  }

  login(email: string, password: string) {
    return this.authRepository.login({
      email: email.toLowerCase().trim(),
      password: password.trim(),
    });
  }

  signup(email: string, password: string) {
    return this.authRepository.signup({
      email: email.trim(),
      password,
    });
  }

  signInWithGoogle(origin: string) {
    return this.authRepository.signInWithGoogle(`${origin}${apiRoutes.auth.callbackPath}`);
  }

  isAuthenticated() {
    return this.authRepository.isAuthenticated();
  }

  logout() {
    this.authRepository.logout();
  }
}
