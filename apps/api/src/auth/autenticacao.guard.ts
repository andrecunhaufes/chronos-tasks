import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StatusRegistro } from '@prisma/client';
import { Request } from 'express';
import { ErroAplicacao } from '../common/erros/erro-aplicacao';
import { PrismaService } from '../prisma/prisma.service';
import { CHAVE_ROTA_PUBLICA } from './decorators';
import { TokenService } from './token.service';
import { UsuarioAutenticado } from './tipos';

@Injectable()
export class AutenticacaoGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const ehPublica = this.reflector.getAllAndOverride<boolean>(CHAVE_ROTA_PUBLICA, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (ehPublica) return true;

    const requisicao = contexto
      .switchToHttp()
      .getRequest<Request & { usuario: UsuarioAutenticado }>();
    const token = this.extrairToken(requisicao);
    if (!token) throw ErroAplicacao.naoAutorizado();

    const payload = await this.tokens.verificarAcesso(token);

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      include: { tenant: true },
    });
    if (!usuario) throw ErroAplicacao.naoAutorizado();

    // Estado inativo é avaliado antes da revogação para que a resposta carregue a causa
    // específica (USER_INACTIVE / TENANT_INACTIVE, 403) exigida pelas regras do ASSET 23735,
    // em vez do 401 genérico de sessão revogada.
    if (usuario.status === StatusRegistro.inativo) throw ErroAplicacao.usuarioInativo();
    if (usuario.tenant.status === StatusRegistro.inativo) throw ErroAplicacao.tenantInativo();

    const revogado = await this.tokens.estaRevogado(
      payload.jti,
      payload.sub,
      payload.tenant_id,
      payload.emitido_ms,
    );
    if (revogado) throw ErroAplicacao.naoAutorizado();

    requisicao.usuario = {
      id: usuario.id,
      email: usuario.email,
      tenantId: usuario.tenantId,
      perfil: usuario.perfil,
      nivelHierarquicoId: usuario.nivelHierarquicoId,
      status: usuario.status,
      jti: payload.jti,
    };

    return true;
  }

  private extrairToken(requisicao: Request): string | null {
    const cabecalho = requisicao.headers.authorization;
    if (!cabecalho) return null;

    const [esquema, valor] = cabecalho.split(' ');
    return esquema?.toLowerCase() === 'bearer' && valor ? valor : null;
  }
}
