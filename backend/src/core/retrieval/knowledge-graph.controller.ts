import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../features/auth/guards/jwt-auth.guard';
import { KnowledgeGraphBackfillService } from './knowledge-graph-backfill.service';

type BackfillRequestBody = {
  perSourceChunkLimit?: number;
};

@Controller()
export class KnowledgeGraphController {
  constructor(private readonly backfillService: KnowledgeGraphBackfillService) {}

  @Post('admin/knowledge-graph/backfill')
  @UseGuards(JwtAuthGuard)
  backfill(@Req() req: Request, @Body() body: BackfillRequestBody) {
    const userId = (req.user as { id: string }).id;
    return this.backfillService.backfillUser(userId, body?.perSourceChunkLimit);
  }
}
