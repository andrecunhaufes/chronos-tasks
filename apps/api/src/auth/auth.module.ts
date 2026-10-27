import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EmailModule } from '../email/email.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LimiteTentativasService } from './limite-tentativas.service';
import { TokenService } from './token.service';

@Module({
  imports: [JwtModule.register({}), EmailModule],
  controllers: [AuthController],
  providers: [AuthService, TokenService, LimiteTentativasService],
  exports: [TokenService],
})
export class AuthModule {}
