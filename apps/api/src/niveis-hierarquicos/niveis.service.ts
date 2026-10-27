import { Injectable } from '@nestjs/common';
import { NivelHierarquico, Perfil } from '@prisma/client';
import { UsuarioAutenticado } from '../auth/tipos';
import { CACHE, CacheService } from '../cache/cache.service';
import { ACESSO_NEGADO, garantirMesmoTenant } from '../common/dominio/isolamento-tenant';
import { ErroAplicacao } from '../common/erros/erro-aplicacao';
import { PrismaService } from '../prisma/prisma.service';
import { AtualizarNivelDto, CriarNivelDto } from './niveis.dto';

@Injectable()
export class NiveisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async criar(dados: CriarNivelDto, executor: UsuarioAutenticado): Promise<object> {
    await this.garantirNomeDisponivel(executor.tenantId, dados.nome, null);

    const nivel = await this.prisma.nivelHierarquico.create({
      data: {
        tenantId: executor.tenantId,
        nome: dados.nome,
        profundidade: dados.profundidade,
        criadorId: executor.id,
      },
    });

    await this.cache.invalidar(CACHE.CONFIG_TENANT, executor.tenantId);
    return this.paraResposta(nivel);
  }

  async listar(executor: UsuarioAutenticado, tenantInformado?: string): Promise<object[]> {
    if (tenantInformado !== undefined && executor.perfil !== Perfil.administrador_plataforma) {
      throw ErroAplicacao.proibido(
        'Apenas o administrador da plataforma pode consultar outro tenant',
      );
    }

    const tenantAlvo = tenantInformado ?? executor.tenantId;

    return this.cache.obter(CACHE.CONFIG_TENANT, `${tenantAlvo}:niveis`, async () => {
      const niveis = await this.prisma.nivelHierarquico.findMany({
        where: { tenantId: tenantAlvo },
        orderBy: { profundidade: 'asc' },
      });

      return niveis.map((nivel) => this.paraResposta(nivel));
    });
  }

  async atualizar(
    nivelId: string,
    dados: AtualizarNivelDto,
    executor: UsuarioAutenticado,
  ): Promise<object> {
    const nivel = await this.obterDoTenant(nivelId, executor.tenantId);

    if (dados.nome !== undefined && dados.nome !== nivel.nome) {
      await this.garantirNomeDisponivel(executor.tenantId, dados.nome, nivelId);
    }

    const atualizado = await this.prisma.nivelHierarquico.update({
      where: { id: nivelId },
      data: {
        ...(dados.nome !== undefined ? { nome: dados.nome } : {}),
        ...(dados.profundidade !== undefined ? { profundidade: dados.profundidade } : {}),
        dataUltimaEdicao: new Date(),
        ultimoEditorId: executor.id,
      },
    });

    await this.cache.invalidar(CACHE.CONFIG_TENANT, executor.tenantId);
    return this.paraResposta(atualizado);
  }

  async excluir(nivelId: string, executor: UsuarioAutenticado): Promise<{ mensagem: string }> {
    await this.obterDoTenant(nivelId, executor.tenantId);

    const usuariosVinculados = await this.prisma.usuario.count({
      where: { tenantId: executor.tenantId, nivelHierarquicoId: nivelId },
    });

    if (usuariosVinculados > 0) {
      throw ErroAplicacao.conflito(
        'Não é possível excluir um nível hierárquico com usuários vinculados',
        'nivel_hierarquico_id',
        'possui_usuarios_vinculados',
      );
    }

    await this.prisma.nivelHierarquico.delete({ where: { id: nivelId } });
    await this.cache.invalidar(CACHE.CONFIG_TENANT, executor.tenantId);

    return { mensagem: 'Nível hierárquico excluído com sucesso.' };
  }

  async garantirPertenceAoTenant(nivelId: string, tenantId: string): Promise<void> {
    await this.obterDoTenant(nivelId, tenantId);
  }

  private async obterDoTenant(nivelId: string, tenantId: string): Promise<NivelHierarquico> {
    const nivel = await this.prisma.nivelHierarquico.findUnique({ where: { id: nivelId } });

    return garantirMesmoTenant(
      nivel,
      tenantId,
      ACESSO_NEGADO.TENANT,
      'Nível hierárquico não encontrado',
    );
  }

  private async garantirNomeDisponivel(
    tenantId: string,
    nome: string,
    ignorarId: string | null,
  ): Promise<void> {
    const existente = await this.prisma.nivelHierarquico.findFirst({
      where: { tenantId, nome, ...(ignorarId ? { NOT: { id: ignorarId } } : {}) },
    });

    if (existente) {
      throw ErroAplicacao.conflito(
        'Já existe um nível hierárquico com este nome na organização',
        'nome',
        'duplicado',
      );
    }
  }

  private paraResposta(nivel: NivelHierarquico): object {
    return {
      id: nivel.id,
      nome: nivel.nome,
      profundidade: nivel.profundidade,
      data_criacao: nivel.dataCriacao,
      data_ultima_edicao: nivel.dataUltimaEdicao,
    };
  }
}
