import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { z } from 'zod';
import { TurnstileService } from '../../core/turnstile/turnstile.service';
import { turnstileTokenSchema } from '../../core/turnstile/turnstile-token';

const contactMessageSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().max(254).email(),
  subject: z.string().trim().max(200).optional().default(''),
  message: z.string().trim().min(1).max(5000),
  turnstileToken: turnstileTokenSchema,
}).strict();

@Injectable()
export class ContactMessagesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly turnstile: TurnstileService,
  ) {}

  async create(body: unknown): Promise<{ id: string; createdAt: Date }> {
    const parsed = contactMessageSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: parsed.error.issues.map(
          (issue) => `${issue.path.join('.') || 'Request'}: ${issue.message}`,
        ),
      });
    }

    const { name, email, subject, message, turnstileToken } = parsed.data;
    await this.turnstile.verify(turnstileToken, 'contact');
    const [receipt] = await this.dataSource.query(
      `INSERT INTO public.contact_messages (name, email, subject, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id, "createdAt"`,
      [name, email, subject || null, message],
    ) as Array<{ id: string; createdAt: Date }>;
    return receipt;
  }
}
