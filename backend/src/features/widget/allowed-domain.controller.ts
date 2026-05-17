import { Controller, Get, Post, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AllowedDomainService } from './allowed-domain.service';

class CreateDomainDto {
  domain!: string;
}

@Controller('widget/domains')
@UseGuards(JwtAuthGuard)
export class AllowedDomainController {
  constructor(private readonly svc: AllowedDomainService) {}

  @Get()
  findAll(@Req() req: Request) {
    return this.svc.findAll((req.user as { id: string }).id);
  }

  @Post()
  create(@Body() dto: CreateDomainDto, @Req() req: Request) {
    return this.svc.create((req.user as { id: string }).id, dto.domain);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.svc.remove(id, (req.user as { id: string }).id);
  }
}
