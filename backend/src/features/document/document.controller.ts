import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { DocumentService } from './document.service';
import { CsvService } from './csv.service';
import { UpdatePdfDto } from './dto/update-pdf.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CheckContentLimit } from '../usage/content-limit.decorator';
import { ContentLimitGuard } from '../usage/content-limit.guard';

@Controller()
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly csvService: CsvService,
  ) {}

  @Post('admin/upload')
  @CheckContentLimit('pdfs')
  @UseGuards(JwtAuthGuard, ContentLimitGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(new BadRequestException('Only PDF files are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async uploadPdf(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    console.log('[upload] request received', {
      hasAuthHeader: !!req.headers['authorization'],
      hasUser: !!req.user,
      user: req.user ?? null,
      hasFile: !!file,
      fileName: file?.originalname ?? null,
      fileSize: file?.size ?? null,
      mimetype: file?.mimetype ?? null,
    });

    if (!file) throw new BadRequestException('No file provided');
    const userId = (req.user as { id: string }).id;
    console.log('[upload] starting ingest', { userId, fileName: file.originalname, fileSize: file.size });

    try {
      const result = await this.documentService.ingestPdf(file, userId);
      console.log('[upload] ingest complete', result);
      return result;
    } catch (err) {
      console.error('[upload] ingest failed', {
        error: (err as Error).message,
        stack: (err as Error).stack,
        userId,
        fileName: file.originalname,
      });
      throw err;
    }
  }

  @Get('pdfs')
  @UseGuards(JwtAuthGuard)
  findAll(@Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.documentService.findAllPdfs(userId);
  }

  @Get('pdfs/:id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.documentService.findOnePdf(id, userId);
  }

  @Patch('pdfs/:id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdatePdfDto, @Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.documentService.updatePdf(id, userId, dto);
  }

  @Delete('pdfs/:id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.documentService.deletePdf(id, userId);
  }

  // ─── CSV routes ─────────────────────────────────────────────────────────────

  @Post('admin/upload/csv')
  @CheckContentLimit('csvs')
  @UseGuards(JwtAuthGuard, ContentLimitGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        const isCsv =
          file.mimetype === 'text/csv' ||
          file.mimetype === 'application/vnd.ms-excel' ||
          file.originalname.toLowerCase().endsWith('.csv');
        if (!isCsv) {
          return cb(new BadRequestException('Only CSV files are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadCsv(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) throw new BadRequestException('No file provided');
    const userId = (req.user as { id: string }).id;
    return this.csvService.ingestCsv(file, userId);
  }

  @Get('csvs')
  @UseGuards(JwtAuthGuard)
  findAllCsvs(@Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.csvService.findAllCsvs(userId);
  }

  @Get('csvs/:id')
  @UseGuards(JwtAuthGuard)
  findOneCsv(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.csvService.findOneCsv(id, userId);
  }

  @Delete('csvs/:id')
  @UseGuards(JwtAuthGuard)
  removeCsv(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.csvService.deleteCsv(id, userId);
  }
}
