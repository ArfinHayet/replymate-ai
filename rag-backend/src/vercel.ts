/**
 * Vercel serverless entry point.
 *
 * `nest build` compiles this to dist/vercel.js.
 * vercel.json routes every request to that compiled file.
 * We never call app.listen() here — Vercel manages the HTTP lifecycle.
 */
import 'reflect-metadata';
import express from 'express';
import type { Express, Request, Response } from 'express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

const expressServer: Express = express();

// Bootstrap once per cold start; subsequent requests reuse the same instance.
const appReady: Promise<void> = (async () => {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressServer),
    { bodyParser: false },
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  const config = app.get(ConfigService);
  const allowedOrigins = (
    config.get<string>('cors.origins') ?? 'http://localhost:5173'
  )
    .split(',')
    .map((o: string) => o.trim());

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  });

  await app.init();
})();

export default async (req: Request, res: Response): Promise<void> => {
  await appReady;
  expressServer(req, res);
};
