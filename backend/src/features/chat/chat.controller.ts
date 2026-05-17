import { Controller, Post, Get, Body, BadRequestException, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class ChatRequestDto {
  'message': string;
  'sessionId': string;
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getHistory(@Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.chatService.getHistory(userId);
  }

    @Post()
  @UseGuards(JwtAuthGuard)
  async chat(@Body() body: ChatRequestDto, @Req() req: Request) {
    if (!body.message?.trim()) throw new BadRequestException('message is required');
    if (!body.sessionId?.trim()) throw new BadRequestException('sessionId is required');
    const userId = (req.user as { id: string }).id;
    return this.chatService.chat(body.message.trim(), body.sessionId.trim(), userId);
  }
}
