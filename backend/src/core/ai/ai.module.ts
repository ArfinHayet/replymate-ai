import { Module } from '@nestjs/common';
import { RetrievalModule } from '../retrieval/retrieval.module';
import { LlmFactoryModule } from '../llm/llm-factory.module';
import { AiService } from './ai.service';

@Module({
  imports: [RetrievalModule, LlmFactoryModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
