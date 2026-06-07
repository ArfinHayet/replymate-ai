import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentChunk } from '../../features/document/document-chunk.entity';
import { AuthModule } from '../../features/auth/auth.module';
import { LlmFactoryModule } from '../llm/llm-factory.module';
import { HybridRetrievalService } from './hybrid-retrieval.service';
import { KnowledgeGraphController } from './knowledge-graph.controller';
import { KnowledgeEntityMention } from './knowledge-entity-mention.entity';
import { KnowledgeEntity } from './knowledge-entity.entity';
import { KnowledgeGraphBackfillService } from './knowledge-graph-backfill.service';
import { KnowledgeGraphExtractionService } from './knowledge-graph-extraction.service';
import { KnowledgeGraphService } from './knowledge-graph.service';
import { KnowledgeRelation } from './knowledge-relation.entity';
import { RetrievalService } from './retrieval.service';
import { ToolRetrievalService } from './tool-retrieval.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DocumentChunk,
      KnowledgeEntity,
      KnowledgeEntityMention,
      KnowledgeRelation,
    ]),
    AuthModule,
    LlmFactoryModule,
  ],
  controllers: [KnowledgeGraphController],
  providers: [
    RetrievalService,
    ToolRetrievalService,
    HybridRetrievalService,
    KnowledgeGraphService,
    KnowledgeGraphExtractionService,
    KnowledgeGraphBackfillService,
  ],
  exports: [
    RetrievalService,
    ToolRetrievalService,
    KnowledgeGraphService,
    KnowledgeGraphExtractionService,
    KnowledgeGraphBackfillService,
  ],
})
export class RetrievalModule {}
