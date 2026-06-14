import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LlmFactoryModule } from '../../core/llm/llm-factory.module';
import { WebPageChunk } from '../web-page/web-page-chunk.entity';
import { WebPage } from '../web-page/web-page.entity';
import { IngestionService } from './ingestion.service';

@Module({
  imports: [TypeOrmModule.forFeature([WebPage, WebPageChunk]), LlmFactoryModule],
  providers: [IngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}
