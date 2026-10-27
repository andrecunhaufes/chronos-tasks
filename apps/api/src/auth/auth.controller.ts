import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { PipeZod } from '../common/validacao/pipe-zod';
import { AuthService } from './auth.service';
import {
  AlterarSenhaDto,
  LoginDto,
  RedefinirSenhaDto,
  RefreshDto,
  SolicitarRecuperacaoDto,
  alterarSenhaSchema,
  loginSchema,
  redefinirSenhaSchema,
  refreshSchema,
  solicitarRecuperacaoSchema,
} from './auth.dto';
import { EnderecoIp, RotaPublica, UsuarioAtual } from './decorators';
import { UsuarioAutenticado } from './tipos';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @RotaPublica()
  async autenticar(
    @Body(new PipeZod(loginSchema)) dados: LoginDto,
    @EnderecoIp() enderecoIp: string,
  ) {
    return this.auth.autenticar(dados, enderecoIp);
  }

  @Post('logout')
  @HttpCode(200)
  async encerrarSessao(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.auth.encerrarSessao(usuario);
  }

  @Post('refresh')
  @HttpCode(200)
  @RotaPublica()
  async renovar(@Body(new PipeZod(refreshSchema)) dados: RefreshDto) {
    return this.auth.renovar(dados.refresh_token);
  }

  @Post('password-recovery')
  @HttpCode(200)
  @RotaPublica()
  async solicitarRecuperacao(
    @Body(new PipeZod(solicitarRecuperacaoSchema)) dados: SolicitarRecuperacaoDto,
    @EnderecoIp() enderecoIp: string,
  ) {
    return this.auth.solicitarRecuperacao(dados, enderecoIp);
  }

  @Post('password-recovery/reset')
  @HttpCode(200)
  @RotaPublica()
  async redefinirSenha(@Body(new PipeZod(redefinirSenhaSchema)) dados: RedefinirSenhaDto) {
    return this.auth.redefinirSenha(dados);
  }

  @Post('change-password')
  @HttpCode(200)
  async alterarSenha(
    @Body(new PipeZod(alterarSenhaSchema)) dados: AlterarSenhaDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @EnderecoIp() enderecoIp: string,
  ) {
    return this.auth.alterarSenha(dados, usuario, enderecoIp);
  }

  @Get('me')
  async obterUsuarioAtual(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.auth.obterUsuarioAtual(usuario);
  }
}
