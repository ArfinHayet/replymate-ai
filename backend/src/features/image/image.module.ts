import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImageRecord } from './image.entity';
import { ImageService } from './image.service';
import { ImageController } from './image.controller';
import { AiModule } from '../../core/ai/ai.module';
import { LlmFactoryModule } from '../../core/llm/llm-factory.module';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [TypeOrmModule.forFeature([ImageRecord]), AiModule, LlmFactoryModule, UsageModule],
  controllers: [ImageController],
  providers: [ImageService],
})
export class ImageModule {}
