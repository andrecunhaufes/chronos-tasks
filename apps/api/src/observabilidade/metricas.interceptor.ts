import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { MetricasService } from './metricas.service';

@Injectable()
export class MetricasInterceptor implements NestInterceptor {
  constructor(private readonly metricas: MetricasService) {}

  intercept(contexto: ExecutionContext, proximo: CallHandler): Observable<unknown> {
    const http = contexto.switchToHttp();
    const requisicao = http.getRequest<Request>();
    const inicio = process.hrtime.bigint();

    const registrar = (): void => {
      const resposta = http.getResponse<Response>();
      const rotulos = {
        method: requisicao.method,
        route: requisicao.route?.path ?? requisicao.path,
        status_code: String(resposta.statusCode),
      };

      const duracaoSegundos = Number(process.hrtime.bigint() - inicio) / 1_000_000_000;
      this.metricas.requisicoesHttp.inc(rotulos);
      this.metricas.duracaoRequisicoes.observe(rotulos, duracaoSegundos);
    };

    return proximo.handle().pipe(tap({ next: registrar, error: registrar }));
  }
}
