import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './company.entity';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { ProfileCompletionModule } from '../profile-completion/profile-completion.module';

@Module({
  imports: [TypeOrmModule.forFeature([Company]), ProfileCompletionModule],
  controllers: [CompanyController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}
