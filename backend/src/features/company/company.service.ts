import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Company } from './company.entity';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';
import { ProfileCompletionService } from '../profile-completion/profile-completion.service';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly repo: Repository<Company>,
    private readonly dataSource: DataSource,
    private readonly profileCompletionService: ProfileCompletionService,
  ) {}

  findAll(userId: string): Promise<Company[]> {
    return this.repo.find({ where: { userId }, order: { updatedAt: 'DESC' } });
  }

  async findOne(id: string, userId: string): Promise<Company> {
    const c = await this.repo.findOne({ where: { id, userId } });
    if (!c) throw new NotFoundException(`Company ${id} not found`);
    return c;
  }

  async create(dto: CreateCompanyDto, userId: string): Promise<Company> {
    const company = await this.repo.save(this.repo.create({ ...dto, userId }));
    await this.dataSource.query(
      `DELETE FROM cached_answers WHERE "userId" = $1`,
      [userId],
    );
    await this.profileCompletionService.refresh(userId);
    return company;
  }

  async update(id: string, userId: string, dto: UpdateCompanyDto): Promise<Company> {
    const c = await this.findOne(id, userId);
    Object.assign(c, dto);
    const saved = await this.repo.save(c);
    await this.dataSource.query(
      `DELETE FROM cached_answers WHERE "userId" = $1`,
      [userId],
    );
    await this.profileCompletionService.refresh(userId);
    return saved;
  }

  async remove(id: string, userId: string): Promise<void> {
    const c = await this.findOne(id, userId);
    await this.repo.remove(c);
    await this.profileCompletionService.refresh(userId);
  }

  /** Returns the most-recently updated company for this user, or null. Used by ChatService. */
  getActive(userId: string): Promise<Company | null> {
    return this.repo.findOne({ where: { userId }, order: { updatedAt: 'DESC' } });
  }
}
