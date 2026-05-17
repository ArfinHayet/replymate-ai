import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AllowedDomain } from './allowed-domain.entity';

@Injectable()
export class AllowedDomainService {
  constructor(
    @InjectRepository(AllowedDomain)
    private readonly repo: Repository<AllowedDomain>,
  ) {}

  findAll(userId: string): Promise<AllowedDomain[]> {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  create(userId: string, domain: string): Promise<AllowedDomain> {
    // Normalize: lowercase, strip trailing slash
    const normalized = domain.toLowerCase().replace(/\/+$/, '');
    return this.repo.save(this.repo.create({ userId, domain: normalized }));
  }

  async remove(id: string, userId: string): Promise<void> {
    const record = await this.repo.findOne({ where: { id, userId } });
    if (!record) throw new NotFoundException(`Domain ${id} not found`);
    await this.repo.remove(record);
  }

  /** Used by guard/middleware — checks if origin is whitelisted for a userId */
  async isAllowed(userId: string, origin: string): Promise<boolean> {
    const normalized = origin.toLowerCase().replace(/\/+$/, '');
    const found = await this.repo.findOne({ where: { userId, domain: normalized } });
    return !!found;
  }
}
