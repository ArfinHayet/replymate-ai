import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly supabase: ReturnType<typeof createClient>;

  constructor(config: ConfigService) {
    this.supabase = createClient(
      config.getOrThrow<string>('supabase.url'),
      config.getOrThrow<string>('supabase.anonKey'),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers['authorization'];
    console.log('[jwt-guard] canActivate', {
      method: req.method,
      path: req.path,
      hasAuthHeader: !!authHeader,
      origin: req.headers['origin'] ?? null,
    });
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      this.logger.warn('No Bearer token in Authorization header');
      throw new UnauthorizedException();
    }

    const { data, error } = await this.supabase.auth.getUser(token);
    if (error || !data.user) {
      this.logger.error(`Supabase token validation failed: ${error?.message}`);
      throw new UnauthorizedException(error?.message);
    }

    (req as Request & { user: unknown }).user = data.user;
    return true;
  }
}
