import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import type { ListQuery } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('me')
  me(@Req() request: Request) {
    const user = request.user as { id: string; email?: string };
    return { id: user.id, email: user.email };
  }

  @Get('users')
  users(@Query() query: ListQuery) {
    return this.admin.listUsers(query);
  }

  @Get('contact-messages')
  contactMessages(@Query() query: ListQuery) {
    return this.admin.listContactMessages(query);
  }

  @Patch('users/:id/block')
  block(@Param('id') id: string, @Body('blocked') blocked: unknown, @Req() request: Request) {
    if (typeof blocked !== 'boolean') throw new BadRequestException('blocked must be a boolean');
    return this.admin.setBlocked(id, blocked, (request.user as { id: string }).id);
  }

  @Get('content/:type')
  content(@Param('type') type: string, @Query() query: ListQuery) {
    return this.admin.listContent(this.contentType(type), query);
  }

  @Delete('content/:type/:id')
  delete(@Param('type') type: string, @Param('id') id: string) {
    return this.admin.deleteContent(this.contentType(type), id);
  }

  private contentType(value: string): 'pdfs' | 'csvs' | 'images' {
    if (value !== 'pdfs' && value !== 'csvs' && value !== 'images') {
      throw new BadRequestException('Unknown content type');
    }
    return value;
  }
}
