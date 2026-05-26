import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatToolsController } from './chat-tools.controller';
import { ChatToolConfig } from './chat-tool-config.entity';
import { ChatToolsService } from './chat-tools.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatToolConfig])],
  controllers: [ChatToolsController],
  providers: [ChatToolsService],
  exports: [ChatToolsService],
})
export class ChatToolsModule {}
