import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpsertWhatsappIntegrationDto } from './dto/upsert-whatsapp-integration.dto';
import { WhatsappService } from './whatsapp.service';
import type { RawBodyRequest, WhatsappWebhookPayload } from './whatsapp.types';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('integration')
  @UseGuards(JwtAuthGuard)
  getIntegration(@Req() req: Request) {
    return this.whatsappService.getIntegration((req.user as { id: string }).id);
  }

  @Post('integration')
  @UseGuards(JwtAuthGuard)
  upsertIntegration(
    @Body() body: UpsertWhatsappIntegrationDto,
    @Req() req: Request,
  ) {
    return this.whatsappService.upsertIntegration(
      (req.user as { id: string }).id,
      body,
    );
  }

  @Delete('integration')
  @UseGuards(JwtAuthGuard)
  disconnectIntegration(@Req() req: Request) {
    return this.whatsappService.disconnectIntegration((req.user as { id: string }).id);
  }

  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ) {
    return this.whatsappService.verifyWebhook(mode, token, challenge);
  }

  @Post('webhook')
  handleWebhook(
    @Body() body: WhatsappWebhookPayload,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Req() req: RawBodyRequest,
  ) {
    return this.whatsappService.handleWebhook(body, signature, req.rawBody);
  }
}
