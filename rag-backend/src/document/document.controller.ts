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
  // UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DocumentService } from './document.service';
import { UpdatePdfDto } from './dto/update-pdf.dto';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller()
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('admin/upload')
  // @UseGuards(JwtAuthGuard)
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
  async uploadPdf(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    return this.documentService.ingestPdf(file);
  }

  @Get('pdfs')
  findAll() {
    return this.documentService.findAllPdfs();
  }

  @Get('pdfs/:id')
  findOne(@Param('id') id: string) {
    return this.documentService.findOnePdf(id);
  }

  @Patch('pdfs/:id')
  update(@Param('id') id: string, @Body() dto: UpdatePdfDto) {
    return this.documentService.updatePdf(id, dto);
  }

  @Delete('pdfs/:id')
  remove(@Param('id') id: string) {
    return this.documentService.deletePdf(id);
  }
}
