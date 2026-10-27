import { z } from 'zod';

const esquemaAmbiente = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  EMAIL_API_KEY: z.string().min(1),
  EMAIL_REMETENTE: z.string().email(),
  APP_URL_BASE: z.string().url(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default('http://localhost:4317'),
  SENTRY_DSN: z.string().optional(),
});

export type Ambiente = z.infer<typeof esquemaAmbiente>;

export function validarAmbiente(bruto: Record<string, unknown>): Ambiente {
  const resultado = esquemaAmbiente.safeParse(bruto);
  if (!resultado.success) {
    throw new Error(
      `Ambiente inválido: ${resultado.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`,
    );
  }
  return resultado.data;
}

export const PARAMETROS_SEGURANCA = {
  senhaHashAlgoritmo: 'argon2id',
  senhaHashMemoriaMib: 64,
  senhaHashCustoTempo: 3,
  senhaHashParalelismo: 4,
  senhaTamanhoMinimo: 8,
  accessTokenTtlSegundos: 3600,
  refreshTokenTtlDias: 7,
  recuperacaoSenhaTokenTtlMinutos: 30,
  loginRateLimitMaxTentativas: 5,
  loginRateLimitJanelaMinutos: 15,
  recuperacaoSenhaRateLimitPorHora: 3,
  jwtAlgoritmo: 'RS256',
  jwtEmissor: 'plataforma-tarefas',
  jwtAudiencia: 'plataforma-tarefas-api',
} as const;
