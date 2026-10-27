import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EVENTO_AUDITORIA } from '../auditoria/eventos-auditoria';
import { ErroAplicacao } from '../common/erros/erro-aplicacao';
import { Acao, Recurso } from '../rbac/politicas';
import { RbacService } from '../rbac/rbac.service';
import { CHAVE_PERMISSAO } from './decorators';
import { UsuarioAutenticado } from './tipos';

@Injectable()
export class AutorizacaoGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbac: RbacService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const exigida = this.reflector.getAllAndOverride<{ recurso: Recurso; acao: Acao } | undefined>(
      CHAVE_PERMISSAO,
      [contexto.getHandler(), contexto.getClass()],
    );
    if (!exigida) return true;

    const requisicao = contexto
      .switchToHttp()
      .getRequest<Request & { usuario: UsuarioAutenticado }>();
    const usuario = requisicao.usuario;
    if (!usuario) throw ErroAplicacao.naoAutorizado();

    const permitido = await this.rbac.permite(usuario.perfil, exigida.recurso, exigida.acao);

    if (!permitido) {
      await this.auditoria.registrar({
        evento: EVENTO_AUDITORIA.VIOLACAO_CONFORMIDADE,
        recursoTipo: exigida.recurso,
        tenantId: usuario.tenantId,
        executorId: usuario.id,
        resultado: 'negado',
        motivo: `Perfil ${usuario.perfil} sem permissão para ${exigida.acao} em ${exigida.recurso}`,
        enderecoIp: requisicao.ip ?? null,
      });

      throw ErroAplicacao.proibido('Usuário sem permissão para acessar o recurso');
    }

    return true;
  }
}
