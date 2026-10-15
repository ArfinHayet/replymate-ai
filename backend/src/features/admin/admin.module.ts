import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DocumentModule } from '../document/document.module';
import { ImageModule } from '../image/image.module';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

@Module({
  imports: [AuthModule, DocumentModule, ImageModule],
  controllers: [AdminController],
  providers: [AdminGuard, AdminService],
})
export class AdminModule {}
