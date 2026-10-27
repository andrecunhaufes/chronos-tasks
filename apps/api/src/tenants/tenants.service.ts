import { Injectable } from '@nestjs/common';
import { Prisma, StatusRegistro, Tenant } from '@prisma/client';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CACHE, CacheService } from '../cache/cache.service';
import { TokenService } from '../auth/token.service';
import { EVENTO_AUDITORIA } from '../auditoria/eventos-auditoria';
import { ErroAplicacao } from '../common/erros/erro-aplicacao';
import { PrismaService } from '../prisma/prisma.service';
import { UsuarioAutenticado } from '../auth/tipos';
import { ListarTenantsDto, ProvisionarTenantDto } from './tenants.dto';

// Estrutura organizacional padrão definida no ASSET 23764 (definition.hierarchies[0].levels).
const NIVEIS_PADRAO = [
  { nome: 'Colaborador', profundidade: 1 },
  { nome: 'Gestor / Líder de Equipe', profundidade: 2 },
  { nome: 'Diretor', profundidade: 3 },
];

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly tokens: TokenService,
    private readonly cache: CacheService,
  ) {}

  async provisionar(
    dados: ProvisionarTenantDto,
    executor: UsuarioAutenticado,
    enderecoIp: string,
  ): Promise<object> {
    const jaExiste = await this.prisma.tenant.findUnique({ where: { slug: dados.slug_tenant } });
    if (jaExiste) {
      throw ErroAplicacao.conflito(
        'Já existe uma organização com este identificador',
        'slug_tenant',
        'duplicado',
      );
    }

    const tenant = await this.prisma.$transaction(async (tx) => {
      const provisionado = await tx.tenant.create({
        data: {
          nome: dados.nome_organizacao,
          slug: dados.slug_tenant,
          status: StatusRegistro.ativo,
          administradorCriadorId: executor.id,
          dataUltimaAtivacao: new Date(),
        },
      });

      await tx.nivelHierarquico.createMany({
        data: NIVEIS_PADRAO.map((nivel) => ({
          tenantId: provisionado.id,
          nome: nivel.nome,
          profundidade: nivel.profundidade,
          criadorId: executor.id,
        })),
      });

      return provisionado;
    });

    await this.auditoria.registrar({
      evento: EVENTO_AUDITORIA.TENANT_PROVISIONADO,
      recursoTipo: 'tenant',
      recursoId: tenant.id,
      tenantId: tenant.id,
      executorId: executor.id,
      resultado: 'sucesso',
      dadosDepois: { nome: tenant.nome, slug: tenant.slug, status: tenant.status },
      enderecoIp,
    });

    return this.paraResposta(tenant);
  }

  async listar(filtros: ListarTenantsDto): Promise<object> {
    const where: Prisma.TenantWhereInput = {
      ...(filtros.status ? { status: filtros.status as StatusRegistro } : {}),
      ...(filtros.busca
        ? {
            OR: [
              { nome: { contains: filtros.busca, mode: 'insensitive' } },
              { slug: { contains: filtros.busca, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [registros, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        where,
        take: filtros.limit + 1,
        ...(filtros.cursor ? { cursor: { id: filtros.cursor }, skip: 1 } : {}),
        orderBy: { dataCriacao: filtros.sort_order },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    const temMais = registros.length > filtros.limit;
    const pagina = temMais ? registros.slice(0, filtros.limit) : registros;

    return {
      data: pagina.map((tenant) => this.paraResposta(tenant)),
      pagination: {
        cursor: pagina.length > 0 ? pagina[pagina.length - 1].id : '',
        has_more: temMais,
        total_count: total,
      },
    };
  }

  async obterPorId(tenantId: string): Promise<object> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { _count: { select: { usuarios: true, tarefas: true } } },
    });

    if (!tenant) throw ErroAplicacao.naoEncontrado('Organização não encontrada');

    return {
      ...this.paraResposta(tenant),
      total_usuarios: tenant._count.usuarios,
      total_tarefas: tenant._count.tarefas,
    };
  }

  async ativar(
    tenantId: string,
    executor: UsuarioAutenticado,
    enderecoIp: string,
  ): Promise<object> {
    return this.alternarStatus(tenantId, StatusRegistro.ativo, executor, enderecoIp);
  }

  async desativar(
    tenantId: string,
    executor: UsuarioAutenticado,
    enderecoIp: string,
  ): Promise<object> {
    return this.alternarStatus(tenantId, StatusRegistro.inativo, executor, enderecoIp);
  }

  private async alternarStatus(
    tenantId: string,
    novoStatus: StatusRegistro,
    executor: UsuarioAutenticado,
    enderecoIp: string,
  ): Promise<object> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw ErroAplicacao.naoEncontrado('Organização não encontrada');

    if (tenant.status === novoStatus) return this.paraResposta(tenant);

    const agora = new Date();
    const atualizado = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: novoStatus,
        ...(novoStatus === StatusRegistro.ativo
          ? { dataUltimaAtivacao: agora }
          : { dataUltimaDesativacao: agora }),
      },
    });

    if (novoStatus === StatusRegistro.inativo) {
      await this.tokens.revogarSessoesDoTenant(tenantId);
    }

    await this.cache.invalidar(CACHE.CONFIG_TENANT, tenantId);

    await this.auditoria.registrar({
      evento:
        novoStatus === StatusRegistro.ativo
          ? EVENTO_AUDITORIA.TENANT_ATIVADO
          : EVENTO_AUDITORIA.TENANT_DESATIVADO,
      recursoTipo: 'tenant',
      recursoId: tenant.id,
      tenantId: tenant.id,
      executorId: executor.id,
      resultado: 'sucesso',
      dadosAntes: { status: tenant.status },
      dadosDepois: { status: atualizado.status },
      enderecoIp,
    });

    return this.paraResposta(atualizado);
  }

  private paraResposta(tenant: Tenant): object {
    return {
      id: tenant.id,
      nome_organizacao: tenant.nome,
      slug_tenant: tenant.slug,
      status: tenant.status,
      data_criacao: tenant.dataCriacao,
      data_ultima_ativacao: tenant.dataUltimaAtivacao,
      data_ultima_desativacao: tenant.dataUltimaDesativacao,
    };
  }
}
