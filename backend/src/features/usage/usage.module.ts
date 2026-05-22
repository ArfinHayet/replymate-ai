import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiMessageUsage } from './ai-message-usage.entity';
import { Plan } from './plan.entity';
import { UsageService } from './usage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Plan, AiMessageUsage])],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
