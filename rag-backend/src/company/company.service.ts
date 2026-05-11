import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './company.entity';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly repo: Repository<Company>,
  ) {}

  findAll(): Promise<Company[]> {
    return this.repo.find({ order: { updatedAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Company> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException(`Company ${id} not found`);
    return c;
  }

  create(dto: CreateCompanyDto): Promise<Company> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<Company> {
    const c = await this.findOne(id);
    Object.assign(c, dto);
    return this.repo.save(c);
  }

  async remove(id: string): Promise<void> {
    const c = await this.findOne(id);
    await this.repo.remove(c);
  }

  /** Returns the most-recently updated company, or null. Used by ChatService. */
  getActive(): Promise<Company | null> {
    return this.repo.findOne({ order: { updatedAt: 'DESC' }, where: {} });
  }
}
