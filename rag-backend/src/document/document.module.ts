import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentChunk } from './document-chunk.entity';
import { Pdf } from './pdf.entity';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentChunk, Pdf])],
  controllers: [DocumentController],
  providers: [DocumentService],
})
export class DocumentModule {}
