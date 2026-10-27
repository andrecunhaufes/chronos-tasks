import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable, map } from 'rxjs';

export const VERSAO_API = 'v1';

@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(contexto: ExecutionContext, proximo: CallHandler): Observable<unknown> {
    const requisicao = contexto.switchToHttp().getRequest<Request & { id?: string }>();

    return proximo.handle().pipe(
      map((dados) => ({
        data: dados,
        meta: {
          timestamp: new Date().toISOString(),
          request_id: requisicao.id ?? '',
          version: VERSAO_API,
        },
      })),
    );
  }
}
