import { Injectable } from '@nestjs/common';
import { Perfil, Prisma, StatusRegistro, Usuario } from '@prisma/client';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CACHE, CacheService } from '../cache/cache.service';
import { EVENTO_AUDITORIA } from '../auditoria/eventos-auditoria';
import { TokenService } from '../auth/token.service';
import { UsuarioAutenticado } from '../auth/tipos';
import { ACESSO_NEGADO, garantirMesmoTenant } from '../common/dominio/isolamento-tenant';
import { ErroAplicacao } from '../common/erros/erro-aplicacao';
import { PARAMETROS_SEGURANCA } from '../config/configuracao';
import { SenhaService } from '../cripto/senha.service';
import { EmailService } from '../email/email.service';
import { NiveisService } from '../niveis-hierarquicos/niveis.service';
import { PrismaService } from '../prisma/prisma.service';
import { AtualizarUsuarioDto, CriarUsuarioDto, ListarUsuariosDto } from './usuarios.dto';

type UsuarioComNivel = Usuario & {
  nivelHierarquico: { id: string; nome: string; profundidade: number };
};

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly senhas: SenhaService,
    private readonly niveis: NiveisService,
    private readonly email: EmailService,
    private readonly tokens: TokenService,
    private readonly auditoria: AuditoriaService,
    private readonly cache: CacheService,
  ) {}

  async criar(
    dados: CriarUsuarioDto,
    executor: UsuarioAutenticado,
    enderecoIp: string,
  ): Promise<object> {
    const tenantAlvo = this.resolverTenantAlvo(dados.tenant_id, executor);

    await this.niveis.garantirPertenceAoTenant(dados.nivel_hierarquico_id, tenantAlvo);
    await this.garantirEmailDisponivel(tenantAlvo, dados.email, null);

    const senhaProvisoria = this.senhas.gerarTokenAleatorio();
    const usuario = await this.prisma.usuario.create({
      data: {
        tenantId: tenantAlvo,
        nomeCompleto: dados.nome_completo,
        email: dados.email,
        senhaHash: await this.senhas.gerarHash(senhaProvisoria),
        nivelHierarquicoId: dados.nivel_hierarquico_id,
        perfil: dados.perfil,
        status: StatusRegistro.ativo,
        criadorId: executor.id,
        dataUltimaAtivacao: new Date(),
      },
      include: { nivelHierarquico: true },
    });

    await this.enviarConviteDefinicaoSenha(usuario);
    await this.cache.invalidar(CACHE.USUARIOS_ATIVOS, tenantAlvo);

    await this.auditoria.registrar({
      evento: EVENTO_AUDITORIA.USUARIO_CRIADO,
      recursoTipo: 'usuario',
      recursoId: usuario.id,
      tenantId: tenantAlvo,
      executorId: executor.id,
      resultado: 'sucesso',
      dadosDepois: {
        nome_completo: usuario.nomeCompleto,
        email: usuario.email,
        perfil: usuario.perfil,
      },
      enderecoIp,
    });

    return this.paraResposta(usuario);
  }

  async listar(filtros: ListarUsuariosDto, executor: UsuarioAutenticado): Promise<object> {
    // A chave inclui o executor porque a resposta depende dele: o ASSET 23882 mascara
    // e-mails fora de contexto administrativo e libera o do próprio usuário.
    return this.cache.obter(
      CACHE.USUARIOS_ATIVOS,
      `${executor.tenantId}:${executor.id}:${JSON.stringify(filtros)}`,
      () => this.consultarLista(filtros, executor),
    );
  }

  private async consultarLista(
    filtros: ListarUsuariosDto,
    executor: UsuarioAutenticado,
  ): Promise<object> {
    const where: Prisma.UsuarioWhereInput = {
      tenantId: executor.tenantId,
      ...(filtros.status ? { status: filtros.status as StatusRegistro } : {}),
      ...(filtros.nivel_hierarquico_id ? { nivelHierarquicoId: filtros.nivel_hierarquico_id } : {}),
      ...(filtros.busca
        ? {
            OR: [
              { nomeCompleto: { contains: filtros.busca, mode: 'insensitive' } },
              { email: { contains: filtros.busca, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [registros, total] = await this.prisma.$transaction([
      this.prisma.usuario.findMany({
        where,
        include: { nivelHierarquico: true },
        take: filtros.limit + 1,
        ...(filtros.cursor ? { cursor: { id: filtros.cursor }, skip: 1 } : {}),
        orderBy: { dataCriacao: filtros.sort_order },
      }),
      this.prisma.usuario.count({ where }),
    ]);

    const temMais = registros.length > filtros.limit;
    const pagina = temMais ? registros.slice(0, filtros.limit) : registros;

    return {
      data: pagina.map((usuario) => this.paraResposta(usuario, executor)),
      pagination: {
        cursor: pagina.length > 0 ? pagina[pagina.length - 1].id : '',
        has_more: temMais,
        total_count: total,
      },
    };
  }

  async obterPorId(usuarioId: string, executor: UsuarioAutenticado): Promise<object> {
    const usuario = await this.obterDoTenant(usuarioId, executor.tenantId);

    const ehPropriolPerfil = usuario.id === executor.id;
    const podeVerOutros = executor.perfil !== Perfil.colaborador;

    if (!ehPropriolPerfil && !podeVerOutros) {
      throw ErroAplicacao.proibido('Usuário sem permissão para visualizar outros perfis');
    }

    return this.paraResposta(usuario, executor);
  }

  async atualizar(
    usuarioId: string,
    dados: AtualizarUsuarioDto,
    executor: UsuarioAutenticado,
    enderecoIp: string,
  ): Promise<object> {
    const usuario = await this.obterDoTenant(usuarioId, executor.tenantId);

    if (dados.nivel_hierarquico_id !== undefined) {
      await this.niveis.garantirPertenceAoTenant(dados.nivel_hierarquico_id, executor.tenantId);
    }

    if (dados.email !== undefined && dados.email !== usuario.email) {
      await this.garantirEmailDisponivel(executor.tenantId, dados.email, usuarioId);
    }

    const atualizado = await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        ...(dados.nome_completo !== undefined ? { nomeCompleto: dados.nome_completo } : {}),
        ...(dados.email !== undefined ? { email: dados.email } : {}),
        ...(dados.nivel_hierarquico_id !== undefined
          ? { nivelHierarquicoId: dados.nivel_hierarquico_id }
          : {}),
        ...(dados.perfil !== undefined ? { perfil: dados.perfil } : {}),
        dataUltimaEdicao: new Date(),
        ultimoEditorId: executor.id,
      },
      include: { nivelHierarquico: true },
    });

    await this.cache.invalidar(CACHE.USUARIOS_ATIVOS, executor.tenantId);

    await this.auditoria.registrar({
      evento: EVENTO_AUDITORIA.USUARIO_ATUALIZADO,
      recursoTipo: 'usuario',
      recursoId: usuarioId,
      tenantId: executor.tenantId,
      executorId: executor.id,
      resultado: 'sucesso',
      dadosAntes: {
        nome_completo: usuario.nomeCompleto,
        email: usuario.email,
        nivel_hierarquico_id: usuario.nivelHierarquicoId,
        perfil: usuario.perfil,
      },
      dadosDepois: {
        nome_completo: atualizado.nomeCompleto,
        email: atualizado.email,
        nivel_hierarquico_id: atualizado.nivelHierarquicoId,
        perfil: atualizado.perfil,
      },
      enderecoIp,
    });

    return this.paraResposta(atualizado);
  }

  async ativar(
    usuarioId: string,
    executor: UsuarioAutenticado,
    enderecoIp: string,
  ): Promise<object> {
    return this.alternarStatus(usuarioId, StatusRegistro.ativo, executor, enderecoIp);
  }

  async desativar(
    usuarioId: string,
    executor: UsuarioAutenticado,
    enderecoIp: string,
  ): Promise<object> {
    if (usuarioId === executor.id) {
      throw ErroAplicacao.conflito(
        'Um administrador não pode desativar o próprio perfil',
        'usuario_id',
        'auto_desativacao_bloqueada',
      );
    }

    return this.alternarStatus(usuarioId, StatusRegistro.inativo, executor, enderecoIp);
  }

  private async alternarStatus(
    usuarioId: string,
    novoStatus: StatusRegistro,
    executor: UsuarioAutenticado,
    enderecoIp: string,
  ): Promise<object> {
    const usuario = await this.obterDoTenant(usuarioId, executor.tenantId);
    if (usuario.status === novoStatus) return this.paraResposta(usuario);

    if (novoStatus === StatusRegistro.inativo && usuario.perfil === Perfil.administrador_tenant) {
      const administradoresAtivos = await this.prisma.usuario.count({
        where: {
          tenantId: executor.tenantId,
          perfil: Perfil.administrador_tenant,
          status: StatusRegistro.ativo,
        },
      });

      if (administradoresAtivos <= 1) {
        throw ErroAplicacao.conflito(
          'A organização deve manter ao menos um administrador ativo',
          'usuario_id',
          'ultimo_administrador_ativo',
        );
      }
    }

    const agora = new Date();
    const atualizado = await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        status: novoStatus,
        ...(novoStatus === StatusRegistro.ativo
          ? { dataUltimaAtivacao: agora }
          : { dataUltimaDesativacao: agora }),
      },
      include: { nivelHierarquico: true },
    });

    if (novoStatus === StatusRegistro.inativo) {
      await this.tokens.revogarSessoesDoUsuario(usuarioId);
    }

    await this.cache.invalidar(CACHE.USUARIOS_ATIVOS, executor.tenantId);

    await this.auditoria.registrar({
      evento:
        novoStatus === StatusRegistro.ativo
          ? EVENTO_AUDITORIA.USUARIO_ATIVADO
          : EVENTO_AUDITORIA.USUARIO_DESATIVADO,
      recursoTipo: 'usuario',
      recursoId: usuarioId,
      tenantId: executor.tenantId,
      executorId: executor.id,
      resultado: 'sucesso',
      dadosAntes: { status: usuario.status },
      dadosDepois: { status: atualizado.status },
      enderecoIp,
    });

    return this.paraResposta(atualizado);
  }

  private resolverTenantAlvo(
    tenantInformado: string | undefined,
    executor: UsuarioAutenticado,
  ): string {
    if (tenantInformado === undefined) return executor.tenantId;

    if (executor.perfil !== Perfil.administrador_plataforma) {
      throw ErroAplicacao.proibido(
        'Apenas o administrador da plataforma pode operar em outro tenant',
      );
    }

    return tenantInformado;
  }

  private async enviarConviteDefinicaoSenha(usuario: Usuario): Promise<void> {
    const token = this.senhas.gerarTokenAleatorio();

    await this.prisma.tokenRecuperacaoSenha.create({
      data: {
        usuarioId: usuario.id,
        tokenHash: this.senhas.hashToken(token),
        dataExpiracao: new Date(
          Date.now() + PARAMETROS_SEGURANCA.recuperacaoSenhaTokenTtlMinutos * 60 * 1000,
        ),
      },
    });

    await this.email.enfileirarBoasVindas({
      destinatario: usuario.email,
      nomeCompleto: usuario.nomeCompleto,
      token,
      expiraEmMinutos: PARAMETROS_SEGURANCA.recuperacaoSenhaTokenTtlMinutos,
    });
  }

  private async obterDoTenant(usuarioId: string, tenantId: string): Promise<UsuarioComNivel> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { nivelHierarquico: true },
    });

    return garantirMesmoTenant(usuario, tenantId, ACESSO_NEGADO.USUARIO, 'Usuário não encontrado');
  }

  private async garantirEmailDisponivel(
    tenantId: string,
    email: string,
    ignorarId: string | null,
  ): Promise<void> {
    const existente = await this.prisma.usuario.findFirst({
      where: { tenantId, email, ...(ignorarId ? { NOT: { id: ignorarId } } : {}) },
    });

    if (existente) {
      throw ErroAplicacao.conflito(
        'Já existe um usuário com este e-mail na organização',
        'email',
        'duplicado',
      );
    }
  }

  // O ASSET 23882 restringe a exposição de dados pessoais a contextos administrativos.
  // O nome permanece visível porque as features 23609 e 23625 exigem identificar o
  // responsável em lista, Kanban e detalhe; o e-mail é mascarado fora desse contexto.
  private mascararEmail(email: string): string {
    const [local, dominio] = email.split('@');
    const visivel = local.slice(0, 2);
    return `${visivel}${'*'.repeat(Math.max(local.length - 2, 1))}@${dominio}`;
  }

  private ehContextoAdministrativo(executor?: UsuarioAutenticado): boolean {
    if (!executor) return false;
    return (
      executor.perfil === Perfil.administrador_tenant ||
      executor.perfil === Perfil.administrador_plataforma
    );
  }

  private paraResposta(usuario: UsuarioComNivel, executor?: UsuarioAutenticado): object {
    const proprioPerfil = executor?.id === usuario.id;
    const podeVerEmail = proprioPerfil || this.ehContextoAdministrativo(executor);

    return {
      id: usuario.id,
      nome_completo: usuario.nomeCompleto,
      email: podeVerEmail ? usuario.email : this.mascararEmail(usuario.email),
      perfil: usuario.perfil,
      nivel_hierarquico_id: usuario.nivelHierarquicoId,
      nivel_hierarquico_nome: usuario.nivelHierarquico.nome,
      status: usuario.status,
      data_criacao: usuario.dataCriacao,
      data_ultima_edicao: usuario.dataUltimaEdicao,
    };
  }
}
