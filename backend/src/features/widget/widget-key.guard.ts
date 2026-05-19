import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { WidgetKeyService } from './widget-key.service';
import { AllowedDomainService } from './allowed-domain.service';

const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/** Extend Request to carry the resolved owner userId */
export type WidgetRequest = Request & { widgetUserId: string };

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function requestOrigin(req: Request): string | undefined {
  const host = firstHeaderValue(req.headers['x-forwarded-host']) || req.headers.host;
  if (!host) return undefined;

  const forwardedProto = firstHeaderValue(req.headers['x-forwarded-proto']);
  const protocol = forwardedProto?.split(',')[0]?.trim() || req.protocol || 'http';

  return `${protocol}://${host}`;
}

@Injectable()
export class WidgetKeyGuard implements CanActivate {
  constructor(
    private readonly widgetKeyService: WidgetKeyService,
    private readonly allowedDomainService: AllowedDomainService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<WidgetRequest>();

    // Key is in the URL path: /widget/:key/chat
    const rawKey = req.params?.key;
    const key = Array.isArray(rawKey) ? rawKey[0] : rawKey;
    if (!key) throw new UnauthorizedException('Widget key is required');

    const keyRecord = await this.widgetKeyService.findByKey(key);
    if (!keyRecord) throw new UnauthorizedException('Invalid widget key');

    const origin = req.headers['origin'] as string | undefined;

    // No origin = server-to-server / non-browser — allow (not a CORS scenario)
    if (!origin) {
      req.widgetUserId = keyRecord.userId;
      return true;
    }

    // Localhost bypass for development
    if (LOCALHOST_RE.test(origin)) {
      req.widgetUserId = keyRecord.userId;
      return true;
    }

    // Public chatbot pages are hosted by this API and post back same-origin.
    if (origin === requestOrigin(req)) {
      req.widgetUserId = keyRecord.userId;
      return true;
    }

    // Check domain whitelist
    const allowed = await this.allowedDomainService.isAllowed(keyRecord.userId, origin);
    if (!allowed) {
      throw new ForbiddenException(
        `Origin "${origin}" is not whitelisted for this widget key`,
      );
    }

    req.widgetUserId = keyRecord.userId;
    return true;
  }
}
