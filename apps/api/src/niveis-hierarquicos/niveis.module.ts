import { Module } from '@nestjs/common';
import { NiveisController } from './niveis.controller';
import { NiveisService } from './niveis.service';

@Module({
  controllers: [NiveisController],
  providers: [NiveisService],
  exports: [NiveisService],
})
export class NiveisModule {}
