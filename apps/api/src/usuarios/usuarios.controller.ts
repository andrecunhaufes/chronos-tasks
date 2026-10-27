import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { EnderecoIp, Permissao, UsuarioAtual } from '../auth/decorators';
import { UsuarioAutenticado } from '../auth/tipos';
import { uuidSchema } from '../common/validacao/esquemas-comuns';
import { PipeZod } from '../common/validacao/pipe-zod';
import { ACAO, RECURSO } from '../rbac/politicas';
import {
  AtualizarUsuarioDto,
  CriarUsuarioDto,
  ListarUsuariosDto,
  atualizarUsuarioSchema,
  criarUsuarioSchema,
  listarUsuariosSchema,
} from './usuarios.dto';
import { UsuariosService } from './usuarios.service';

@Controller('api/users')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Post()
  @Permissao(RECURSO.USUARIO, ACAO.CRIAR)
  async criar(
    @Body(new PipeZod(criarUsuarioSchema)) dados: CriarUsuarioDto,
    @UsuarioAtual() executor: UsuarioAutenticado,
    @EnderecoIp() enderecoIp: string,
  ) {
    return this.usuarios.criar(dados, executor, enderecoIp);
  }

  @Get()
  @Permissao(RECURSO.USUARIO, ACAO.LER)
  async listar(
    @Query(new PipeZod(listarUsuariosSchema)) filtros: ListarUsuariosDto,
    @UsuarioAtual() executor: UsuarioAutenticado,
  ) {
    return this.usuarios.listar(filtros, executor);
  }

  @Get(':user_id')
  @Permissao(RECURSO.USUARIO, ACAO.LER)
  async obterPorId(
    @Param('user_id', new PipeZod(uuidSchema)) usuarioId: string,
    @UsuarioAtual() executor: UsuarioAutenticado,
  ) {
    return this.usuarios.obterPorId(usuarioId, executor);
  }

  @Put(':user_id')
  @Permissao(RECURSO.USUARIO, ACAO.EDITAR)
  async atualizar(
    @Param('user_id', new PipeZod(uuidSchema)) usuarioId: string,
    @Body(new PipeZod(atualizarUsuarioSchema)) dados: AtualizarUsuarioDto,
    @UsuarioAtual() executor: UsuarioAutenticado,
    @EnderecoIp() enderecoIp: string,
  ) {
    return this.usuarios.atualizar(usuarioId, dados, executor, enderecoIp);
  }

  @Patch(':user_id/activate')
  @HttpCode(200)
  @Permissao(RECURSO.USUARIO, ACAO.ATIVAR)
  async ativar(
    @Param('user_id', new PipeZod(uuidSchema)) usuarioId: string,
    @UsuarioAtual() executor: UsuarioAutenticado,
    @EnderecoIp() enderecoIp: string,
  ) {
    return this.usuarios.ativar(usuarioId, executor, enderecoIp);
  }

  @Patch(':user_id/deactivate')
  @HttpCode(200)
  @Permissao(RECURSO.USUARIO, ACAO.DESATIVAR)
  async desativar(
    @Param('user_id', new PipeZod(uuidSchema)) usuarioId: string,
    @UsuarioAtual() executor: UsuarioAutenticado,
    @EnderecoIp() enderecoIp: string,
  ) {
    return this.usuarios.desativar(usuarioId, executor, enderecoIp);
  }
}
