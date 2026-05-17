import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WidgetKeyService } from './widget-key.service';
import { AllowedDomainService } from './allowed-domain.service';

const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/** Extracts the widget key from URL paths like /widget/<key>/chat */
const KEY_FROM_PATH_RE = /\/widget\/([^/]+)\//;

@Injectable()
export class WidgetCorsMiddleware implements NestMiddleware {
  constructor(
    private readonly widgetKeyService: WidgetKeyService,
    private readonly allowedDomainService: AllowedDomainService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const origin = req.headers['origin'] as string | undefined;

    // No Origin header = script tag load or server-to-server — no CORS needed
    if (!origin) return next();

    if (LOCALHOST_RE.test(origin)) {
      // Always allow localhost for development
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      const match = KEY_FROM_PATH_RE.exec(req.path);
      const key = match?.[1];

      if (key) {
        const keyRecord = await this.widgetKeyService.findByKey(key);
        if (keyRecord) {
          const allowed = await this.allowedDomainService.isAllowed(keyRecord.userId, origin);
          if (allowed) res.setHeader('Access-Control-Allow-Origin', origin);
        }
      }
    }

    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin');

    // Handle CORS preflight — browser sends OPTIONS before the actual POST
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Max-Age', '86400');
      return res.status(204).send();
    }

    next();
  }
}
