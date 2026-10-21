import { Module } from '@nestjs/common';
import { RetrievalModule } from '../retrieval/retrieval.module';
import { LlmFactoryModule } from '../llm/llm-factory.module';
import { AgenticLoopService } from './agentic-loop.service';
import { AiService } from './ai.service';
import { MediaAiService } from './media-ai.service';
import { QueryIntentClassifier } from './query-intent.classifier';

@Module({
  imports: [RetrievalModule, LlmFactoryModule],
  providers: [
    AiService,
    QueryIntentClassifier,
    AgenticLoopService,
    MediaAiService,
  ],
  exports: [AiService],
})
export class AiModule {}
