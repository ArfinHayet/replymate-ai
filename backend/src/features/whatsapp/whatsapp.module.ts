import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatModule } from '../chat/chat.module';
import { WhatsappCryptoService } from './whatsapp-crypto.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappIntegration } from './whatsapp-integration.entity';
import { WhatsappMessageEvent } from './whatsapp-message-event.entity';
import { WhatsappService } from './whatsapp.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WhatsappIntegration, WhatsappMessageEvent]),
    ChatModule,
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappCryptoService],
})
export class WhatsappModule {}
