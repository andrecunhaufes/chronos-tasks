import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

// content_security_policy_header do ASSET 23645 e hsts_max_age_seconds do ASSET 23909.
const CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'";
const HSTS_MAX_AGE_SEGUNDOS = 31_536_000;

@Injectable()
export class CabecalhosSegurancaMiddleware implements NestMiddleware {
  use(_requisicao: Request, resposta: Response, proximo: NextFunction): void {
    resposta.setHeader('Content-Security-Policy', CSP);
    resposta.setHeader('X-Content-Type-Options', 'nosniff');
    resposta.setHeader('X-Frame-Options', 'DENY');
    resposta.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // HSTS só tem efeito sob TLS e o navegador ignora em texto claro; enviar sempre
    // mantém o cabeçalho correto atrás do proxy que termina o TLS.
    resposta.setHeader(
      'Strict-Transport-Security',
      `max-age=${HSTS_MAX_AGE_SEGUNDOS}; includeSubDomains`,
    );

    resposta.removeHeader('X-Powered-By');
    proximo();
  }
}
