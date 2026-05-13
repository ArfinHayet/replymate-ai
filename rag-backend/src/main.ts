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
  const allowedOrigins = (config.get<string>('cors.origins') || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: (origin, callback) => {
      // Allow server-to-server / curl requests (no Origin header)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  });

  const port = config.get<number>('port') || 3000;
  await app.listen(port);

  console.log(`🚀  Server running on http://localhost:${port}`);
  console.log(`   POST /admin/upload  — ingest PDF into knowledge base`);
  console.log(`   POST /chat          — agentic RAG chat (MCP tool retrieval)`);
}
bootstrap();
