import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentChunk } from './document-chunk.entity';
import { Pdf } from './pdf.entity';
import { LlmFactoryModule } from '../../core/llm/llm-factory.module';
import { AiModule } from '../../core/ai/ai.module';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { UsageModule } from '../usage/usage.module';
import { ProfileCompletionModule } from '../profile-completion/profile-completion.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentChunk, Pdf]),
    LlmFactoryModule,
    AiModule,
    UsageModule,
    ProfileCompletionModule,
  ],
  controllers: [DocumentController],
  providers: [DocumentService],
})
export class DocumentModule {}
