import * as Sentry from '@sentry/node';

// Rastreamento de erros em produção exigido pelo requisito de rastreabilidade
// de ações (stack_id 1038). Sem DSN configurado o SDK fica inerte.
export function iniciarSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
    // Dados pessoais não vão para o rastreador (ASSET 23909, minimização).
    sendDefaultPii: false,
    beforeSend(evento) {
      if (evento.request?.headers) delete evento.request.headers.authorization;
      if (evento.request?.data) delete evento.request.data;
      return evento;
    },
  });
}

export function registrarErro(erro: unknown, contexto: Record<string, unknown>): void {
  if (!process.env.SENTRY_DSN) return;
  Sentry.captureException(erro, { extra: contexto });
}
