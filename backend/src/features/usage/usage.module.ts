import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AiMessageUsage } from "./ai-message-usage.entity";
import { ContentLimitGuard } from "./content-limit.guard";
import { PlanController } from "./plan.controller";
import { Plan } from "./plan.entity";
import { UsageService } from "./usage.service";

@Module({
  imports: [TypeOrmModule.forFeature([Plan, AiMessageUsage])],
  controllers: [PlanController],
  providers: [UsageService, ContentLimitGuard],
  exports: [UsageService, ContentLimitGuard]
})
export class UsageModule {}
