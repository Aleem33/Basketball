import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CsrfGuard } from './csrf.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

@Global()
@Module({
  imports: [JwtModule.register({ global: true })],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, CsrfGuard, ConfigService],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
