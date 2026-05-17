import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Embeddings } from '@langchain/core/embeddings';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { ImageRecord } from './image.entity';
import { UpdateImageDto } from './dto/update-image.dto';
import { AiService } from '../../core/ai/ai.service';
import { LlmFactoryService } from '../../core/llm/llm-factory.service';

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);
  private readonly supabase: SupabaseClient;
  private readonly embeddings: Embeddings;
  private readonly bucket: string;

  constructor(
    @InjectRepository(ImageRecord)
    private readonly imageRepo: Repository<ImageRecord>,
    private readonly config: ConfigService,
    private readonly aiService: AiService,
    private readonly llmFactory: LlmFactoryService,
  ) {
    this.supabase = createClient(
      this.config.get<string>('supabase.url')!,
      this.config.get<string>('supabase.serviceRoleKey')!,
    );
    this.bucket = this.config.get<string>('supabase.imagesBucket') ?? 'images';
    this.logger.log(`Using Supabase Storage bucket: "${this.bucket}"`);
    this.embeddings = this.llmFactory.getEmbeddings();
  }

  analyzeImage(base64: string, mimeType: string) {
    return this.aiService.analyzeImage(base64, mimeType);
  }

  async saveImage(
    userId: string,
    file: Express.Multer.File,
    title: string,
    description: string,
  ): Promise<ImageRecord> {
    // 1. Upload binary to Supabase Storage
    const ext = extname(file.originalname) || '.jpg';
    const storagePath = `${userId}/${randomUUID()}${ext}`;

    const { error: uploadError } = await this.supabase.storage
      .from(this.bucket)
      .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false });

    if (uploadError) {
      this.logger.error(`Storage upload failed: ${uploadError.message}`);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // 2. Get public URL
    const { data: urlData } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(storagePath);
    const storageUrl = urlData.publicUrl;

    // 3. Embed title + description via LangChain
    const embedding = await this.embeddings.embedQuery(`${title} ${description}`);

    // 4. Persist
    const record = this.imageRepo.create({
      userId,
      title,
      description,
      storageUrl,
      embedding: JSON.stringify(embedding),
    });
    const saved = await this.imageRepo.save(record);
    this.logger.log(`Image saved: ${saved.id} for user ${userId}`);
    return saved;
  }

  findAll(userId: string): Promise<ImageRecord[]> {
    return this.imageRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, userId: string): Promise<ImageRecord> {
    const record = await this.imageRepo.findOne({ where: { id, userId } });
    if (!record) throw new NotFoundException(`Image ${id} not found`);
    return record;
  }

  async update(id: string, userId: string, dto: UpdateImageDto): Promise<ImageRecord> {
    const record = await this.findOne(id, userId);
    if (dto.title !== undefined) record.title = dto.title;
    if (dto.description !== undefined) record.description = dto.description;

    // Re-embed whenever text changes
    const newEmbedding = await this.embeddings.embedQuery(
      `${record.title} ${record.description}`,
    );
    record.embedding = JSON.stringify(newEmbedding);

    return this.imageRepo.save(record);
  }

  async remove(id: string, userId: string): Promise<void> {
    const record = await this.findOne(id, userId);
    await this.imageRepo.remove(record);
  }
}
