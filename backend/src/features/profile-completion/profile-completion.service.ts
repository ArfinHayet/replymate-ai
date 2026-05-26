import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../company/company.entity';
import { Pdf } from '../document/pdf.entity';
import { WebPage } from '../web-page/web-page.entity';
import { ProfileCompletion } from './profile-completion.entity';

@Injectable()
export class ProfileCompletionService {
  constructor(
    @InjectRepository(ProfileCompletion)
    private readonly repo: Repository<ProfileCompletion>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Pdf)
    private readonly pdfRepo: Repository<Pdf>,
    @InjectRepository(WebPage)
    private readonly webPageRepo: Repository<WebPage>,
  ) {}

  async getStatus(userId: string): Promise<ProfileCompletion> {
    return this.refresh(userId);
  }

  async refresh(userId: string): Promise<ProfileCompletion> {
    const [companyCount, pdfCount, webPageCount] = await Promise.all([
      this.companyRepo.count({ where: { userId } }),
      this.pdfRepo.count({ where: { userId } }),
      this.webPageRepo.count({ where: { userId } }),
    ]);

    const hasCompanyInfo = companyCount > 0;
    const hasContentSource = pdfCount > 0 || webPageCount > 0;
    const completionPercent =
      Number(hasCompanyInfo) * 50 + Number(hasContentSource) * 50;

    const status = this.repo.create({
      userId,
      hasCompanyInfo,
      hasContentSource,
      companyCount,
      pdfCount,
      webPageCount,
      completionPercent,
      isComplete: hasCompanyInfo && hasContentSource,
    });

    return this.repo.save(status);
  }
}
