import { Controller, Get, Post, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WidgetKeyService } from './widget-key.service';

class CreateKeyDto {
  label!: string;
}

@Controller('widget/keys')
@UseGuards(JwtAuthGuard)
export class WidgetKeyController {
  constructor(private readonly svc: WidgetKeyService) {}

  @Get()
  findAll(@Req() req: Request) {
    return this.svc.findAll((req.user as { id: string }).id);
  }

  @Post()
  create(@Body() dto: CreateKeyDto, @Req() req: Request) {
    return this.svc.create((req.user as { id: string }).id, dto.label);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.svc.remove(id, (req.user as { id: string }).id);
  }
}
