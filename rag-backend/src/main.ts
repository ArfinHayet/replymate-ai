import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  app.use(require('express').json({ limit: '10mb' }));
  app.use(require('express').urlencoded({ limit: '10mb', extended: true }));
  const config = app.get(ConfigService);
  // Always include localhost so local dev works regardless of what CORS_ORIGINS is set to on Vercel
  const allowedOrigins = [
    ...(config.get<string>('cors.origins') || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    'http://localhost:5173',
    'http://localhost:3000',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      console.log('[cors] origin check', { origin, allowedOrigins });
      if (!origin) {
        // No Origin header = server-to-server / health-check — skip CORS headers
        return callback(null, false);
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn('[cors] REJECTED origin', origin);
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  const port = config.get<number>('port') || 3000;
  await app.listen(port);

  console.log(`🚀  Server running on http://localhost:${port}`);
  console.log(`   POST /admin/upload  — ingest PDF into knowledge base`);
  console.log(`   POST /chat          — agentic RAG chat (MCP tool retrieval)`);
}
bootstrap();
