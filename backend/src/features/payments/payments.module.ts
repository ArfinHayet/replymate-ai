import { Module } from '@nestjs/common';
import { UsageModule } from '../usage/usage.module';
import { CreemClient } from '../../lib/creem/creem.client';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [UsageModule],
  controllers: [PaymentsController],
  providers: [CreemClient],
})
export class PaymentsModule {}
