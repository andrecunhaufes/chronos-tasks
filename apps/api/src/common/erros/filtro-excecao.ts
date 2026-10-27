import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { registrarErro } from '../../observabilidade/sentry';
import { CODIGO_ERRO, CodigoErro, ErroAplicacao } from './erro-aplicacao';

@Catch()
export class FiltroExcecao implements ExceptionFilter {
  private readonly logger = new Logger(FiltroExcecao.name);

  catch(excecao: unknown, host: ArgumentsHost): void {
    const contexto = host.switchToHttp();
    const resposta = contexto.getResponse<Response>();
    const requisicao = contexto.getRequest<Request>();
    const requestId = (requisicao as Request & { id?: string }).id ?? '';

    const { statusHttp, codigo, mensagem, detalhes } = this.traduzir(excecao);

    if (statusHttp >= 500) {
      this.logger.error({ requestId, codigo, err: excecao }, mensagem);
      registrarErro(excecao, { request_id: requestId, rota: requisicao.path, codigo });
    }

    if (codigo === CODIGO_ERRO.UNAUTHORIZED) {
      resposta.setHeader(
        'WWW-Authenticate',
        'Bearer realm="plataforma-tarefas", error="invalid_token"',
      );
    }

    resposta.status(statusHttp).json({
      error: { code: codigo, message: mensagem, ...(detalhes ? { details: detalhes } : {}) },
      meta: { timestamp: new Date().toISOString(), request_id: requestId },
    });
  }

  private traduzir(excecao: unknown): {
    statusHttp: number;
    codigo: CodigoErro;
    mensagem: string;
    detalhes?: unknown;
  } {
    if (excecao instanceof ErroAplicacao) {
      return {
        statusHttp: excecao.statusHttp,
        codigo: excecao.codigo,
        mensagem: excecao.message,
        detalhes: excecao.detalhes,
      };
    }

    if (excecao instanceof HttpException) {
      const status = excecao.getStatus();
      return {
        statusHttp: status,
        codigo: status === 404 ? CODIGO_ERRO.NOT_FOUND : CODIGO_ERRO.INVALID_INPUT,
        mensagem: excecao.message,
      };
    }

    return {
      statusHttp: 500,
      codigo: CODIGO_ERRO.INTERNAL_ERROR,
      mensagem: 'Erro interno do servidor',
    };
  }
}
