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

  app.enableCors({ origin: '*' });

  const port = config.get<number>('port') || 3000;
  await app.listen(port);

  console.log(`🚀  Server running on http://localhost:${port}`);
  console.log(`   POST /admin/upload  — ingest PDF into knowledge base`);
  console.log(`   POST /chat          — agentic RAG chat (MCP tool retrieval)`);
}
bootstrap();
