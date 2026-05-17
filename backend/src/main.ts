import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import express from 'express';
import type { Request } from 'express';

type RawBodyRequest = Request & { rawBody?: Buffer };

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  app.use(express.json({
    limit: '10mb',
    verify: (req: RawBodyRequest, _res: unknown, buf: Buffer) => {
      if (req.originalUrl?.startsWith('/whatsapp/webhook')) {
        req.rawBody = Buffer.from(buf);
      }
    },
  }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  const config = app.get(ConfigService);

  app.enableCors({ origin: '*' });

  const port = config.get<number>('port') || 3000;
  await app.listen(port);

  console.log(`🚀  Server running on http://localhost:${port}`);
  console.log(`   POST /admin/upload  — ingest PDF into knowledge base`);
  console.log(`   POST /chat          — agentic RAG chat (MCP tool retrieval)`);
}
void bootstrap();
