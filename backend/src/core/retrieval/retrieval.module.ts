import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentChunk } from '../../features/document/document-chunk.entity';
import { LlmFactoryModule } from '../llm/llm-factory.module';
import { RetrievalService } from './retrieval.service';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentChunk]), LlmFactoryModule],
  providers: [RetrievalService],
  exports: [RetrievalService],
})
export class RetrievalModule {}
