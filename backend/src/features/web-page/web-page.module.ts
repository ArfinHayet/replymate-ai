import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebPage } from './web-page.entity';
import { WebPageChunk } from './web-page-chunk.entity';
import { LlmFactoryModule } from '../../core/llm/llm-factory.module';
import { WebPageService } from './web-page.service';
import { WebPageController } from './web-page.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WebPage, WebPageChunk]), LlmFactoryModule],
  controllers: [WebPageController],
  providers: [WebPageService],
})
export class WebPageModule {}
