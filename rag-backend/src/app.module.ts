import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import configuration from './config/configuration';
import { DocumentChunk } from './document/document-chunk.entity';
import { Pdf } from './document/pdf.entity';
import { Company } from './company/company.entity';
import { ChatMessage } from './chat/chat-message.entity';
import { CachedAnswer } from './cache/cached-answer.entity';
import { DocumentModule } from './document/document.module';
import { ChatModule } from './chat/chat.module';
import { RetrievalModule } from './retrieval/retrieval.module';
import { GeminiModule } from './gemini/gemini.module';
import { CacheModule } from './cache/cache.module';
import { AuthModule } from './auth/auth.module';
import { CompanyModule } from './company/company.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('databaseUrl'),
        entities: [DocumentChunk, Pdf, Company, ChatMessage, CachedAnswer],
        synchronize: true,
        logging: false,
        extra: {
          options: '-c search_path=public',
          prepare: false,   // Required for Supabase Transaction Pooler (PgBouncer)
        },
        ssl: { rejectUnauthorized: false },
      }),
    }),
    CompanyModule,
    DocumentModule,
    RetrievalModule,
    GeminiModule,
    CacheModule,
    ChatModule,
    AuthModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector;');
  }
}
