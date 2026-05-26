import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  BadRequestException,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import type { Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { ChatService } from '../chat/chat.service';
import { ChatSuggestionService } from '../chat/chat-suggestion.service';
import { WidgetKeyGuard } from './widget-key.guard';
import type { WidgetRequest } from './widget-key.guard';
import { WidgetKeyService } from './widget-key.service';

class WidgetChatDto {
  message!: string;
  sessionId!: string;
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function requestOrigin(req: Request): string {
  const host = firstHeaderValue(req.headers['x-forwarded-host']) || req.headers.host;
  const forwardedProto = firstHeaderValue(req.headers['x-forwarded-proto']);
  const protocol = forwardedProto?.split(',')[0]?.trim() || req.protocol || 'http';

  return `${protocol}://${host}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Controller()
export class WidgetController {
  constructor(
    private readonly chatService: ChatService,
    private readonly widgetKeyService: WidgetKeyService,
    private readonly chatSuggestionService: ChatSuggestionService,
  ) {}

  /** Serve the embeddable widget JavaScript file */
  @Get('widget.js')
  serveScript(@Res() res: Response) {
    // In development, read directly from src/ so changes are reflected immediately
    // without waiting for a rebuild. In production (dist-only deploy), fall back to dist.
    const srcPath = path.join(process.cwd(), 'src', 'public', 'widget.js');
    const distPath = path.join(__dirname, '..', '..', 'public', 'widget.js');
    const scriptPath = fs.existsSync(srcPath) ? srcPath : distPath;

    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');  // prevent browser caching during dev
    res.send(fs.readFileSync(scriptPath, 'utf-8'));
  }

  /** Serve a public, always-open chatbot page for a widget key */
  @Get('widget/:key')
  @UseGuards(WidgetKeyGuard)
  async servePublicChatbot(
    @Param('key') key: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const apiBase = requestOrigin(req);
    const keyRecord = await this.widgetKeyService.findByKey(key);
    const botName = keyRecord?.label || 'AI Assistant';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>${escapeHtml(botName)} | SupportMate Ai</title>
    <style>
      html,
      body {
        margin: 0;
        width: 100%;
        min-height: 100%;
        height: 100%;
        background: #f6f8fb;
        font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif;
        overflow: hidden;
      }
    </style>
  </head>
  <body>
    <script
      src="${escapeHtml(apiBase)}/widget.js"
      data-key="${escapeHtml(key)}"
      data-api="${escapeHtml(apiBase)}"
      data-name="${escapeHtml(botName)}"
      data-brand="SupportMate Ai"
      data-brand-url="https://supportmateai.online"
      data-mode="page"
      data-open="true">
    </script>
  </body>
</html>`);
  }

  /**
   * Public chat endpoint for widget visitors.
   * :key is the public widget key (wk_xxx) embedded in the script tag.
   * WidgetKeyGuard validates the key, checks the origin whitelist,
   * and attaches the owner's userId to the request.
   */
  @Post('widget/:key/chat')
  @UseGuards(WidgetKeyGuard)
  async chat(
    @Param('key') key: string,
    @Body() body: WidgetChatDto,
    @Req() req: WidgetRequest,
  ) {
    if (!body.message?.trim()) throw new BadRequestException('message is required');
    if (!body.sessionId?.trim()) throw new BadRequestException('sessionId is required');

    // Namespace session to prevent collision with the owner's own chat sessions
    const scopedSessionId = `widget:${key}:${body.sessionId.trim()}`;
    const response = await this.chatService.chat(
      body.message.trim(),
      scopedSessionId,
      req.widgetUserId,
    );

    return {
      answer: response.answer,
      cached: response.cached,
      ...(response.action ? { action: response.action } : {}),
    };
  }

  @Get('widget/:key/suggestions')
  @UseGuards(WidgetKeyGuard)
  async suggestions(@Req() req: WidgetRequest) {
    return {
      suggestions: await this.chatSuggestionService.get(req.widgetUserId),
    };
  }
}
