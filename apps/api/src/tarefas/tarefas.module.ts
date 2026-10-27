import { Module } from '@nestjs/common';
import { ColunasService } from './colunas.service';
import { TarefasController } from './tarefas.controller';
import { TarefasService } from './tarefas.service';

@Module({
  controllers: [TarefasController],
  providers: [TarefasService, ColunasService],
})
export class TarefasModule {}
