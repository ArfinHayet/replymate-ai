import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreatePlanDto, UpdatePlanDto } from "./dto/plan.dto";
import { UsageService } from "./usage.service";

@Controller("plans")
@UseGuards(JwtAuthGuard)
export class PlanController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  findAll() {
    return this.usageService.findPlans();
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.usageService.findPlan(id);
  }

  @Post()
  create(@Body() dto: CreatePlanDto) {
    return this.usageService.createPlan(dto);
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdatePlanDto) {
    return this.usageService.updatePlan(id, dto);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.usageService.removePlan(id);
  }
}
