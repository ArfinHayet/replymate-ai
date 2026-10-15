import { BadRequestException, type ExecutionContext, ForbiddenException, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WidgetKeyGuard } from '../widget/widget-key.guard';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('../document/document.service', () => ({ DocumentService: class {} }));
jest.mock('../document/csv.service', () => ({ CsvService: class {} }));
jest.mock('../image/image.service', () => ({ ImageService: class {} }));

const contextFor = (request: object) => ({ switchToHttp: () => ({ getRequest: () => request }) }) as ExecutionContext;

describe('Admin and blocked-account authorization', () => {
  const config = new ConfigService({ supabase: { url: 'https://example.supabase.co', anonKey: 'test-anon',
    serviceRoleKey: 'test-service', adminEmails: ' ADMIN@example.com , other@example.com ' } });
  const getUser = jest.fn();
  const getUserById = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    (createClient as jest.Mock).mockReturnValue({ auth: { getUser, admin: { getUserById } } });
  });
  afterEach(() => jest.restoreAllMocks());

  it('accepts only an explicitly allowlisted authenticated email', () => {
    const guard = new AdminGuard(config);
    expect(guard.canActivate(contextFor({ user: { email: ' admin@EXAMPLE.com ' } }))).toBe(true);
    expect(() => guard.canActivate(contextFor({ user: { email: 'regular@example.com' } }))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(contextFor({}))).toThrow(ForbiddenException);
    expect(() => new AdminGuard(new ConfigService()).canActivate(contextFor({ user: { email: 'admin@example.com' } })))
      .toThrow(ForbiddenException);
  });

  it('requires a valid bearer session before assigning the request user', async () => {
    const guard = new JwtAuthGuard(config);
    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toBeInstanceOf(UnauthorizedException);
    getUser.mockResolvedValue({ data: { user: null }, error: new Error('Invalid token') });
    await expect(guard.canActivate(contextFor({ headers: { authorization: 'Bearer invalid' } })))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('denies blocked users with an otherwise valid session', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-id', banned_until: '2099-01-01T00:00:00Z' } }, error: null });
    await expect(new JwtAuthGuard(config).canActivate(contextFor({ headers: { authorization: 'Bearer token' } })))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows an expired ban and attaches the authenticated user', async () => {
    const user = { id: 'user-id', banned_until: '2020-01-01T00:00:00Z' };
    const request = { headers: { authorization: 'Bearer token' }, user: undefined as unknown };
    getUser.mockResolvedValue({ data: { user }, error: null });
    await expect(new JwtAuthGuard(config).canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user).toBe(user);
  });

  it.each([undefined, 'http://localhost:5173', 'https://customer.example'])('enforces owner bans before widget origin bypasses (%s)', async (origin) => {
    const keys = { findByKey: jest.fn().mockResolvedValue({ userId: 'user-id' }) };
    const domains = { isAllowed: jest.fn().mockResolvedValue(true) };
    getUserById.mockResolvedValue({ data: { user: { id: 'user-id', banned_until: '2099-01-01T00:00:00Z' } }, error: null });
    const guard = new WidgetKeyGuard(keys as never, domains as never, config);
    await expect(guard.canActivate(contextFor({ params: { key: 'widget-key' }, headers: { origin } })))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(domains.isAllowed).not.toHaveBeenCalled();
  });

  it('allows widgets owned by active users and fails closed when their owner is unavailable', async () => {
    const keys = { findByKey: jest.fn().mockResolvedValue({ userId: 'user-id' }) };
    const domains = { isAllowed: jest.fn() };
    const guard = new WidgetKeyGuard(keys as never, domains as never, config);
    getUserById.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null });
    const request = { params: { key: 'widget-key' }, headers: {}, widgetUserId: '' };
    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.widgetUserId).toBe('user-id');
    getUserById.mockResolvedValue({ data: { user: null }, error: new Error('Unavailable') });
    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects nonboolean block requests and unsupported content types at the controller', () => {
    const controller = new AdminController({} as never);
    expect(() => controller.block('id', 'true', { user: { id: 'actor' } } as never)).toThrow(BadRequestException);
    expect(() => controller.content('users; DROP TABLE pdfs', {})).toThrow(BadRequestException);
    expect(() => controller.delete('unknown', 'id')).toThrow(BadRequestException);
  });
});
