import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Permissao, UsuarioAtual } from '../auth/decorators';
import { UsuarioAutenticado } from '../auth/tipos';
import { uuidSchema } from '../common/validacao/esquemas-comuns';
import { PipeZod } from '../common/validacao/pipe-zod';
import { ACAO, RECURSO } from '../rbac/politicas';
import {
  AtualizarNivelDto,
  CriarNivelDto,
  atualizarNivelSchema,
  criarNivelSchema,
} from './niveis.dto';
import { NiveisService } from './niveis.service';

@Controller('api/hierarchical-levels')
export class NiveisController {
  constructor(private readonly niveis: NiveisService) {}

  @Post()
  @Permissao(RECURSO.NIVEL_HIERARQUICO, ACAO.CRIAR)
  async criar(
    @Body(new PipeZod(criarNivelSchema)) dados: CriarNivelDto,
    @UsuarioAtual() executor: UsuarioAutenticado,
  ) {
    return this.niveis.criar(dados, executor);
  }

  @Get()
  @Permissao(RECURSO.NIVEL_HIERARQUICO, ACAO.LER)
  async listar(
    @UsuarioAtual() executor: UsuarioAutenticado,
    @Query('tenant_id') tenantId?: string,
  ) {
    return this.niveis.listar(executor, tenantId);
  }

  @Put(':level_id')
  @Permissao(RECURSO.NIVEL_HIERARQUICO, ACAO.EDITAR)
  async atualizar(
    @Param('level_id', new PipeZod(uuidSchema)) nivelId: string,
    @Body(new PipeZod(atualizarNivelSchema)) dados: AtualizarNivelDto,
    @UsuarioAtual() executor: UsuarioAutenticado,
  ) {
    return this.niveis.atualizar(nivelId, dados, executor);
  }

  @Delete(':level_id')
  @Permissao(RECURSO.NIVEL_HIERARQUICO, ACAO.EXCLUIR)
  async excluir(
    @Param('level_id', new PipeZod(uuidSchema)) nivelId: string,
    @UsuarioAtual() executor: UsuarioAutenticado,
  ) {
    return this.niveis.excluir(nivelId, executor);
  }
}
