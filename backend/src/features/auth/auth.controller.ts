import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  BadRequestException,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { UsageService } from '../usage/usage.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly usageService: UsageService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: Request) {
    const user = req.user as {
      id: string;
      email?: string;
      created_at: string;
      user_metadata?: { full_name?: string; name?: string; avatar_url?: string };
    };
    const meta = user.user_metadata ?? {};
    const usage = await this.usageService.ensureCurrentUsage(user.id);
    return {
      id: user.id,
      email: user.email ?? '',
      displayName: meta.full_name ?? meta.name ?? (user.email ?? '').split('@')[0],
      avatarUrl: meta.avatar_url ?? null,
      joinedAt: user.created_at,
      usage,
    };
  }

    @Post('signup')
  async signup(@Body() body: SignupDto) {
    if (!body.email?.trim()) throw new BadRequestException('email is required');
    if (!body.password?.trim())
      throw new BadRequestException('password is required');
    return this.authService.signup(body.email.trim(), body.password);
  }

  /**
   * Supabase redirects here after the user clicks the confirmation link.
   * By the time this endpoint is called, Supabase has already confirmed the
   * email server-side. Session tokens are in the URL fragment (#access_token=...)
   * which browsers never send to the server — so no query params are required.
   *
   * For older Supabase OTP flows that do send token_hash+type as query params,
   * we still handle those via verifyOtp.
   */
  @Get('verify-email')
  async verifyEmail(
    @Query('token_hash') tokenHash: string | undefined,
    @Query('type') type: string | undefined,
    @Res() res: Response,
  ) {
    if (tokenHash && type) {
      await this.authService.verifyEmail(tokenHash, type);
    }
    const loginUrl = `${this.config.get<string>('frontendUrl') ?? 'http://localhost:5173'}/login`;
    return res.send(this.buildVerifiedPage(loginUrl));
  }

  private buildVerifiedPage(loginUrl: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email Verified</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f5f7fa 0%, #e8edf5 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .card {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.10);
      padding: 48px 40px;
      max-width: 440px;
      width: 90%;
      text-align: center;
    }
    .icon-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: #ecfdf5;
      margin-bottom: 24px;
    }
    .icon-wrap svg { display: block; }
    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #1a202c;
      margin-bottom: 12px;
    }
    p {
      font-size: 1rem;
      color: #4a5568;
      line-height: 1.6;
      margin-bottom: 32px;
    }
    .btn {
      display: inline-block;
      background: #4F46E5;
      color: #ffffff;
      font-size: 1rem;
      font-weight: 600;
      padding: 14px 36px;
      border-radius: 10px;
      text-decoration: none;
      transition: opacity 0.15s ease;
    }
    .btn:hover { opacity: 0.88; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrap">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
           xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="12" cy="12" r="12" fill="#10B981"/>
        <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#ffffff"
              stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <h1>Email Verified!</h1>
    <p>Your email address has been successfully verified.<br/>You can now sign in to your account.</p>
    <a href="${loginUrl}" class="btn">Go to Login</a>
  </div>
</body>
</html>`;
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    if (!body.email?.trim()) throw new BadRequestException('email is required');
    if (!body.password?.trim())
      throw new BadRequestException('password is required');
    return this.authService.login(body.email.trim(), body.password);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email?: string }) {
    if (!body.email?.trim()) throw new BadRequestException('email is required');
    return this.authService.sendPasswordResetEmail(body.email.trim().toLowerCase());
  }

  @Post('reset-password')
  async resetPassword(
    @Body()
    body: {
      access_token?: string;
      refresh_token?: string;
      password?: string;
    },
  ) {
    if (!body.access_token?.trim())
      throw new BadRequestException('access_token is required');
    if (!body.refresh_token?.trim())
      throw new BadRequestException('refresh_token is required');
    if (!body.password?.trim())
      throw new BadRequestException('password is required');
    if (body.password.length < 6)
      throw new BadRequestException('Password must be at least 6 characters');

    return this.authService.updatePassword(
      body.access_token,
      body.refresh_token,
      body.password,
    );
  }

  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }) {
    if (!body.refresh_token?.trim())
      throw new BadRequestException('refresh_token is required');
    return this.authService.refreshToken(body.refresh_token.trim());
  }
}
