import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import configuration from './config/configuration';
import { DocumentChunk } from './features/document/document-chunk.entity';
import { Pdf } from './features/document/pdf.entity';
import { Company } from './features/company/company.entity';
import { ChatMessage } from './features/chat/chat-message.entity';
import { ChatSuggestion } from './features/chat/chat-suggestion.entity';
import { CachedAnswer } from './core/cache/cached-answer.entity';
import { WidgetKey } from './features/widget/widget-key.entity';
import { AllowedDomain } from './features/widget/allowed-domain.entity';
import { DocumentModule } from './features/document/document.module';
import { ChatModule } from './features/chat/chat.module';
import { RetrievalModule } from './core/retrieval/retrieval.module';
import { AiModule } from './core/ai/ai.module';
import { CacheModule } from './core/cache/cache.module';
import { AuthModule } from './features/auth/auth.module';
import { CompanyModule } from './features/company/company.module';
import { WidgetModule } from './features/widget/widget.module';
import { ImageRecord } from './features/image/image.entity';
import { ImageModule } from './features/image/image.module';
import { WebPage } from './features/web-page/web-page.entity';
import { WebPageChunk } from './features/web-page/web-page-chunk.entity';
import { WebPageModule } from './features/web-page/web-page.module';
import { WhatsappIntegration } from './features/whatsapp/whatsapp-integration.entity';
import { WhatsappMessageEvent } from './features/whatsapp/whatsapp-message-event.entity';
import { WhatsappModule } from './features/whatsapp/whatsapp.module';
import { Plan } from './features/usage/plan.entity';
import { AiMessageUsage } from './features/usage/ai-message-usage.entity';
import { UsageModule } from './features/usage/usage.module';
import { PaymentsModule } from './features/payments/payments.module';
import { ProfileCompletion } from './features/profile-completion/profile-completion.entity';
import { ProfileCompletionModule } from './features/profile-completion/profile-completion.module';
import { ChatToolConfig } from './features/chat-tools/chat-tool-config.entity';
import { ChatToolsModule } from './features/chat-tools/chat-tools.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', 'backend/.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('databaseUrl'),
        entities: [DocumentChunk, Pdf, Company, ChatMessage, ChatSuggestion, CachedAnswer, WidgetKey, AllowedDomain, ImageRecord, WebPage, WebPageChunk, WhatsappIntegration, WhatsappMessageEvent, Plan, AiMessageUsage, ProfileCompletion, ChatToolConfig],
        synchronize: false,
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
    AiModule,
    CacheModule,
    ChatModule,
    AuthModule,
    WidgetModule,
    ImageModule,
    WebPageModule,
    WhatsappModule,
    UsageModule,
    PaymentsModule,
    ProfileCompletionModule,
    ChatToolsModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector;');
  }
}
 
