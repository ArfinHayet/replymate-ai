import { BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { TURNSTILE_VERIFICATION_MESSAGE } from '../../core/turnstile/turnstile-token';
import type { ProfileCompletionService } from '../profile-completion/profile-completion.service';
import type { UsageService } from '../usage/usage.service';
import { AuthService } from './auth.service';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

const authClient = () => ({
  signUp: jest.fn(), signInWithPassword: jest.fn(), resetPasswordForEmail: jest.fn(),
  resend: jest.fn(), refreshSession: jest.fn(), verifyOtp: jest.fn(), setSession: jest.fn(),
  updateUser: jest.fn(), signOut: jest.fn(),
});

describe('AuthService CAPTCHA integration', () => {
  let service: AuthService;
  let anon: ReturnType<typeof authClient>;
  let admin: ReturnType<typeof authClient>;
  const usage = { ensureCurrentUsage: jest.fn() };
  const profile = { refresh: jest.fn(), getStatus: jest.fn() };
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    fetchMock = jest.spyOn(globalThis, 'fetch');
    anon = authClient();
    admin = authClient();
    (createClient as jest.Mock).mockImplementation((_url: string, key: string) =>
      ({ auth: key === 'service-key' ? admin : anon }));
    service = new AuthService(new ConfigService({
      supabase: { url: 'https://example.supabase.co', anonKey: 'anon-key', serviceRoleKey: 'service-key' },
      appUrl: 'https://api.example.com', frontendUrl: 'https://example.com',
    }), usage as unknown as UsageService, profile as unknown as ProfileCompletionService);
  });
  afterEach(() => jest.restoreAllMocks());

  it('forwards signup CAPTCHA exactly once to the anon SDK while preserving confirmation and setup', async () => {
    anon.signUp.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null });
    await expect(service.signup('alex@example.com', 'password', 'token')).resolves.toEqual({
      message: 'Signup successful. Please check your email to verify your account.', userId: 'user-id',
    });
    expect(anon.signUp).toHaveBeenCalledTimes(1);
    expect(anon.signUp).toHaveBeenCalledWith({ email: 'alex@example.com', password: 'password', options: {
      emailRedirectTo: 'https://api.example.com/auth/verify-email', captchaToken: 'token',
    } });
    expect(admin.signUp).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(usage.ensureCurrentUsage).toHaveBeenCalledWith('user-id');
    expect(profile.refresh).toHaveBeenCalledWith('user-id');
  });

  it('forwards login CAPTCHA exactly once and keeps the existing session response', async () => {
    anon.signInWithPassword.mockResolvedValue({ data: {
      user: { id: 'user-id', email: 'alex@example.com', email_confirmed_at: '2026-10-15' },
      session: { access_token: 'access', refresh_token: 'refresh' },
    }, error: null });
    usage.ensureCurrentUsage.mockResolvedValue({ count: 1 });
    profile.getStatus.mockResolvedValue({ complete: true });
    await expect(service.login('alex@example.com', 'password', 'token')).resolves.toEqual({
      access_token: 'access', refresh_token: 'refresh', user: { id: 'user-id', email: 'alex@example.com' },
      usage: { count: 1 }, profileCompletion: { complete: true },
    });
    expect(anon.signInWithPassword).toHaveBeenCalledTimes(1);
    expect(anon.signInWithPassword).toHaveBeenCalledWith({
      email: 'alex@example.com', password: 'password', options: { captchaToken: 'token' },
    });
    expect(admin.signInWithPassword).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['signup', 'login'] as const)('maps %s CAPTCHA failure to safe 400 without user setup', async (action) => {
    const sdkMethod = action === 'signup' ? anon.signUp : anon.signInWithPassword;
    sdkMethod.mockResolvedValue({ data: { user: null, session: null },
      error: { code: 'captcha_failed', message: 'Sensitive provider details' } });
    const error = await service[action]('alex@example.com', 'password', 'token').catch((reason) => reason);
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.message).toBe(TURNSTILE_VERIFICATION_MESSAGE);
    expect(usage.ensureCurrentUsage).not.toHaveBeenCalled();
    expect(profile.refresh).not.toHaveBeenCalled();
    expect(profile.getStatus).not.toHaveBeenCalled();
  });

  it('keeps invalid credentials unauthorized', async () => {
    anon.signInWithPassword.mockResolvedValue({ data: {},
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' } });
    await expect(service.login('alex@example.com', 'password', 'token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('uses only the isolated admin client for recovery and resend without changing redirects', async () => {
    admin.resetPasswordForEmail.mockResolvedValue({ error: null });
    admin.resend.mockResolvedValue({ error: null });
    await expect(service.sendPasswordResetEmail('alex@example.com')).resolves.toHaveProperty('message');
    await expect(service.resendSignupConfirmation('alex@example.com')).resolves.toHaveProperty('message');
    expect(admin.resetPasswordForEmail).toHaveBeenCalledWith('alex@example.com', {
      redirectTo: 'https://example.com/reset-password',
    });
    expect(admin.resend).toHaveBeenCalledWith({ type: 'signup', email: 'alex@example.com', options: {
      emailRedirectTo: 'https://api.example.com/auth/verify-email',
    } });
    expect(anon.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(anon.resend).not.toHaveBeenCalled();
    expect(createClient).toHaveBeenCalledWith('https://example.supabase.co', 'service-key', {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  it('keeps refresh on the anon client without a CAPTCHA token', async () => {
    anon.refreshSession.mockResolvedValue({ data: {
      session: { access_token: 'access', refresh_token: 'new-refresh' },
      user: { id: 'user-id', email: 'alex@example.com' },
    }, error: null });
    await service.refreshToken('refresh');
    expect(anon.refreshSession).toHaveBeenCalledWith({ refresh_token: 'refresh' });
    expect(admin.refreshSession).not.toHaveBeenCalled();
  });
});
