import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CrawlerService } from './crawler.service';

interface StartCrawlDto {
  url: string;
  maxPages?: number;
}

@Controller('crawl')
export class CrawlerController {
  constructor(private readonly crawlerService: CrawlerService) {}

  @Post()
  async startCrawl(@Body() dto: StartCrawlDto) {
    const job = await this.crawlerService.startCrawl(dto.url, dto.maxPages);
    return {
      jobId: job.id,
      domain: job.domain,
      totalPages: job.pagesFound,
      totalChunks: job.totalChunks,
      status: job.status,
    };
  }

  @Get(':jobId')
  getCrawlJob(@Param('jobId') jobId: string) {
    return this.crawlerService.getJob(jobId);
  }
}
