import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import {
  TURNSTILE_VERIFICATION_MESSAGE,
  validateTurnstileToken,
} from './turnstile-token';

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const UNAVAILABLE_MESSAGE =
  'Human verification is temporarily unavailable. Please try again later.';
const verificationResponseSchema = z.object({
  success: z.boolean(),
  'error-codes': z.array(z.string()).optional(),
  action: z.string().optional(),
  hostname: z.string().optional(),
});

// Cloudflare's documented dummy secrets are only for local/automated testing.
const TEST_SECRET_KEYS = new Set([
  '1x0000000000000000000000000000000AA',
  '2x0000000000000000000000000000000AA',
  '3x0000000000000000000000000000000AA',
]);

@Injectable()
export class TurnstileService {
  private readonly secretKey: string;
  private readonly allowedHostnames: string[];
  private readonly usingTestSecret: boolean;

  constructor(config: ConfigService) {
    this.secretKey = config.get<string>('turnstile.secretKey')?.trim() ?? '';
    this.allowedHostnames =
      config.get<string[]>('turnstile.allowedHostnames') ?? [];
    this.usingTestSecret = TEST_SECRET_KEYS.has(this.secretKey);
    if (config.get<string>('NODE_ENV') === 'production' && this.usingTestSecret) {
      throw new Error('Cloudflare Turnstile test secrets cannot be used in production.');
    }
  }

  async verify(value: unknown, expectedAction: 'contact'): Promise<void> {
    const token = validateTurnstileToken(value);
    if (!this.secretKey || (!this.usingTestSecret && !this.allowedHostnames.length)) {
      throw new ServiceUnavailableException(UNAVAILABLE_MESSAGE);
    }

    let result: unknown;
    try {
      const response = await fetch(SITEVERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: this.secretKey, response: token }),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        throw new Error('Turnstile verification request failed');
      }
      result = await response.json();
    } catch {
      throw new ServiceUnavailableException(UNAVAILABLE_MESSAGE);
    }

    const parsed = verificationResponseSchema.safeParse(result);
    if (!parsed.success) {
      throw new ServiceUnavailableException(UNAVAILABLE_MESSAGE);
    }
    const verification = parsed.data;
    if (!verification.success) {
      if (verification['error-codes']?.some((code) =>
        ['internal-error', 'missing-input-secret', 'invalid-input-secret', 'bad-request'].includes(code))) {
        throw new ServiceUnavailableException(UNAVAILABLE_MESSAGE);
      }
      throw new BadRequestException(TURNSTILE_VERIFICATION_MESSAGE);
    }

    // Dummy responses use a fixed action/hostname, so binding applies to real keys.
    if (!this.usingTestSecret) {
      if (verification.action == null || verification.hostname == null) {
        throw new ServiceUnavailableException(UNAVAILABLE_MESSAGE);
      }
      if (verification.action !== expectedAction ||
        !this.allowedHostnames.includes(verification.hostname.toLowerCase())) {
        throw new BadRequestException(TURNSTILE_VERIFICATION_MESSAGE);
      }
    }
  }
}
