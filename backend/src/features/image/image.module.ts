import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImageRecord } from './image.entity';
import { ImageService } from './image.service';
import { ImageController } from './image.controller';
import { AiModule } from '../../core/ai/ai.module';
import { LlmFactoryModule } from '../../core/llm/llm-factory.module';

@Module({
  imports: [TypeOrmModule.forFeature([ImageRecord]), AiModule, LlmFactoryModule],
  controllers: [ImageController],
  providers: [ImageService],
})
export class ImageModule {}
