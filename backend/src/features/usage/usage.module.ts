import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AiMessageUsage } from "./ai-message-usage.entity";
import { PlanController } from "./plan.controller";
import { Plan } from "./plan.entity";
import { UsageService } from "./usage.service";

@Module({
  imports: [TypeOrmModule.forFeature([Plan, AiMessageUsage])],
  controllers: [PlanController],
  providers: [UsageService],
  exports: [UsageService]
})
export class UsageModule {}
