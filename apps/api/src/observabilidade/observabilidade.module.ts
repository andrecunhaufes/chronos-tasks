import { Global, Module } from '@nestjs/common';
import { MetricasService } from './metricas.service';
import { ObservabilidadeController } from './observabilidade.controller';

@Global()
@Module({
  controllers: [ObservabilidadeController],
  providers: [MetricasService],
  exports: [MetricasService],
})
export class ObservabilidadeModule {}
