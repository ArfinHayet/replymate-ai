import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

export const TURNSTILE_VERIFICATION_MESSAGE =
  'Please complete human verification and try again.';

export const turnstileTokenSchema = z.string().max(2048).trim().min(1);

export function validateTurnstileToken(value: unknown): string {
  const parsed = turnstileTokenSchema.safeParse(value);
  if (!parsed.success) {
    throw new BadRequestException(TURNSTILE_VERIFICATION_MESSAGE);
  }
  return parsed.data;
}
