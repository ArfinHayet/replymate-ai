/**
 * AWS Lambda entry point.
 *
 * This file is the ONLY change needed to run the NestJS app on Lambda.
 * All business logic (services, controllers, entities) is untouched.
 *
 * The handler is cached after the first cold start so subsequent invocations
 * (warm starts) reuse the same NestJS application instance — no re-bootstrap.
 *
 * Local development still uses main.ts + app.listen() unchanged.
 */
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import serverlessExpress from '@vendia/serverless-express';
import express from 'express';
import type { Request } from 'express';
import type { Handler, Context, Callback, APIGatewayProxyEvent } from 'aws-lambda';
import { AppModule } from './app.module';

type RawBodyRequest = Request & { rawBody?: Buffer };

/** Cached handler — initialised once per Lambda container (cold start only). */
let cachedHandler: Handler;

async function bootstrap(): Promise<Handler> {
  const expressApp = express();

  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    bodyParser: false,
    logger: ['log', 'warn', 'error'],
  });

  // ── Body parsers (mirrors main.ts exactly) ───────────────────────────────
  app.use(
    express.json({
      limit: '10mb',
      verify: (req: RawBodyRequest, _res: unknown, buf: Buffer) => {
        // Preserve raw body for webhook signature verification
        if (
          req.originalUrl?.startsWith('/whatsapp/webhook') ||
          req.originalUrl?.startsWith('/payments/webhook')
        ) {
          req.rawBody = Buffer.from(buf);
        }
      },
    }),
  );
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // ── CORS ─────────────────────────────────────────────────────────────────
  const config = app.get(ConfigService);
  const corsOrigins = config.get<string>('cors.origins') ?? '*';
  app.enableCors({ origin: corsOrigins });

  // ── Init (no listen — Lambda handles the transport) ──────────────────────
  await app.init();

  return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback,
) => {
  // Reuse the warm container's handler if available
  if (!cachedHandler) {
    cachedHandler = await bootstrap();
  }
  return cachedHandler(event, context, callback);
};
