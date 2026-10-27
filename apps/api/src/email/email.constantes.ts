export const FILA_EMAIL = 'email_send_queue';
export const FILA_EMAIL_DLQ = 'email_send_dlq';

export const PARAMETROS_ENVIO_EMAIL = {
  maxTentativas: 3,
  backoffInicialMs: 1000,
  backoffMaximoMs: 30000,
  backoffMultiplicador: 2.0,
  jitterProporcao: 0.1,
  circuitoLimiteFalhas: 5,
  circuitoJanelaFalhasSegundos: 60,
  circuitoMeioAbertoSegundos: 60,
  circuitoSucessosMeioAberto: 2,
  requisicoesPorMinuto: 100,
  timeoutRequisicaoSegundos: 10,
  timeoutTotalSegundos: 45,
  visibilidadeMensagemSegundos: 300,
  concorrenciaMaxima: 10,
} as const;

export type TipoMensagemEmail = 'recuperacao_senha' | 'boas_vindas';

export type MensagemRecuperacaoSenha = {
  tipo: TipoMensagemEmail;
  destinatario: string;
  nomeCompleto: string;
  token: string;
  expiraEmMinutos: number;
};
