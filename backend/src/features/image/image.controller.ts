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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ImageService } from './image.service';
import { AnalyzeImageDto } from './dto/analyze-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';

@Controller('images')
@UseGuards(JwtAuthGuard)
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  /** Analyze an image and return an auto-generated title + description. */
  @Post('analyze')
  analyze(@Body() dto: AnalyzeImageDto) {
    if (!dto.base64 || !dto.mimeType) {
      throw new BadRequestException('base64 and mimeType are required');
    }
    return this.imageService.analyzeImage(dto.base64, dto.mimeType);
  }

  /** Save an image: uploads binary to Supabase Storage, embeds text, persists record */
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  save(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
    @Body('description') description: string,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!title?.trim()) throw new BadRequestException('title is required');
    if (!description?.trim()) throw new BadRequestException('description is required');
    const userId = (req.user as { id: string }).id;
    return this.imageService.saveImage(userId, file, title.trim(), description.trim());
  }

  @Get()
  findAll(@Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.imageService.findAll(userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateImageDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as { id: string }).id;
    return this.imageService.update(id, userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.imageService.remove(id, userId);
  }
}
