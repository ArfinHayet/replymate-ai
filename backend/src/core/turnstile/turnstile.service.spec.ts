import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validateTurnstileToken } from './turnstile-token';
import { TurnstileService } from './turnstile.service';

describe('Turnstile verification', () => {
  const secretKey = 'configured-test-secret';
  const testSecretKey = '1x0000000000000000000000000000000AA';
  const valid = { success: true, hostname: 'example.com', action: 'contact' };
  let fetchMock: jest.SpyInstance;

  const createService = (secret = secretKey, hostnames = ['example.com'], environment = 'test') =>
    new TurnstileService(new ConfigService({
      NODE_ENV: environment,
      turnstile: { secretKey: secret, allowedHostnames: hostnames },
    }));

  const respond = (body: unknown, ok = true) => {
    fetchMock.mockResolvedValue({ ok, json: async () => body } as Response);
  };

  beforeEach(() => {
    fetchMock = jest.spyOn(globalThis, 'fetch');
    respond(valid);
  });
  afterEach(() => jest.restoreAllMocks());

  it('verifies once with the fixed URL and a five-second timeout, without sending an untrusted IP', async () => {
    const timeout = jest.spyOn(AbortSignal, 'timeout');
    await expect(createService().verify(' token ', 'contact')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(options.method).toBe('POST');
    expect(options.body?.toString()).toBe(`secret=${secretKey}&response=token`);
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(timeout).toHaveBeenCalledWith(5000);
  });

  it.each([undefined, null, {}, [], 123, true, '', '   ', 'x'.repeat(2049)])(
    'rejects malformed tokens before any network request: %j', async (token) => {
      await expect(createService().verify(token, 'contact')).rejects.toBeInstanceOf(BadRequestException);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('accepts tokens at the documented maximum length', () => {
    expect(validateTurnstileToken('x'.repeat(2048))).toHaveLength(2048);
  });

  it.each(['invalid-input-response', 'timeout-or-duplicate'])('rejects provider denials (%s)', async (code) => {
    respond({ success: false, 'error-codes': [code] });
    await expect(createService().verify('token', 'contact')).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    { ...valid, action: 'signup' },
    { ...valid, hostname: 'evil.example' },
    { ...valid, hostname: 'example.com.evil.example' },
  ])('rejects a valid token bound to another action or hostname: %j', async (response) => {
    respond(response);
    await expect(createService().verify('token', 'contact')).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([null, [], 'invalid', {}, { success: 'true' }, { success: true },
    { success: true, action: 123, hostname: 'example.com' },
    { success: false, 'error-codes': 'invalid-input-response' }])(
    'fails closed on a malformed verification response: %j', async (response) => {
      respond(response);
      await expect(createService().verify('token', 'contact')).rejects.toBeInstanceOf(ServiceUnavailableException);
    },
  );

  it.each(['internal-error', 'invalid-input-secret', 'missing-input-secret', 'bad-request'])(
    'treats provider/configuration faults as unavailable (%s)', async (code) => {
      respond({ success: false, 'error-codes': [code] });
      await expect(createService().verify('token', 'contact')).rejects.toBeInstanceOf(ServiceUnavailableException);
    },
  );

  it.each([new Error('Network failure'), new DOMException('Timed out', 'TimeoutError')])(
    'fails closed on transport failures (%j)', async (error) => {
      fetchMock.mockRejectedValue(error);
      await expect(createService().verify('token', 'contact')).rejects.toBeInstanceOf(ServiceUnavailableException);
    },
  );

  it('fails closed on non-2xx responses and invalid JSON', async () => {
    respond(valid, false);
    await expect(createService().verify('token', 'contact')).rejects.toBeInstanceOf(ServiceUnavailableException);
    fetchMock.mockResolvedValue({ ok: true, json: async () => { throw new Error('Invalid JSON'); } });
    await expect(createService().verify('token', 'contact')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('fails closed when secret or real-key hostname configuration is missing', async () => {
    await expect(createService('').verify('token', 'contact')).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(createService(secretKey, []).verify('token', 'contact')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('permits documented dummy response binding only with an explicit test secret outside production', async () => {
    respond({ success: true, action: 'test', hostname: 'localhost' });
    await expect(createService(testSecretKey, []).verify('token', 'contact')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(['1', '2', '3'])('rejects dummy secret %s at production startup', (prefix) => {
    expect(() => createService(`${prefix}x0000000000000000000000000000000AA`, [], 'production'))
      .toThrow('test secrets cannot be used in production');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
