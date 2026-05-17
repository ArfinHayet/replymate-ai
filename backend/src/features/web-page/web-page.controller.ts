import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { WebPageService } from './web-page.service';
import { IngestUrlsDto } from './dto/ingest-urls.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class WebPageController {
  constructor(private readonly webPageService: WebPageService) {}

  /**
   * POST /admin/ingest-urls
   * Ingests one or more URLs via Jina Reader, chunks + embeds each one.
   * Processes URLs sequentially; per-URL errors are collected without aborting the batch.
   */
  @Post('admin/ingest-urls')
  async ingestUrls(@Body() dto: IngestUrlsDto, @Req() req: Request) {
    const urls = (dto.urls ?? []).map((u) => u.trim()).filter(Boolean);
    if (urls.length === 0) throw new BadRequestException('At least one URL is required');

    const userId = (req.user as { id: string }).id;
    const results: Array<{ url: string; success: boolean; title?: string; chunksCreated?: number; webPageId?: string; error?: string }> = [];

    for (const url of urls) {
      try {
        const res = await this.webPageService.ingestUrl(url, userId);
        results.push({ url, success: true, title: res.title, chunksCreated: res.chunksCreated, webPageId: res.webPageId });
      } catch (err) {
        results.push({ url, success: false, error: (err as Error).message });
      }
    }

    return { pages: results };
  }

  /** GET /web-pages — list all ingested web pages for the authenticated user */
  @Get('web-pages')
  findAll(@Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.webPageService.findAll(userId);
  }

  /**
   * POST /web-pages/:id/refetch
   * Clears existing chunks + cached answers for this page, then re-fetches and re-embeds.
   */
  @Post('web-pages/:id/refetch')
  refetch(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.webPageService.refetchUrl(id, userId);
  }

  /** DELETE /web-pages/:id — remove the web page and all its chunks */
  @Delete('web-pages/:id')
  remove(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.webPageService.deleteWebPage(id, userId);
  }
}
