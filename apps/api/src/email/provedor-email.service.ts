import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { CircuitoProvedorEmail } from './circuito';
import { MensagemRecuperacaoSenha, PARAMETROS_ENVIO_EMAIL } from './email.constantes';

export class ProvedorIndisponivelError extends Error {
  constructor() {
    super('Circuito aberto: provedor de e-mail temporariamente indisponível');
    this.name = 'ProvedorIndisponivelError';
  }
}

@Injectable()
export class ProvedorEmailService {
  private readonly logger = new Logger(ProvedorEmailService.name);
  private readonly circuito = new CircuitoProvedorEmail();
  private readonly http: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    this.http = axios.create({
      baseURL: 'https://api.resend.com',
      timeout: PARAMETROS_ENVIO_EMAIL.timeoutRequisicaoSegundos * 1000,
      headers: {
        Authorization: `Bearer ${this.config.getOrThrow<string>('EMAIL_API_KEY')}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async enviarRecuperacaoSenha(mensagem: MensagemRecuperacaoSenha): Promise<{ messageId: string }> {
    if (!this.circuito.permiteChamada()) throw new ProvedorIndisponivelError();

    const ehBoasVindas = mensagem.tipo === 'boas_vindas';
    const linkRecuperacao = `${this.config.getOrThrow<string>('APP_URL_BASE')}/redefinir-senha?token=${mensagem.token}`;

    try {
      const resposta = await this.http.post<{ id: string }>('/emails', {
        from: this.config.getOrThrow<string>('EMAIL_REMETENTE'),
        to: [mensagem.destinatario],
        subject: ehBoasVindas
          ? 'Bem-vindo ao Chronos Tasks — defina sua senha'
          : 'Redefinição de senha — Chronos Tasks',
        html: ehBoasVindas
          ? this.montarCorpoBoasVindas(
              mensagem.nomeCompleto,
              linkRecuperacao,
              mensagem.expiraEmMinutos,
            )
          : this.montarCorpo(mensagem.nomeCompleto, linkRecuperacao, mensagem.expiraEmMinutos),
      });

      this.circuito.registrarSucesso();
      return { messageId: resposta.data.id };
    } catch (erro) {
      this.circuito.registrarFalha();
      this.logger.warn({ estado_circuito: this.circuito.estadoAtual() }, 'Falha ao enviar e-mail');
      throw erro;
    }
  }

  async verificarDisponibilidade(): Promise<boolean> {
    return this.circuito.permiteChamada();
  }

  private montarCorpo(nomeCompleto: string, link: string, expiraEmMinutos: number): string {
    return [
      `<p>Olá, ${nomeCompleto}.</p>`,
      '<p>Recebemos uma solicitação para redefinir a senha da sua conta no Chronos Tasks.</p>',
      `<p><a href="${link}">Clique aqui para definir uma nova senha</a></p>`,
      `<p>Este link expira em ${expiraEmMinutos} minutos e só pode ser usado uma vez.</p>`,
      '<p>Se você não solicitou a redefinição, ignore esta mensagem.</p>',
    ].join('');
  }

  private montarCorpoBoasVindas(
    nomeCompleto: string,
    link: string,
    expiraEmMinutos: number,
  ): string {
    return [
      `<p>Olá, ${nomeCompleto}.</p>`,
      '<p>Sua conta no Chronos Tasks foi criada pelo administrador da sua organização.</p>',
      `<p><a href="${link}">Clique aqui para definir sua senha de acesso</a></p>`,
      `<p>Este link expira em ${expiraEmMinutos} minutos e só pode ser usado uma vez.</p>`,
    ].join('');
  }
}
