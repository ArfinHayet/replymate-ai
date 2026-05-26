import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { UsageService } from '../usage/usage.service';
import { ProfileCompletionService } from '../profile-completion/profile-completion.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly supabaseAdmin: ReturnType<typeof createClient>;
  private readonly supabaseClient: ReturnType<typeof createClient>;

  constructor(
    private readonly config: ConfigService,
    private readonly usageService: UsageService,
    private readonly profileCompletionService: ProfileCompletionService,
  ) {
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
    if (data.user?.id) {
      await this.usageService.ensureCurrentUsage(data.user.id);
      await this.profileCompletionService.refresh(data.user.id);
    }

    return {
      message:
        'Signup successful. Please check your email to verify your account.',
      userId: data.user?.id,
    };
  }

  async sendPasswordResetEmail(email: string) {
    const { error } = await this.supabaseClient.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${this.frontendUrl()}/reset-password`,
      },
    );

    if (error) {
      this.logger.warn(`Password reset request failed for ${email}: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    return {
      message:
        'If an account exists for this email, a password reset link will be sent.',
    };
  }

  async resendSignupConfirmation(email: string) {
    const { error } = await this.supabaseClient.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${this.redirectBase()}/auth/verify-email`,
      },
    });

    if (error) {
      this.logger.warn(`Signup confirmation resend failed for ${email}: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    return {
      message:
        'If this email is waiting for verification, a new confirmation link will be sent.',
    };
  }

  async updatePassword(accessToken: string, refreshToken: string, password: string) {
    const { error: sessionError } = await this.supabaseClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError) {
      this.logger.warn(`Password reset session failed: ${sessionError.message}`);
      throw new UnauthorizedException('Invalid or expired password reset link.');
    }

    const { error } = await this.supabaseClient.auth.updateUser({ password });

    if (error) {
      this.logger.warn(`Password update failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    await this.supabaseClient.auth.signOut();

    return { message: 'Password updated successfully.' };
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
    const usage = await this.usageService.ensureCurrentUsage(data.user.id);
    const profileCompletion = await this.profileCompletionService.getStatus(data.user.id);

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      usage,
      profileCompletion,
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
    return this.config.get<string>('appUrl') ?? 'http://localhost:3000';
  }

  private frontendUrl(): string {
    return this.config.get<string>('frontendUrl') ?? 'http://localhost:5173';
  }
}
