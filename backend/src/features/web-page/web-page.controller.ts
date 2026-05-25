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
  Res,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Response } from 'express';
import { WebPageService } from './web-page.service';
import { IngestUrlsDto } from './dto/ingest-urls.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CheckContentLimit } from '../usage/content-limit.decorator';
import { ContentLimitGuard } from '../usage/content-limit.guard';

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
  @CheckContentLimit('webPages')
  @UseGuards(ContentLimitGuard)
  async ingestUrls(
    @Body() dto: IngestUrlsDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const urls = (dto.urls ?? []).map((u) => u.trim()).filter(Boolean);
    if (urls.length === 0) throw new BadRequestException('At least one URL is required');

    const userId = (req.user as { id: string }).id;
    const results: Array<{
      url: string;
      success: boolean;
      title?: string;
      chunksCreated?: number;
      pagesFetched?: number;
      pagesFailed?: number;
      webPageId?: string;
      error?: string;
    }> = [];

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    send('start', { total: urls.length });

    for (const url of urls) {
      try {
        send('url-start', { url });
        const ingestResult = await this.webPageService.ingestUrl(url, userId, (event) => {
          send(event.type, { rootUrl: event.rootUrl, url: event.url });
        });
        const result = {
          url,
          success: true,
          title: ingestResult.title,
          chunksCreated: ingestResult.chunksCreated,
          pagesFetched: ingestResult.pagesFetched,
          pagesFailed: ingestResult.pagesFailed,
          webPageId: ingestResult.webPageId,
        };
        results.push(result);
        send('url-result', result);
      } catch (err) {
        const result = { url, success: false, error: (err as Error).message };
        results.push(result);
        send('url-result', result);
      }
    }

    send('done', { pages: results });
    res.end();
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
