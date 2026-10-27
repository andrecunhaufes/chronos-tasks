import { Injectable } from '@nestjs/common';
import { StatusRegistro, Usuario } from '@prisma/client';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EVENTO_AUDITORIA } from '../auditoria/eventos-auditoria';
import { ErroAplicacao } from '../common/erros/erro-aplicacao';
import { PARAMETROS_SEGURANCA } from '../config/configuracao';
import { SenhaService } from '../cripto/senha.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { AlterarSenhaDto, LoginDto, RedefinirSenhaDto, SolicitarRecuperacaoDto } from './auth.dto';
import { LimiteTentativasService } from './limite-tentativas.service';
import { TokenService } from './token.service';
import { ParDeTokens, UsuarioAutenticado } from './tipos';

const MENSAGEM_RECUPERACAO_GENERICA =
  'Se o e-mail informado estiver cadastrado, você receberá as instruções de redefinição em instantes.';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly senhas: SenhaService,
    private readonly tokens: TokenService,
    private readonly limites: LimiteTentativasService,
    private readonly auditoria: AuditoriaService,
    private readonly email: EmailService,
  ) {}

  async autenticar(
    dados: LoginDto,
    enderecoIp: string,
  ): Promise<ParDeTokens & { user: object; tenant: object }> {
    await this.limites.garantirLimiteLogin(dados.email, enderecoIp);

    // O e-mail é único por tenant (pendência 37 da feature 23581), então o mesmo endereço pode
    // existir em organizações diferentes. O tenant é identificado pela senha que confere.
    const candidatos = await this.prisma.usuario.findMany({
      where: { email: dados.email },
      include: { tenant: true },
      orderBy: { dataCriacao: 'asc' },
    });

    if (candidatos.length === 0) {
      await this.registrarFalha(dados.email, enderecoIp, 'invalid_credentials', null, null);
      throw ErroAplicacao.credenciaisInvalidas();
    }

    let usuario: (typeof candidatos)[number] | null = null;
    for (const candidato of candidatos) {
      if (await this.senhas.conferir(candidato.senhaHash, dados.password)) {
        usuario = candidato;
        break;
      }
    }

    if (!usuario) {
      const referencia = candidatos[0];
      await this.registrarFalha(
        dados.email,
        enderecoIp,
        'invalid_credentials',
        referencia.id,
        referencia.tenantId,
      );
      throw ErroAplicacao.credenciaisInvalidas();
    }

    if (usuario.status === StatusRegistro.inativo) {
      await this.registrarFalha(
        dados.email,
        enderecoIp,
        'user_inactive',
        usuario.id,
        usuario.tenantId,
      );
      throw ErroAplicacao.credenciaisInvalidas();
    }

    if (usuario.tenant.status === StatusRegistro.inativo) {
      await this.registrarFalha(
        dados.email,
        enderecoIp,
        'tenant_inactive',
        usuario.id,
        usuario.tenantId,
      );
      throw ErroAplicacao.credenciaisInvalidas();
    }

    await this.limites.limparFalhasLogin(dados.email, enderecoIp);
    const par = await this.tokens.emitirPar(usuario);

    await this.auditoria.registrar({
      evento: EVENTO_AUDITORIA.AUTENTICACAO_SUCESSO,
      recursoTipo: 'sessao',
      recursoId: usuario.id,
      tenantId: usuario.tenantId,
      executorId: usuario.id,
      resultado: 'sucesso',
      enderecoIp,
    });

    return {
      ...par,
      user: {
        id: usuario.id,
        email: usuario.email,
        tenant_id: usuario.tenantId,
        nivel_hierarquico_id: usuario.nivelHierarquicoId,
        perfil: usuario.perfil,
        status: usuario.status,
      },
      tenant: {
        id: usuario.tenant.id,
        slug: usuario.tenant.slug,
        status: usuario.tenant.status,
      },
    };
  }

  async renovar(refreshToken: string): Promise<ParDeTokens> {
    const payload = await this.tokens.verificarRenovacao(refreshToken);

    if (
      await this.tokens.estaRevogado(
        payload.jti,
        payload.sub,
        payload.tenant_id,
        payload.emitido_ms,
      )
    ) {
      throw ErroAplicacao.naoAutorizado();
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      include: { tenant: true },
    });

    if (!usuario) throw ErroAplicacao.naoAutorizado();
    if (usuario.status === StatusRegistro.inativo) throw ErroAplicacao.usuarioInativo();
    if (usuario.tenant.status === StatusRegistro.inativo) throw ErroAplicacao.tenantInativo();

    await this.tokens.revogar(payload.jti);
    return this.tokens.emitirPar(usuario);
  }

  async encerrarSessao(usuario: UsuarioAutenticado): Promise<{ mensagem: string }> {
    await this.tokens.revogar(usuario.jti);

    await this.auditoria.registrar({
      evento: EVENTO_AUDITORIA.SESSAO_REVOGADA,
      recursoTipo: 'sessao',
      recursoId: usuario.id,
      tenantId: usuario.tenantId,
      executorId: usuario.id,
      resultado: 'sucesso',
      motivo: 'logout',
    });

    return { mensagem: 'Sessão encerrada com sucesso.' };
  }

  async solicitarRecuperacao(
    dados: SolicitarRecuperacaoDto,
    enderecoIp: string,
  ): Promise<{ mensagem: string }> {
    await this.limites.garantirLimiteRecuperacaoSenha(dados.email);

    const usuario = await this.prisma.usuario.findFirst({
      where: { email: dados.email },
      include: { tenant: true },
    });

    if (
      usuario &&
      usuario.status === StatusRegistro.ativo &&
      usuario.tenant.status === StatusRegistro.ativo
    ) {
      await this.emitirTokenRecuperacao(usuario, enderecoIp);
    }

    return { mensagem: MENSAGEM_RECUPERACAO_GENERICA };
  }

  async redefinirSenha(dados: RedefinirSenhaDto): Promise<{ mensagem: string }> {
    const tokenHash = this.senhas.hashToken(dados.token);

    const registro = await this.prisma.tokenRecuperacaoSenha.findUnique({
      where: { tokenHash },
      include: { usuario: { include: { tenant: true } } },
    });

    if (!registro || registro.dataUso !== null || registro.dataExpiracao.getTime() < Date.now()) {
      throw ErroAplicacao.entradaInvalida('Token de recuperação inválido ou expirado');
    }

    if (registro.usuario.status === StatusRegistro.inativo) throw ErroAplicacao.usuarioInativo();
    if (registro.usuario.tenant.status === StatusRegistro.inativo)
      throw ErroAplicacao.tenantInativo();

    const novoHash = await this.senhas.gerarHash(dados.nova_senha);

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: registro.usuarioId },
        data: { senhaHash: novoHash },
      }),
      this.prisma.tokenRecuperacaoSenha.update({
        where: { id: registro.id },
        data: { dataUso: new Date() },
      }),
    ]);

    await this.tokens.revogarSessoesDoUsuario(registro.usuarioId);

    await this.auditoria.registrar({
      evento: EVENTO_AUDITORIA.REDEFINICAO_SENHA_CONCLUIDA,
      recursoTipo: 'usuario',
      recursoId: registro.usuarioId,
      tenantId: registro.usuario.tenantId,
      executorId: registro.usuarioId,
      resultado: 'sucesso',
    });

    return { mensagem: 'Senha redefinida com sucesso. Faça login com a nova credencial.' };
  }

  // Alteração de senha pelo próprio usuário, exigida pelo ASSET 23837: a senha atual
  // precisa conferir e todas as sessões caem ao final, como na redefinição por token.
  async alterarSenha(
    dados: AlterarSenhaDto,
    executor: UsuarioAutenticado,
    enderecoIp: string,
  ): Promise<{ mensagem: string }> {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({ where: { id: executor.id } });

    if (!(await this.senhas.conferir(usuario.senhaHash, dados.senha_atual))) {
      await this.auditoria.registrar({
        evento: EVENTO_AUDITORIA.AUTENTICACAO_FALHA,
        recursoTipo: 'usuario',
        recursoId: executor.id,
        tenantId: executor.tenantId,
        executorId: executor.id,
        resultado: 'negado',
        motivo: 'senha_atual_incorreta',
        enderecoIp,
      });

      throw ErroAplicacao.entradaInvalida('Validação de entrada falhou', [
        { field: 'senha_atual', reason: 'A senha atual não confere' },
      ]);
    }

    await this.prisma.usuario.update({
      where: { id: executor.id },
      data: { senhaHash: await this.senhas.gerarHash(dados.nova_senha) },
    });

    await this.tokens.revogarSessoesDoUsuario(executor.id);

    await this.auditoria.registrar({
      evento: EVENTO_AUDITORIA.REDEFINICAO_SENHA_CONCLUIDA,
      recursoTipo: 'usuario',
      recursoId: executor.id,
      tenantId: executor.tenantId,
      executorId: executor.id,
      resultado: 'sucesso',
      motivo: 'alteracao_pelo_proprio_usuario',
      enderecoIp,
    });

    return { mensagem: 'Senha alterada com sucesso. Faça login com a nova credencial.' };
  }

  async obterUsuarioAtual(usuario: UsuarioAutenticado): Promise<object> {
    const registro = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: usuario.id },
      include: { tenant: true, nivelHierarquico: true },
    });

    return {
      id: registro.id,
      nome_completo: registro.nomeCompleto,
      email: registro.email,
      perfil: registro.perfil,
      status: registro.status,
      nivel_hierarquico: {
        id: registro.nivelHierarquico.id,
        nome: registro.nivelHierarquico.nome,
        profundidade: registro.nivelHierarquico.profundidade,
      },
      tenant: {
        id: registro.tenant.id,
        nome: registro.tenant.nome,
        slug: registro.tenant.slug,
        status: registro.tenant.status,
      },
    };
  }

  private async emitirTokenRecuperacao(usuario: Usuario, enderecoIp: string): Promise<void> {
    const token = this.senhas.gerarTokenAleatorio();
    const expiraEm = new Date(
      Date.now() + PARAMETROS_SEGURANCA.recuperacaoSenhaTokenTtlMinutos * 60 * 1000,
    );

    await this.prisma.$transaction([
      this.prisma.tokenRecuperacaoSenha.updateMany({
        where: { usuarioId: usuario.id, dataUso: null },
        data: { dataUso: new Date() },
      }),
      this.prisma.tokenRecuperacaoSenha.create({
        data: {
          usuarioId: usuario.id,
          tokenHash: this.senhas.hashToken(token),
          dataExpiracao: expiraEm,
        },
      }),
    ]);

    await this.email.enfileirarRecuperacaoSenha({
      destinatario: usuario.email,
      nomeCompleto: usuario.nomeCompleto,
      token,
      expiraEmMinutos: PARAMETROS_SEGURANCA.recuperacaoSenhaTokenTtlMinutos,
    });

    await this.auditoria.registrar({
      evento: EVENTO_AUDITORIA.RECUPERACAO_SENHA_SOLICITADA,
      recursoTipo: 'usuario',
      recursoId: usuario.id,
      tenantId: usuario.tenantId,
      executorId: usuario.id,
      resultado: 'sucesso',
      enderecoIp,
    });
  }

  private async registrarFalha(
    email: string,
    enderecoIp: string,
    motivo: string,
    usuarioId: string | null,
    tenantId: string | null,
  ): Promise<void> {
    await this.limites.registrarFalhaLogin(email, enderecoIp);

    await this.auditoria.registrar({
      evento: EVENTO_AUDITORIA.AUTENTICACAO_FALHA,
      recursoTipo: 'sessao',
      recursoId: usuarioId,
      tenantId,
      executorId: usuarioId,
      resultado: 'negado',
      motivo,
      enderecoIp,
    });
  }
}
