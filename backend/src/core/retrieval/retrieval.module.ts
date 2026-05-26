import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentChunk } from '../../features/document/document-chunk.entity';
import { LlmFactoryModule } from '../llm/llm-factory.module';
import { RetrievalService } from './retrieval.service';
import { ToolRetrievalService } from './tool-retrieval.service';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentChunk]), LlmFactoryModule],
  providers: [RetrievalService, ToolRetrievalService],
  exports: [RetrievalService, ToolRetrievalService],
})
export class RetrievalModule {}
