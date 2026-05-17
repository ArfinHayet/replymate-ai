import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { WidgetKey } from './widget-key.entity';

@Injectable()
export class WidgetKeyService {
  constructor(
    @InjectRepository(WidgetKey)
    private readonly repo: Repository<WidgetKey>,
  ) {}

  findAll(userId: string): Promise<WidgetKey[]> {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  create(userId: string, label: string): Promise<WidgetKey> {
    return this.repo.save(
      this.repo.create({
        userId,
        key: `wk_${randomUUID().replace(/-/g, '')}`,
        label: label || 'My Widget',
      }),
    );
  }

  async remove(id: string, userId: string): Promise<void> {
    const record = await this.repo.findOne({ where: { id, userId } });
    if (!record) throw new NotFoundException(`Widget key ${id} not found`);
    await this.repo.remove(record);
  }

  /** Used by the guard and middleware — finds by public key value */
  findByKey(key: string): Promise<WidgetKey | null> {
    return this.repo.findOne({ where: { key } });
  }
}
