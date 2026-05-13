import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly supabaseAdmin: ReturnType<typeof createClient>;
  private readonly supabaseClient: ReturnType<typeof createClient>;

  constructor(private readonly config: ConfigService) {
    const url = this.config.getOrThrow<string>('supabase.url');
    const anonKey = this.config.getOrThrow<string>('supabase.anonKey');
    const serviceRoleKey = this.config.getOrThrow<string>('supabase.serviceRoleKey');

    // Admin client — used for server-side operations (create user, verify OTP)
    this.supabaseAdmin = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Anon client — used for signInWithPassword
    this.supabaseClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  /**
   * Create a new user. Supabase automatically sends a confirmation email
   * using the SMTP settings configured in the Supabase dashboard (Brevo).
   * The confirmation link redirects to GET /auth/verify-email?token_hash=xxx&type=signup
   */
  async signup(email: string, password: string) {
    const { data, error } = await this.supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${this.redirectBase()}/auth/verify-email`,
      },
    });

    if (error) {
      this.logger.warn(`Signup failed for ${email}: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    this.logger.log(`User signed up: ${email}`);
    return {
      message:
        'Signup successful. Please check your email to verify your account.',
      userId: data.user?.id,
    };
  }

  /**
   * Verify an email address using the token_hash + type params that Supabase
   * appends to the verification link redirect URL.
   */
  async verifyEmail(tokenHash: string, type: string) {
    const { error } = await this.supabaseClient.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'email' | 'invite',
    });

    if (error) {
      this.logger.warn(`Email verification failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    this.logger.log('Email verified successfully');
    return { message: 'Email verified successfully. You can now log in.' };
  }

  /**
   * Sign in with email + password. Rejects unverified accounts.
   */
  async login(email: string, password: string) {
    const { data, error } =
      await this.supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      this.logger.warn(`Login failed for ${email}: ${error.message}`);
      throw new UnauthorizedException(error.message);
    }

    if (!data.user.email_confirmed_at) {
      throw new UnauthorizedException(
        'Email not verified. Please check your inbox.',
      );
    }

    this.logger.log(`User logged in: ${email}`);
    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    };
  }

  /**
   * Exchange a valid refresh token for a new access + refresh token pair.
   */
  async refreshToken(refreshToken: string) {
    const { data, error } = await this.supabaseClient.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      this.logger.warn(`Token refresh failed: ${error?.message}`);
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    this.logger.log(`Token refreshed for user: ${data.user?.email}`);
    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        id: data.user!.id,
        email: data.user!.email,
      },
    };
  }

  private redirectBase(): string {
    const port = this.config.get<number>('port') || 3000;
    return `http://localhost:${port}`;
  }
}
