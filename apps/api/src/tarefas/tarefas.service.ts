import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import Redis from 'ioredis';
import { Perfil, Prisma, StatusRegistro, Tarefa } from '@prisma/client';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CACHE, CacheService } from '../cache/cache.service';
import { EVENTO_AUDITORIA } from '../auditoria/eventos-auditoria';
import { UsuarioAutenticado } from '../auth/tipos';
import { ehAtrasada, ehCritica } from '../common/dominio/destaque-tarefa';
import { ACESSO_NEGADO, garantirMesmoTenant } from '../common/dominio/isolamento-tenant';
import { STATUS_TAREFA } from '../common/dominio/status-tarefa';
import { ErroAplicacao } from '../common/erros/erro-aplicacao';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS } from '../redis/redis.module';
import { ColunasService } from './colunas.service';
import {
  AlterarStatusDto,
  AtualizarTarefaDto,
  CriarTarefaDto,
  KanbanDto,
  ListarTarefasDto,
} from './tarefas.dto';

type TarefaComResponsavel = Tarefa & { responsavel: { id: string; nomeCompleto: string } };

const JANELA_IDEMPOTENCIA_SEGUNDOS = 60;

// O ASSET 23964 não limita cartões por coluna, mas devolver o tenant inteiro (até 10.000
// tarefas pelo ASSET 23577) estoura as metas de latência do ASSET 23752. O teto adotado é
// o mesmo da paginação do ASSET 23702; `total` continua trazendo a contagem real.
const CARTOES_POR_COLUNA = 100;

const INCLUIR_RESPONSAVEL = {
  responsavel: { select: { id: true, nomeCompleto: true } },
} as const;

@Injectable()
export class TarefasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly colunas: ColunasService,
    private readonly cache: CacheService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async criar(
    dados: CriarTarefaDto,
    executor: UsuarioAutenticado,
    enderecoIp: string,
  ): Promise<object> {
    await this.garantirResponsavelValido(dados.responsavel_id, executor.tenantId);

    // Requisição repetida com os mesmos dados devolve a tarefa já criada em vez de
    // duplicar o registro (regra de idempotência dos ASSETs 23714, 23642 e 23738).
    const chaveIdempotencia = this.montarChaveIdempotencia(dados, executor);
    const jaCriada = await this.redis.get(chaveIdempotencia);

    if (jaCriada !== null) {
      const existente = await this.prisma.tarefa.findUnique({
        where: { id: jaCriada },
        include: INCLUIR_RESPONSAVEL,
      });

      if (existente) return this.paraResposta(existente);
    }

    const statusInicial = await this.colunas.chaveInicial(executor.tenantId);
    const status = dados.status ?? statusInicial;

    if (!(await this.colunas.ehValida(status, executor.tenantId))) {
      throw ErroAplicacao.entradaInvalida('Validação de entrada falhou', [
        { field: 'status', reason: 'O status deve ser uma das colunas definidas pelo sistema' },
      ]);
    }

    const ehCriadaConcluida = await this.colunas.ehConclusivo(status, executor.tenantId);

    const tarefa = await this.prisma.$transaction(async (tx) => {
      const criada = await tx.tarefa.create({
        data: {
          tenantId: executor.tenantId,
          titulo: dados.titulo,
          descricao: dados.descricao ?? null,
          responsavelId: dados.responsavel_id,
          criadorId: executor.id,
          prioridade: dados.prioridade,
          status,
          dataLimite: dados.data_limite ?? null,
          dataConclusao: ehCriadaConcluida ? new Date() : null,
        },
        include: INCLUIR_RESPONSAVEL,
      });

      if (status !== statusInicial) {
        await tx.historicoStatusTarefa.create({
          data: {
            tarefaId: criada.id,
            tenantId: executor.tenantId,
            statusAnterior: statusInicial,
            statusNovo: status,
            executorId: executor.id,
          },
        });
      }

      return criada;
    });

    await this.redis.set(chaveIdempotencia, tarefa.id, 'EX', JANELA_IDEMPOTENCIA_SEGUNDOS);
    await this.cache.invalidarTarefasDoTenant(executor.tenantId);

    await this.auditoria.registrar({
      evento: EVENTO_AUDITORIA.TAREFA_CRIADA,
      recursoTipo: 'tarefa',
      recursoId: tarefa.id,
      tenantId: executor.tenantId,
      executorId: executor.id,
      resultado: 'sucesso',
      dadosDepois: {
        titulo: tarefa.titulo,
        responsavel_id: tarefa.responsavelId,
        prioridade: tarefa.prioridade,
        status: tarefa.status,
        data_limite: tarefa.dataLimite,
      },
      enderecoIp,
    });

    return this.paraResposta(tarefa);
  }

  async listar(filtros: ListarTarefasDto, executor: UsuarioAutenticado): Promise<object> {
    // Consulta filtrada ou pesquisada vai para o Redis com TTL curto; a listagem simples
    // fica em memória com TTL maior (ASSET 23752, otimizações 2 e 5).
    const temFiltro = Boolean(
      filtros.status ??
        filtros.responsavel_id ??
        filtros.prioridade ??
        filtros.pesquisa ??
        filtros.data_limite_inicio ??
        filtros.data_limite_fim ??
        filtros.apenas_atrasadas ??
        filtros.apenas_criticas,
    );

    const entrada = temFiltro ? CACHE.FILTROS_TAREFAS : CACHE.LISTAGEM_TAREFAS;
    const chave = `${executor.tenantId}:${JSON.stringify(filtros)}`;

    return this.cache.obter(entrada, chave, () => this.consultarLista(filtros, executor.tenantId));
  }

  private async consultarLista(filtros: ListarTarefasDto, tenantId: string): Promise<object> {
    const where = this.montarFiltro(filtros, tenantId);

    const [registros, total] = await this.prisma.$transaction([
      this.prisma.tarefa.findMany({
        where,
        include: INCLUIR_RESPONSAVEL,
        take: filtros.limit + 1,
        ...(filtros.cursor ? { cursor: { id: filtros.cursor }, skip: 1 } : {}),
        orderBy: this.montarOrdenacao(filtros),
      }),
      this.prisma.tarefa.count({ where }),
    ]);

    const temMais = registros.length > filtros.limit;
    const pagina = temMais ? registros.slice(0, filtros.limit) : registros;

    return {
      data: pagina.map((tarefa) => this.paraResposta(tarefa)),
      pagination: {
        cursor: pagina.length > 0 ? pagina[pagina.length - 1].id : '',
        has_more: temMais,
        total_count: total,
      },
    };
  }

  async obterPorId(tarefaId: string, executor: UsuarioAutenticado): Promise<object> {
    const tarefa = await this.obterDoTenant(tarefaId, executor.tenantId);

    const historico = await this.prisma.historicoStatusTarefa.findMany({
      where: { tarefaId, tenantId: executor.tenantId },
      include: { executor: { select: { id: true, nomeCompleto: true } } },
      orderBy: { dataTransicao: 'asc' },
    });

    return {
      ...this.paraResposta(tarefa),
      historico_status: historico.map((registro) => ({
        id: registro.id,
        status_anterior: registro.statusAnterior,
        status_novo: registro.statusNovo,
        data_transicao: registro.dataTransicao,
        executor_id: registro.executorId,
        executor_nome: registro.executor.nomeCompleto,
      })),
    };
  }

  async atualizar(
    tarefaId: string,
    dados: AtualizarTarefaDto,
    executor: UsuarioAutenticado,
    enderecoIp: string,
  ): Promise<object> {
    const tarefa = await this.obterDoTenant(tarefaId, executor.tenantId);
    this.garantirPodeEditar(tarefa, executor);

    if (dados.responsavel_id !== undefined) {
      await this.garantirResponsavelValido(dados.responsavel_id, executor.tenantId);
    }

    const atualizada = await this.prisma.tarefa.update({
      where: { id: tarefaId },
      data: {
        ...(dados.titulo !== undefined ? { titulo: dados.titulo } : {}),
        ...(dados.descricao !== undefined ? { descricao: dados.descricao } : {}),
        ...(dados.responsavel_id !== undefined ? { responsavelId: dados.responsavel_id } : {}),
        ...(dados.prioridade !== undefined ? { prioridade: dados.prioridade } : {}),
        ...(dados.data_limite !== undefined ? { dataLimite: dados.data_limite } : {}),
        dataUltimaEdicao: new Date(),
        ultimoEditorId: executor.id,
      },
      include: INCLUIR_RESPONSAVEL,
    });

    await this.cache.invalidarTarefasDoTenant(executor.tenantId);

    await this.auditoria.registrar({
      evento: EVENTO_AUDITORIA.TAREFA_ATUALIZADA,
      recursoTipo: 'tarefa',
      recursoId: tarefaId,
      tenantId: executor.tenantId,
      executorId: executor.id,
      resultado: 'sucesso',
      dadosAntes: {
        titulo: tarefa.titulo,
        descricao: tarefa.descricao,
        responsavel_id: tarefa.responsavelId,
        prioridade: tarefa.prioridade,
        data_limite: tarefa.dataLimite,
      },
      dadosDepois: {
        titulo: atualizada.titulo,
        descricao: atualizada.descricao,
        responsavel_id: atualizada.responsavelId,
        prioridade: atualizada.prioridade,
        data_limite: atualizada.dataLimite,
      },
      enderecoIp,
    });

    return this.paraResposta(atualizada);
  }

  async alterarStatus(
    tarefaId: string,
    dados: AlterarStatusDto,
    executor: UsuarioAutenticado,
    enderecoIp: string,
  ): Promise<object> {
    return this.transitar(
      tarefaId,
      dados.status,
      executor,
      enderecoIp,
      EVENTO_AUDITORIA.TAREFA_STATUS_ALTERADO,
    );
  }

  async concluir(
    tarefaId: string,
    executor: UsuarioAutenticado,
    enderecoIp: string,
  ): Promise<object> {
    const colunas = await this.colunas.listar(executor.tenantId);
    const conclusiva = colunas.find((coluna) => coluna.ehConclusivo);

    if (!conclusiva) {
      throw ErroAplicacao.entradaInvalida(
        'Nenhuma coluna conclusiva configurada para a organização',
      );
    }

    return this.transitar(
      tarefaId,
      conclusiva.chave,
      executor,
      enderecoIp,
      EVENTO_AUDITORIA.TAREFA_CONCLUIDA,
    );
  }

  // Endpoint dedicado de reabertura definido no ASSET 23984; devolve a tarefa concluída
  // à primeira coluna não conclusiva e registra a transição no histórico.
  async reabrir(
    tarefaId: string,
    executor: UsuarioAutenticado,
    enderecoIp: string,
  ): Promise<object> {
    const tarefa = await this.obterDoTenant(tarefaId, executor.tenantId);

    if (tarefa.dataConclusao === null) {
      throw ErroAplicacao.conflito('A tarefa não está concluída', 'status', 'tarefa_ativa');
    }

    const colunas = await this.colunas.listar(executor.tenantId);
    const ativa = colunas.find((coluna) => !coluna.ehConclusivo);

    if (!ativa) {
      throw ErroAplicacao.entradaInvalida('Nenhuma coluna ativa configurada para a organização');
    }

    return this.transitar(
      tarefaId,
      ativa.chave,
      executor,
      enderecoIp,
      EVENTO_AUDITORIA.TAREFA_STATUS_ALTERADO,
    );
  }

  async excluir(
    tarefaId: string,
    executor: UsuarioAutenticado,
    enderecoIp: string,
  ): Promise<{ mensagem: string }> {
    const tarefa = await this.obterDoTenant(tarefaId, executor.tenantId);

    await this.prisma.tarefa.update({
      where: { id: tarefaId },
      data: { dataExclusao: new Date(), ultimoEditorId: executor.id },
    });

    await this.cache.invalidarTarefasDoTenant(executor.tenantId);

    await this.auditoria.registrar({
      evento: EVENTO_AUDITORIA.TAREFA_ATUALIZADA,
      recursoTipo: 'tarefa',
      recursoId: tarefaId,
      tenantId: executor.tenantId,
      executorId: executor.id,
      resultado: 'sucesso',
      motivo: 'exclusao',
      dadosAntes: { titulo: tarefa.titulo, status: tarefa.status },
      enderecoIp,
    });

    return { mensagem: 'Tarefa excluída com sucesso.' };
  }

  async obterQuadroKanban(filtros: KanbanDto, executor: UsuarioAutenticado): Promise<object> {
    // A otimização 2 do ASSET 23752 cobre "visualização em lista e Kanban".
    return this.cache.obter(
      CACHE.LISTAGEM_TAREFAS,
      `${executor.tenantId}:kanban:${JSON.stringify(filtros)}`,
      () => this.consultarQuadroKanban(filtros, executor),
    );
  }

  private async consultarQuadroKanban(
    filtros: KanbanDto,
    executor: UsuarioAutenticado,
  ): Promise<object> {
    const tarefas = await this.prisma.tarefa.findMany({
      where: {
        tenantId: executor.tenantId,
        dataExclusao: null,
        ...(filtros.responsavel_id ? { responsavelId: filtros.responsavel_id } : {}),
        ...(filtros.prioridade ? { prioridade: filtros.prioridade } : {}),
        ...(filtros.pesquisa
          ? {
              OR: [
                { titulo: { contains: filtros.pesquisa, mode: 'insensitive' } },
                { descricao: { contains: filtros.pesquisa, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: INCLUIR_RESPONSAVEL,
      orderBy: [{ prioridade: 'desc' }, { dataLimite: 'asc' }],
    });

    const colunas = await this.colunas.listar(executor.tenantId);

    return {
      colunas: colunas.map((coluna) => {
        const daColuna = tarefas.filter((tarefa) => tarefa.status === coluna.chave);
        return {
          status: coluna.chave,
          rotulo: coluna.rotulo,
          ordem: coluna.ordem,
          eh_conclusivo: coluna.ehConclusivo,
          total: daColuna.length,
          exibindo: Math.min(daColuna.length, CARTOES_POR_COLUNA),
          tarefas: daColuna.slice(0, CARTOES_POR_COLUNA).map((tarefa) => this.paraResposta(tarefa)),
        };
      }),
    };
  }

  private async transitar(
    tarefaId: string,
    novoStatus: string,
    executor: UsuarioAutenticado,
    enderecoIp: string,
    evento: (typeof EVENTO_AUDITORIA)[keyof typeof EVENTO_AUDITORIA],
  ): Promise<object> {
    const tarefa = await this.obterDoTenant(tarefaId, executor.tenantId);
    this.garantirPodeAlterarStatus(tarefa, executor);

    if (!(await this.colunas.ehValida(novoStatus, executor.tenantId))) {
      throw ErroAplicacao.entradaInvalida('Validação de entrada falhou', [
        { field: 'status', reason: 'O status deve ser uma das colunas definidas pelo sistema' },
      ]);
    }

    if (tarefa.status === novoStatus) return this.paraResposta(tarefa);

    const conclui = await this.colunas.ehConclusivo(novoStatus, executor.tenantId);

    const agora = new Date();
    const atualizada = await this.prisma.$transaction(async (tx) => {
      const gravada = await tx.tarefa.update({
        where: { id: tarefaId },
        data: {
          status: novoStatus,
          dataConclusao: conclui ? agora : null,
          dataUltimaEdicao: agora,
          ultimoEditorId: executor.id,
        },
        include: INCLUIR_RESPONSAVEL,
      });

      await tx.historicoStatusTarefa.create({
        data: {
          tarefaId,
          tenantId: executor.tenantId,
          statusAnterior: tarefa.status,
          statusNovo: novoStatus,
          dataTransicao: agora,
          executorId: executor.id,
        },
      });

      return gravada;
    });

    await this.cache.invalidarTarefasDoTenant(executor.tenantId);

    await this.auditoria.registrar({
      evento,
      recursoTipo: 'tarefa',
      recursoId: tarefaId,
      tenantId: executor.tenantId,
      executorId: executor.id,
      resultado: 'sucesso',
      dadosAntes: { status: tarefa.status },
      dadosDepois: { status: atualizada.status },
      enderecoIp,
    });

    return this.paraResposta(atualizada);
  }

  private montarChaveIdempotencia(dados: CriarTarefaDto, executor: UsuarioAutenticado): string {
    const assinatura = [
      executor.tenantId,
      executor.id,
      dados.titulo,
      dados.descricao ?? '',
      dados.responsavel_id,
      dados.prioridade,
      dados.status ?? '',
      dados.data_limite?.toISOString() ?? '',
    ].join('|');

    return `tarefa:idem:${createHash('sha256').update(assinatura).digest('hex')}`;
  }

  private montarFiltro(filtros: ListarTarefasDto, tenantId: string): Prisma.TarefaWhereInput {
    const condicoes: Prisma.TarefaWhereInput[] = [];

    if (filtros.status) condicoes.push({ status: filtros.status });
    if (filtros.responsavel_id) condicoes.push({ responsavelId: filtros.responsavel_id });
    if (filtros.prioridade) condicoes.push({ prioridade: filtros.prioridade });

    if (filtros.data_limite_inicio)
      condicoes.push({ dataLimite: { gte: filtros.data_limite_inicio } });
    if (filtros.data_limite_fim) condicoes.push({ dataLimite: { lte: filtros.data_limite_fim } });

    if (filtros.pesquisa) {
      condicoes.push({
        OR: [
          { titulo: { contains: filtros.pesquisa, mode: 'insensitive' } },
          { descricao: { contains: filtros.pesquisa, mode: 'insensitive' } },
        ],
      });
    }

    if (filtros.apenas_atrasadas) {
      condicoes.push({ dataLimite: { lt: new Date() }, status: { not: STATUS_TAREFA.CONCLUIDO } });
    }

    if (filtros.apenas_criticas) condicoes.push({ prioridade: { in: ['alta', 'urgente'] } });

    return { tenantId, dataExclusao: null, ...(condicoes.length > 0 ? { AND: condicoes } : {}) };
  }

  private montarOrdenacao(filtros: ListarTarefasDto): Prisma.TarefaOrderByWithRelationInput {
    if (filtros.sort_by === 'responsavel') {
      return { responsavel: { nomeCompleto: filtros.sort_order } };
    }

    const camposPermitidos: Record<string, keyof Prisma.TarefaOrderByWithRelationInput> = {
      data_criacao: 'dataCriacao',
      data_limite: 'dataLimite',
      prioridade: 'prioridade',
      titulo: 'titulo',
      status: 'status',
    };

    const campo = camposPermitidos[filtros.sort_by] ?? 'dataCriacao';
    return { [campo]: filtros.sort_order };
  }

  private garantirPodeEditar(tarefa: Tarefa, executor: UsuarioAutenticado): void {
    if (executor.perfil !== Perfil.colaborador) return;
    if (tarefa.criadorId === executor.id || tarefa.responsavelId === executor.id) return;

    throw ErroAplicacao.proibido(
      'Colaboradores podem editar apenas tarefas próprias ou atribuídas a si',
    );
  }

  private garantirPodeAlterarStatus(tarefa: Tarefa, executor: UsuarioAutenticado): void {
    if (executor.perfil !== Perfil.colaborador) return;
    if (tarefa.criadorId === executor.id || tarefa.responsavelId === executor.id) return;

    throw ErroAplicacao.proibido(
      'Apenas o responsável ou o criador da tarefa podem alterar seu status',
    );
  }

  private async garantirResponsavelValido(responsavelId: string, tenantId: string): Promise<void> {
    const responsavel = await this.prisma.usuario.findFirst({
      where: { id: responsavelId, tenantId, status: StatusRegistro.ativo },
    });

    if (!responsavel) {
      const existeEmOutroTenant = await this.prisma.usuario.findUnique({
        where: { id: responsavelId },
        select: { tenantId: true },
      });

      if (existeEmOutroTenant && existeEmOutroTenant.tenantId !== tenantId) {
        throw ErroAplicacao.proibido(ACESSO_NEGADO.RESPONSAVEL);
      }

      throw ErroAplicacao.entradaInvalida('Validação de entrada falhou', [
        {
          field: 'responsavel_id',
          reason: 'O responsável deve ser um usuário ativo da organização',
        },
      ]);
    }
  }

  private async obterDoTenant(tarefaId: string, tenantId: string): Promise<TarefaComResponsavel> {
    // A busca ignora o tenant para poder responder 403 com a mensagem do ASSET 23832
    // quando a tarefa existe mas é de outra organização, e 404 quando não existe.
    const tarefa = await this.prisma.tarefa.findFirst({
      where: { id: tarefaId, dataExclusao: null },
      include: INCLUIR_RESPONSAVEL,
    });

    return garantirMesmoTenant(tarefa, tenantId, ACESSO_NEGADO.TAREFA, 'Tarefa não encontrada');
  }

  private paraResposta(tarefa: TarefaComResponsavel): object {
    return {
      id: tarefa.id,
      tenant_id: tarefa.tenantId,
      titulo: tarefa.titulo,
      descricao: tarefa.descricao,
      responsavel_id: tarefa.responsavelId,
      responsavel_nome: tarefa.responsavel.nomeCompleto,
      criador_id: tarefa.criadorId,
      prioridade: tarefa.prioridade,
      status: tarefa.status,
      data_limite: tarefa.dataLimite,
      data_criacao: tarefa.dataCriacao,
      data_ultima_edicao: tarefa.dataUltimaEdicao,
      data_conclusao: tarefa.dataConclusao,
      destaque_critico: ehCritica(tarefa.prioridade),
      destaque_atrasado: ehAtrasada(tarefa.dataLimite, tarefa.status),
    };
  }
}
