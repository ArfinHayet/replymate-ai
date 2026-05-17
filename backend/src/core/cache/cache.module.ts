import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CachedAnswer } from './cached-answer.entity';
import { CacheService } from './cache.service';

@Module({
  imports: [TypeOrmModule.forFeature([CachedAnswer]), ConfigModule],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
