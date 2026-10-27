import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { EnderecoIp, Permissao, UsuarioAtual } from '../auth/decorators';
import { UsuarioAutenticado } from '../auth/tipos';
import { uuidSchema } from '../common/validacao/esquemas-comuns';
import { PipeZod } from '../common/validacao/pipe-zod';
import { ACAO, RECURSO } from '../rbac/politicas';
import {
  AlterarStatusDto,
  AtualizarTarefaDto,
  CriarTarefaDto,
  KanbanDto,
  ListarTarefasDto,
  alterarStatusSchema,
  atualizarTarefaSchema,
  criarTarefaSchema,
  kanbanSchema,
  listarTarefasSchema,
} from './tarefas.dto';
import { ColunasService } from './colunas.service';
import { TarefasService } from './tarefas.service';

@Controller('api/tasks')
export class TarefasController {
  constructor(
    private readonly tarefas: TarefasService,
    private readonly colunas: ColunasService,
  ) {}

  @Post()
  @Permissao(RECURSO.TAREFA, ACAO.CRIAR)
  async criar(
    @Body(new PipeZod(criarTarefaSchema)) dados: CriarTarefaDto,
    @UsuarioAtual() executor: UsuarioAutenticado,
    @EnderecoIp() enderecoIp: string,
  ) {
    return this.tarefas.criar(dados, executor, enderecoIp);
  }

  @Get()
  @Permissao(RECURSO.TAREFA, ACAO.LER)
  async listar(
    @Query(new PipeZod(listarTarefasSchema)) filtros: ListarTarefasDto,
    @UsuarioAtual() executor: UsuarioAutenticado,
  ) {
    return this.tarefas.listar(filtros, executor);
  }

  @Get('kanban/columns')
  @Permissao(RECURSO.TAREFA, ACAO.LER)
  async listarColunas(@UsuarioAtual() executor: UsuarioAutenticado) {
    const colunas = await this.colunas.listar(executor.tenantId);
    return colunas.map((coluna) => ({
      chave: coluna.chave,
      rotulo: coluna.rotulo,
      ordem: coluna.ordem,
      eh_conclusivo: coluna.ehConclusivo,
    }));
  }

  @Get('kanban/board')
  @Permissao(RECURSO.TAREFA, ACAO.LER)
  async obterQuadroKanban(
    @Query(new PipeZod(kanbanSchema)) filtros: KanbanDto,
    @UsuarioAtual() executor: UsuarioAutenticado,
  ) {
    return this.tarefas.obterQuadroKanban(filtros, executor);
  }

  @Get(':task_id')
  @Permissao(RECURSO.TAREFA, ACAO.LER)
  async obterPorId(
    @Param('task_id', new PipeZod(uuidSchema)) tarefaId: string,
    @UsuarioAtual() executor: UsuarioAutenticado,
  ) {
    return this.tarefas.obterPorId(tarefaId, executor);
  }

  @Put(':task_id')
  @Permissao(RECURSO.TAREFA, ACAO.EDITAR)
  async atualizar(
    @Param('task_id', new PipeZod(uuidSchema)) tarefaId: string,
    @Body(new PipeZod(atualizarTarefaSchema)) dados: AtualizarTarefaDto,
    @UsuarioAtual() executor: UsuarioAutenticado,
    @EnderecoIp() enderecoIp: string,
  ) {
    return this.tarefas.atualizar(tarefaId, dados, executor, enderecoIp);
  }

  @Patch(':task_id/status')
  @HttpCode(200)
  @Permissao(RECURSO.TAREFA, ACAO.ALTERAR_STATUS)
  async alterarStatus(
    @Param('task_id', new PipeZod(uuidSchema)) tarefaId: string,
    @Body(new PipeZod(alterarStatusSchema)) dados: AlterarStatusDto,
    @UsuarioAtual() executor: UsuarioAutenticado,
    @EnderecoIp() enderecoIp: string,
  ) {
    return this.tarefas.alterarStatus(tarefaId, dados, executor, enderecoIp);
  }

  @Patch(':task_id/complete')
  @HttpCode(200)
  @Permissao(RECURSO.TAREFA, ACAO.CONCLUIR)
  async concluir(
    @Param('task_id', new PipeZod(uuidSchema)) tarefaId: string,
    @UsuarioAtual() executor: UsuarioAutenticado,
    @EnderecoIp() enderecoIp: string,
  ) {
    return this.tarefas.concluir(tarefaId, executor, enderecoIp);
  }

  @Post(':task_id/reopen')
  @HttpCode(200)
  @Permissao(RECURSO.TAREFA, ACAO.ALTERAR_STATUS)
  async reabrir(
    @Param('task_id', new PipeZod(uuidSchema)) tarefaId: string,
    @UsuarioAtual() executor: UsuarioAutenticado,
    @EnderecoIp() enderecoIp: string,
  ) {
    return this.tarefas.reabrir(tarefaId, executor, enderecoIp);
  }

  @Delete(':task_id')
  @Permissao(RECURSO.TAREFA, ACAO.EXCLUIR)
  async excluir(
    @Param('task_id', new PipeZod(uuidSchema)) tarefaId: string,
    @UsuarioAtual() executor: UsuarioAutenticado,
    @EnderecoIp() enderecoIp: string,
  ) {
    return this.tarefas.excluir(tarefaId, executor, enderecoIp);
  }
}
