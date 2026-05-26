import { Body, Controller, Get, Param, Put, Req, UseGuards, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatToolsService } from './chat-tools.service';
import { isChatToolKey, UpdateChatToolConfigDto } from './dto/update-chat-tool-config.dto';

@Controller('chat-tools')
@UseGuards(JwtAuthGuard)
export class ChatToolsController {
  constructor(private readonly chatToolsService: ChatToolsService) {}

  @Get()
  list(@Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.chatToolsService.list(userId);
  }

  @Put(':toolKey')
  update(
    @Param('toolKey') toolKey: string,
    @Body() body: UpdateChatToolConfigDto,
    @Req() req: Request,
  ) {
    if (!isChatToolKey(toolKey)) {
      throw new BadRequestException('Unknown chat tool');
    }
    const userId = (req.user as { id: string }).id;
    return this.chatToolsService.update(userId, toolKey, body);
  }
}
