import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfileCompletionService } from './profile-completion.service';

@Controller('profile-completion')
@UseGuards(JwtAuthGuard)
export class ProfileCompletionController {
  constructor(private readonly svc: ProfileCompletionService) {}

  @Get()
  getStatus(@Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.svc.getStatus(userId);
  }
}
