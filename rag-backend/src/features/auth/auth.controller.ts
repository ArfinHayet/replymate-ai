import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    @Query('token_hash') tokenHash?: string,
    @Query('type') type?: string,
  ) {
    if (tokenHash && type) {
      return this.authService.verifyEmail(tokenHash, type);
    }
    // Implicit / PKCE flows: email already confirmed by Supabase before redirect
    return { message: 'Email verified successfully. You can now log in.' };
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    if (!body.email?.trim()) throw new BadRequestException('email is required');
    if (!body.password?.trim())
      throw new BadRequestException('password is required');
    return this.authService.login(body.email.trim(), body.password);
  }

  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }) {
    if (!body.refresh_token?.trim())
      throw new BadRequestException('refresh_token is required');
    return this.authService.refreshToken(body.refresh_token.trim());
  }
}

