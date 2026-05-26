import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from './chat-message.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { AiModule } from '../../core/ai/ai.module';
import { CacheModule } from '../../core/cache/cache.module';
import { CompanyModule } from '../company/company.module';
import { RetrievalModule } from '../../core/retrieval/retrieval.module';
import { UsageModule } from '../usage/usage.module';
import { ChatToolsModule } from '../chat-tools/chat-tools.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage]),
    AiModule,
    CacheModule,
    CompanyModule,
    RetrievalModule,
    UsageModule,
    ChatToolsModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
