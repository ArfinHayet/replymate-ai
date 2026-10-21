import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ProfileCompletionService } from '../profile-completion/profile-completion.service';
import type { UsageService } from '../usage/usage.service';
import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';
import type { LoginDto } from './dto/login.dto';

describe('AuthController human verification', () => {
  const auth = { login: jest.fn(), signup: jest.fn(),
    sendPasswordResetEmail: jest.fn(), resendSignupConfirmation: jest.fn(), refreshToken: jest.fn() };
  const controller = new AuthController(auth as unknown as AuthService, new ConfigService(),
    {} as UsageService, {} as ProfileCompletionService);
  const valid = { email: ' alex@example.com ', password: ' password ', turnstileToken: ' token ' };

  beforeEach(() => jest.resetAllMocks());

  describe.each(['login', 'signup'] as const)('%s', (action) => {
    it('forwards the validated token and trims email without changing the password', async () => {
      const result = { message: 'Successful' };
      auth[action].mockResolvedValue(result);
      await expect(controller[action](valid)).resolves.toBe(result);
      expect(auth[action]).toHaveBeenCalledWith('alex@example.com', ' password ', 'token');
    });

    it.each([undefined, null, {}, [], 42, true, '', ' ', 'x'.repeat(2049)])(
      'rejects a missing/malformed token before authentication: %j', async (turnstileToken) => {
        await expect(controller[action]({ ...valid, turnstileToken } as LoginDto))
          .rejects.toBeInstanceOf(BadRequestException);
        expect(auth[action]).not.toHaveBeenCalled();
      },
    );

    it.each([null, {}, { ...valid, email: 123 }, { ...valid, password: {} }])(
      'rejects invalid credential shape: %j', async (body) => {
        await expect(controller[action](body as LoginDto)).rejects.toBeInstanceOf(BadRequestException);
        expect(auth[action]).not.toHaveBeenCalled();
      },
    );
  });

  it('keeps recovery, confirmation resend, and refresh callable without CAPTCHA', async () => {
    await controller.forgotPassword({ email: ' ALEX@example.com ' });
    await controller.resendConfirmation({ email: ' ALEX@example.com ' });
    await controller.refresh({ refresh_token: ' refresh ' });
    expect(auth.sendPasswordResetEmail).toHaveBeenCalledWith('alex@example.com');
    expect(auth.resendSignupConfirmation).toHaveBeenCalledWith('alex@example.com');
    expect(auth.refreshToken).toHaveBeenCalledWith('refresh');
  });
});
