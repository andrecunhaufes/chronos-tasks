import { Module } from '@nestjs/common';
import { RetencaoController } from './retencao.controller';
import { RetencaoService } from './retencao.service';

@Module({
  controllers: [RetencaoController],
  providers: [RetencaoService],
})
export class RetencaoModule {}
