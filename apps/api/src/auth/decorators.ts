import { ExecutionContext, SetMetadata, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { Acao, Recurso } from '../rbac/politicas';
import { UsuarioAutenticado } from './tipos';

export const CHAVE_ROTA_PUBLICA = 'rota_publica';
export const CHAVE_PERMISSAO = 'permissao_exigida';

export const RotaPublica = (): MethodDecorator & ClassDecorator =>
  SetMetadata(CHAVE_ROTA_PUBLICA, true);

export const Permissao = (recurso: Recurso, acao: Acao): MethodDecorator & ClassDecorator =>
  SetMetadata(CHAVE_PERMISSAO, { recurso, acao });

export const UsuarioAtual = createParamDecorator(
  (_dados: unknown, contexto: ExecutionContext): UsuarioAutenticado => {
    const requisicao = contexto
      .switchToHttp()
      .getRequest<Request & { usuario: UsuarioAutenticado }>();
    return requisicao.usuario;
  },
);

export const EnderecoIp = createParamDecorator(
  (_dados: unknown, contexto: ExecutionContext): string => {
    const requisicao = contexto.switchToHttp().getRequest<Request>();
    return requisicao.ip ?? requisicao.socket.remoteAddress ?? 'desconhecido';
  },
);
