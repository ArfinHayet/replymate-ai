import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WidgetKey } from './widget-key.entity';
import { AllowedDomain } from './allowed-domain.entity';
import { WidgetKeyService } from './widget-key.service';
import { AllowedDomainService } from './allowed-domain.service';
import { WidgetKeyGuard } from './widget-key.guard';
import { WidgetCorsMiddleware } from './widget-cors.middleware';
import { WidgetKeyController } from './widget-key.controller';
import { AllowedDomainController } from './allowed-domain.controller';
import { WidgetController } from './widget.controller';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [TypeOrmModule.forFeature([WidgetKey, AllowedDomain]), ChatModule],
  controllers: [WidgetKeyController, AllowedDomainController, WidgetController],
  providers: [WidgetKeyService, AllowedDomainService, WidgetKeyGuard, WidgetCorsMiddleware],
})
export class WidgetModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(WidgetCorsMiddleware).forRoutes('widget/*path', 'widget.js');
  }
}
