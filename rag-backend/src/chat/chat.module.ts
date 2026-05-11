import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from './chat-message.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { GeminiModule } from '../gemini/gemini.module';
import { CacheModule } from '../cache/cache.module';
import { CompanyModule } from '../company/company.module';
import { RetrievalModule } from '../retrieval/retrieval.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage]),
    GeminiModule,
    CacheModule,
    CompanyModule,
    RetrievalModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
