import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../company/company.entity';
import { Pdf } from '../document/pdf.entity';
import { WebPage } from '../web-page/web-page.entity';
import { ProfileCompletionController } from './profile-completion.controller';
import { ProfileCompletion } from './profile-completion.entity';
import { ProfileCompletionService } from './profile-completion.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProfileCompletion, Company, Pdf, WebPage])],
  controllers: [ProfileCompletionController],
  providers: [ProfileCompletionService],
  exports: [ProfileCompletionService],
})
export class ProfileCompletionModule {}
