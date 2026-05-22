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

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage]),
    AiModule,
    CacheModule,
    CompanyModule,
    RetrievalModule,
    UsageModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
