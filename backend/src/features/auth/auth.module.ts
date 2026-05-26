import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsageModule } from '../usage/usage.module';
import { ProfileCompletionModule } from '../profile-completion/profile-completion.module';

@Module({
  imports: [UsageModule, ProfileCompletionModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
