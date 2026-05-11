import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CachedAnswer } from './cached-answer.entity';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    @InjectRepository(CachedAnswer)
    private readonly cacheRepo: Repository<CachedAnswer>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async findHit(queryVector: number[]): Promise<string | null> {
    const rows: { answer: string; distance: string }[] =
      await this.dataSource.query(
        `SELECT answer, ("questionEmbedding"::vector <=> $1::vector) AS distance
         FROM cached_answers
         ORDER BY distance ASC
         LIMIT 1`,
        [JSON.stringify(queryVector)],
      );

    const threshold = this.config.get<number>('rag.cacheThreshold') ?? 0.07;
    if (rows.length > 0) {
      const dist = parseFloat(rows[0].distance);
      this.logger.log(`Cache nearest distance: ${dist.toFixed(4)} (threshold: ${threshold})`);
      if (dist < threshold) {
        this.logger.log('Semantic cache HIT');
        return rows[0].answer;
      }
      this.logger.log('Semantic cache MISS — distance too large');
    }
    return null;
  }

  async save(
    question: string,
    questionVector: number[],
    answer: string,
  ): Promise<void> {
    await this.cacheRepo.save(
      this.cacheRepo.create({
        question,
        questionEmbedding: JSON.stringify(questionVector),
        answer,
      }),
    );
    this.logger.log(`Cached: "${question.slice(0, 60)}"`);
  }
}
